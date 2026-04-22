import { PDFParse } from "pdf-parse";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseTransactionsFromText } from "@/server/pdf/parse";

export const runtime = "nodejs";

function ensurePdfWorkerConfigured() {
  const anyGlobal = globalThis as typeof globalThis & { __pdfWorkerConfigured?: boolean };
  if (anyGlobal.__pdfWorkerConfigured) return;

  const workerPath = path.join(
    process.cwd(),
    "node_modules",
    "pdfjs-dist",
    "legacy",
    "build",
    "pdf.worker.mjs",
  );

  if (existsSync(workerPath)) {
    PDFParse.setWorker(pathToFileURL(workerPath).href);
  }

  anyGlobal.__pdfWorkerConfigured = true;
}

function parseDate(value: string) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function parseBRLNumber(value: string) {
  const raw = value
    .replace(/\s/g, "")
    .replace(/^R\$/, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n;
}

function extractPeriod(text: string) {
  const m = /Periodo:\s*(\d{2}\/\d{2}\/\d{4})\s*a\s*(\d{2}\/\d{2}\/\d{4})/i.exec(text);
  if (!m) return null;
  const start = parseDate(m[1]);
  const end = parseDate(m[2]);
  if (!start || !end) return null;
  return { start, end };
}

function extractDailyBalances(text: string) {
  const lines = text
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter(Boolean);

  const out: { day: string; date: Date; balance: number }[] = [];
  for (const line of lines) {
    const m = /^Saldo do dia\s+(\d{2}\/\d{2}\/\d{4})\s+R\$\s*([0-9\.\,]+)/i.exec(line);
    if (!m) continue;
    const date = parseDate(m[1]);
    const balance = parseBRLNumber(m[2]);
    if (!date || balance === null) continue;
    out.push({ day: date.toISOString().slice(0, 10), date, balance });
  }
  return out;
}

function isPagBankTemplate(input: { nome?: string | null; identificador?: string | null }) {
  const key = `${input.nome ?? ""} ${input.identificador ?? ""}`.toUpperCase();
  return key.includes("PAGBANK") || key.includes("PAGSEGURO") || key.includes("PAG SEGURO");
}

export async function POST(request: Request) {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  const userId = session?.user.id;
  if (!clientId) return Response.json({ ok: false, message: "Não autorizado." }, { status: 401 });

  const formData = await request.formData();
  const entityId = String(formData.get("entityId") ?? "");
  const file = formData.get("file");

  if (!entityId) {
    return Response.json({ ok: false, message: "entityId é obrigatório." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return Response.json({ ok: false, message: "Arquivo inválido." }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return Response.json({ ok: false, message: "Envie um PDF." }, { status: 400 });
  }

  const entity = await prisma.entity.findFirst({
    where: { id: entityId, clientId },
    select: { id: true },
  });

  if (!entity) {
    return Response.json({ ok: false, message: "Entidade não encontrada." }, { status: 404 });
  }

  const templates = await prisma.template.findMany({
    where: { clientId },
    orderBy: { createdAt: "asc" },
  });

  if (!templates.length) {
    return Response.json(
      { ok: false, message: "Nenhum template cadastrado para este cliente." },
      { status: 400 },
    );
  }

  let text = "";
  const statement = await prisma.statement.create({
    data: {
      clientId,
      entityId: entity.id,
      status: "UPLOADED",
      createdByUserId: userId ?? null,
    },
    select: { id: true },
  });

  const run = await prisma.extractionRun.create({
    data: {
      statementId: statement.id,
      method: "TEXT",
      status: "RUNNING",
    },
    select: { id: true },
  });

  try {
    ensurePdfWorkerConfigured();
    const buffer = Buffer.from(await file.arrayBuffer());
    const parser = new PDFParse({
      data: buffer,
      disableWorker: true,
    } as ConstructorParameters<typeof PDFParse>[0] & { disableWorker: boolean });
    const textResult = await parser.getText();
    await parser.destroy();
    text = textResult.text ?? "";
    await prisma.extractionRun.update({
      where: { id: run.id },
      data: { pagesTotal: textResult.pages?.length ?? null },
    });
  } catch (error) {
    await prisma.extractionRun.update({
      where: { id: run.id },
      data: { status: "FAILED", finishedAt: new Date(), errorMessage: String(error) },
    });
    await prisma.statement.update({
      where: { id: statement.id },
      data: { status: "FAILED" },
    });
    await prisma.extractionIssue.create({
      data: {
        statementId: statement.id,
        runId: run.id,
        severity: "HIGH",
        type: "OUTRO",
        payload: { message: "Falha ao ler PDF" },
      },
    });
    return Response.json(
      { ok: false, message: "Falha ao ler o PDF.", statementId: statement.id },
      { status: 500 },
    );
  }

  const period = extractPeriod(text);
  if (period) {
    await prisma.statement.update({
      where: { id: statement.id },
      data: { periodStart: period.start, periodEnd: period.end },
    });
  }

  const template =
    templates.find((t) => {
      try {
        return new RegExp(t.identificador, "i").test(text);
      } catch {
        return text.toLowerCase().includes(t.identificador.toLowerCase());
      }
    }) ?? null;

  if (!template) {
    await prisma.extractionIssue.create({
      data: {
        statementId: statement.id,
        runId: run.id,
        severity: "HIGH",
        type: "TEMPLATE_NAO_ENCONTRADO",
        payload: { message: "Não foi possível identificar banco/template." },
      },
    });
    await prisma.extractionRun.update({
      where: { id: run.id },
      data: { status: "FAILED", finishedAt: new Date() },
    });
    await prisma.statement.update({
      where: { id: statement.id },
      data: { status: "FAILED" },
    });
    return Response.json(
      {
        ok: false,
        message: "Não foi possível identificar o banco pelo template.",
        statementId: statement.id,
      },
      { status: 400 },
    );
  }

  await prisma.statement.update({
    where: { id: statement.id },
    data: { templateId: template.id },
  });

  const isPagBank = isPagBankTemplate(template);

  let transactions;
  try {
    transactions = parseTransactionsFromText({ text, template, entityId: entity.id });
  } catch {
    await prisma.extractionIssue.create({
      data: {
        statementId: statement.id,
        runId: run.id,
        severity: "HIGH",
        type: "PARSE_FALHOU",
        payload: { message: "Falha ao aplicar regex do template." },
      },
    });
    await prisma.extractionRun.update({
      where: { id: run.id },
      data: { status: "FAILED", finishedAt: new Date() },
    });
    await prisma.statement.update({
      where: { id: statement.id },
      data: { status: "FAILED" },
    });
    return Response.json(
      { ok: false, message: "Falha ao aplicar regex do template.", statementId: statement.id },
      { status: 400 },
    );
  }

  if (!transactions.length) {
    await prisma.extractionRun.update({
      where: { id: run.id },
      data: { status: "DONE", finishedAt: new Date() },
    });
    await prisma.statement.update({
      where: { id: statement.id },
      data: { status: "PROCESSED" },
    });
    return Response.json(
      {
        ok: true,
        statementId: statement.id,
        templateId: template.id,
        templateNome: template.nome,
        insertedCount: 0,
        skippedCount: 0,
        transactionsParsed: 0,
        issuesOpen: 0,
      },
      { status: 200 },
    );
  }

  const created = await prisma.transaction.createMany({
    data: transactions.map((t) => ({
      entityId: entity.id,
      statementId: statement.id,
      templateId: template.id,
      data: t.data,
      descricao: t.descricao,
      categoria: t.categoria,
      valor: t.valor,
      tipo: t.tipo,
      dedupeHash: t.dedupeHash,
    })),
    skipDuplicates: true,
  });

  const dailyBalances = isPagBank ? [] : extractDailyBalances(text);
  if (dailyBalances.length) {
    await prisma.statementDailyBalance.createMany({
      data: dailyBalances.map((b) => ({
        statementId: statement.id,
        date: b.date,
        balance: b.balance.toFixed(2),
      })),
      skipDuplicates: true,
    });

    const byDay = new Map<string, number>();
    for (const t of transactions) {
      const day = t.data.toISOString().slice(0, 10);
      const signed = t.tipo === "SAIDA" ? -Number(t.valor) : Number(t.valor);
      byDay.set(day, (byDay.get(day) ?? 0) + signed);
    }

    const sorted = [...dailyBalances].sort((a, b) => a.day.localeCompare(b.day));
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1];
      const cur = sorted[i];
      const delta = cur.balance - prev.balance;
      const sum = byDay.get(cur.day) ?? 0;
      const diff = Math.abs(delta - sum);
      if (diff > 0.01) {
        const dedupeKey = `SALDO_DIVERGENTE|${cur.day}`;
        await prisma.extractionIssue.upsert({
          where: {
            statementId_dedupeKey: {
              statementId: statement.id,
              dedupeKey,
            },
          },
          create: {
            statementId: statement.id,
            runId: run.id,
            severity: "HIGH",
            type: "SALDO_DIVERGENTE",
            dedupeKey,
            payload: {
              day: cur.day,
              saldoAnterior: prev.balance,
              saldoAtual: cur.balance,
              deltaCalculado: delta,
              somaTransacoesDoDia: sum,
              diferenca: diff,
            },
          },
          update: {
            runId: run.id,
            status: "OPEN",
            resolvedAt: null,
            resolvedByUserId: null,
            payload: {
              day: cur.day,
              saldoAnterior: prev.balance,
              saldoAtual: cur.balance,
              deltaCalculado: delta,
              somaTransacoesDoDia: sum,
              diferenca: diff,
            },
          },
        });
      }
    }
  } else if (isPagBank) {
    await prisma.statementDailyBalance.deleteMany({ where: { statementId: statement.id } });
    await prisma.extractionIssue.updateMany({
      where: { statementId: statement.id, type: "SALDO_DIVERGENTE", status: "OPEN" },
      data: { status: "IGNORED" },
    });
  }

  const issuesOpen = await prisma.extractionIssue.count({
    where: { statementId: statement.id, status: "OPEN" },
  });

  await prisma.extractionRun.update({
    where: { id: run.id },
    data: {
      status: "DONE",
      finishedAt: new Date(),
      metrics: {
        transactionsParsed: transactions.length,
        insertedCount: created.count,
        skippedCount: transactions.length - created.count,
        dailyBalances: dailyBalances.length,
      },
    },
  });

  await prisma.statement.update({
    where: { id: statement.id },
    data: { status: issuesOpen > 0 ? "IN_REVIEW" : "PROCESSED" },
  });

  return Response.json(
    {
      ok: true,
      statementId: statement.id,
      templateId: template.id,
      templateNome: template.nome,
      insertedCount: created.count,
      skippedCount: transactions.length - created.count,
      transactionsParsed: transactions.length,
      issuesOpen,
    },
    { status: 200 },
  );
}
