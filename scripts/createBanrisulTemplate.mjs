import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PDFParse } from "pdf-parse";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const prisma = new PrismaClient({
  adapter: new PrismaNeon({
    connectionString: process.env.DATABASE_URL ?? "",
  }),
});

const pdfPath = path.join(process.cwd(), "extrato01-04-2026_10-59-06_02-2026.pdf");
const worker = path.join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs");
if (fs.existsSync(worker)) PDFParse.setWorker(pathToFileURL(worker).href);

const data = fs.readFileSync(pdfPath);
const parser = new PDFParse({ data });
const result = await parser.getText();
await parser.destroy();

const text = result.text ?? "";
if (!text) throw new Error("Falha ao extrair texto do PDF.");

const template = {
  nome: "Banrisul",
  identificador: "B\\s*A\\s*N\\s*R\\s*I\\s*S\\s*U\\s*L",
  regexData: "^\\s*(\\d{1,2})\\b",
  regexValor: "([0-9]{1,3}(?:\\.[0-9]{3})*,[0-9]{2}-?)$",
  regexDescricao:
    "^\\s*\\d{1,2}\\s+(.+?)\\s+[0-9A-Za-z]+\\s+[0-9]{1,3}(?:\\.[0-9]{3})*,[0-9]{2}-?$",
};

const matches = text
  .split(/\r?\n/g)
  .map((l) => l.trim())
  .filter(Boolean)
  .filter((l) => new RegExp(template.regexData).test(l) && new RegExp(template.regexValor).test(l))
  .slice(0, 10);

process.stdout.write(
  JSON.stringify(
    {
      ok: true,
      pdf: path.basename(pdfPath),
      sampleMatchedLines: matches,
    },
    null,
    2,
  ) + "\n",
);

const client = await prisma.client.findFirst({ select: { id: true, nome: true } });
if (!client) throw new Error("Nenhum client encontrado no banco para associar o template.");

const existing = await prisma.template.findFirst({
  where: { clientId: client.id, nome: template.nome },
  select: { id: true },
});

const saved = existing
  ? await prisma.template.update({
      where: { id: existing.id },
      data: { ...template },
      select: { id: true },
    })
  : await prisma.template.create({
      data: { ...template, clientId: client.id },
      select: { id: true },
    });

process.stdout.write(
  JSON.stringify(
    {
      saved: true,
      client: { id: client.id, nome: client.nome },
      templateId: saved.id,
      templateName: template.nome,
    },
    null,
    2,
  ) + "\n",
);

await prisma.$disconnect();
