import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function reconcileStatement(input: { statementId: string; clientId: string }) {
  const statement = await prisma.statement.findFirst({
    where: { id: input.statementId, clientId: input.clientId },
    select: {
      id: true,
      status: true,
      dailyBalances: { select: { date: true, balance: true }, orderBy: { date: "asc" } },
      transactions: { select: { data: true, tipo: true, valor: true } },
    },
  });

  if (!statement) return { ok: false as const };

  const balances = statement.dailyBalances.map((b) => ({
    day: b.date.toISOString().slice(0, 10),
    date: b.date,
    balance: Number(b.balance.toString()),
  }));

  const byDay = new Map<string, number>();
  for (const t of statement.transactions) {
    const day = t.data.toISOString().slice(0, 10);
    const signed = t.tipo === "SAIDA" ? -Number(t.valor.toString()) : Number(t.valor.toString());
    byDay.set(day, (byDay.get(day) ?? 0) + signed);
  }

  const issuesToOpen: { dedupeKey: string; payload: Prisma.InputJsonValue }[] = [];
  const issuesToResolve: string[] = [];

  for (let i = 1; i < balances.length; i += 1) {
    const prev = balances[i - 1];
    const cur = balances[i];
    const delta = cur.balance - prev.balance;
    const sum = byDay.get(cur.day) ?? 0;
    const diff = Math.abs(delta - sum);
    const dedupeKey = `SALDO_DIVERGENTE|${cur.day}`;

    if (diff > 0.01) {
      issuesToOpen.push({
        dedupeKey,
        payload: {
          day: cur.day,
          saldoAnterior: prev.balance,
          saldoAtual: cur.balance,
          deltaCalculado: delta,
          somaTransacoesDoDia: sum,
          diferenca: diff,
        },
      });
    } else {
      issuesToResolve.push(dedupeKey);
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const i of issuesToOpen) {
      await tx.extractionIssue.upsert({
        where: { statementId_dedupeKey: { statementId: input.statementId, dedupeKey: i.dedupeKey } },
        create: {
          statementId: input.statementId,
          severity: "HIGH",
          type: "SALDO_DIVERGENTE",
          dedupeKey: i.dedupeKey,
          payload: i.payload,
        },
        update: (await tx.extractionIssue.findFirst({
          where: { statementId: input.statementId, dedupeKey: i.dedupeKey },
          select: { status: true },
        }))?.status === "IGNORED"
          ? { payload: i.payload }
          : { status: "OPEN", resolvedAt: null, resolvedByUserId: null, payload: i.payload },
      });
    }

    for (const key of issuesToResolve) {
      const existing = await tx.extractionIssue.findFirst({
        where: { statementId: input.statementId, dedupeKey: key },
        select: { id: true, status: true },
      });
      if (!existing) continue;
      if (existing.status !== "OPEN") continue;
      await tx.extractionIssue.update({
        where: { id: existing.id },
        data: { status: "RESOLVED", resolvedAt: new Date(), resolvedByUserId: null },
      });
    }

    const issuesOpen = await tx.extractionIssue.count({
      where: { statementId: input.statementId, status: "OPEN" },
    });

    const nextStatus = issuesOpen > 0 ? "IN_REVIEW" : "PROCESSED";
    const shouldOverride =
      statement.status === "APPROVED" || statement.status === "EXPORTED" ? issuesOpen > 0 : true;

    if (shouldOverride) {
      await tx.statement.update({ where: { id: input.statementId }, data: { status: nextStatus } });
    }
  });

  const issuesOpen = await prisma.extractionIssue.count({
    where: { statementId: input.statementId, status: "OPEN" },
  });

  const status = await prisma.statement.findFirst({
    where: { id: input.statementId, clientId: input.clientId },
    select: { status: true },
  });

  return { ok: true as const, issuesOpen, status: status?.status ?? null };
}
