import "dotenv/config";

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { PDFParse } from "pdf-parse";

import { prisma } from "@/lib/prisma";
import { parseTransactionsFromText } from "@/server/pdf/parse";

function ensurePdfWorkerConfigured() {
  const workerPath = path.join(
    process.cwd(),
    "node_modules",
    "pdfjs-dist",
    "legacy",
    "build",
    "pdf.worker.mjs",
  );

  if (fs.existsSync(workerPath)) {
    PDFParse.setWorker(pathToFileURL(workerPath).href);
  }
}

function parseArgs() {
  const pdfArg = process.argv[2] ?? "extratos/UNICRED.pdf";
  const templateName = process.argv[3] ?? "Unicred";
  const entityId = process.argv[4] ?? "";
  return {
    pdfPath: path.isAbsolute(pdfArg) ? pdfArg : path.join(process.cwd(), pdfArg),
    templateName,
    entityId,
  };
}

async function main() {
  const { pdfPath, templateName, entityId } = parseArgs();

  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF não encontrado: ${pdfPath}`);
  }

  ensurePdfWorkerConfigured();

  const template = await prisma.template.findFirst({
    where: { nome: templateName },
  });
  if (!template) throw new Error(`Template não encontrado no banco: ${templateName}`);

  const entity =
    (entityId
      ? await prisma.entity.findFirst({
          where: { id: entityId, clientId: template.clientId },
          select: { id: true, nome: true },
        })
      : await prisma.entity.findFirst({
          where: { clientId: template.clientId },
          select: { id: true, nome: true },
        })) ?? null;

  if (!entity) throw new Error("Empresa (entity) não encontrada para o client do template.");

  const data = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data, disableWorker: true } as unknown as { data: Buffer });
  const result = await parser.getText();
  await parser.destroy();

  const text = result.text ?? "";
  const parsed = parseTransactionsFromText({ text, template, entityId: entity.id });

  const counts = parsed.reduce(
    (acc, t) => {
      acc.total += 1;
      if (t.tipo === "ENTRADA") acc.entradas += 1;
      else acc.saidas += 1;
      return acc;
    },
    { total: 0, entradas: 0, saidas: 0 },
  );

  const target = parsed.find((t) => {
    const day = t.data.toISOString().slice(0, 10);
    return day === "2026-01-07" && t.valor === "5085.00" && /diagnova/i.test(t.descricao);
  });

  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        pdf: path.basename(pdfPath),
        template: { id: template.id, nome: template.nome },
        entity,
        counts,
        foundTargetPix: Boolean(target),
        targetPix: target ?? null,
        sample: parsed.slice(0, 10),
      },
      null,
      2,
    ) + "\n",
  );
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e: unknown) => {
    await prisma.$disconnect().catch(() => null);
    throw e;
  });
