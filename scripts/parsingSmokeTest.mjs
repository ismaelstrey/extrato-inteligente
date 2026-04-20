import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { PDFParse } from "pdf-parse";

function parseDate(value) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function extractPeriod(text) {
  const m = /Periodo:\s*(\d{2}\/\d{2}\/\d{4})\s*a\s*(\d{2}\/\d{2}\/\d{4})/i.exec(text);
  if (!m) return null;
  const start = parseDate(m[1]);
  const end = parseDate(m[2]);
  if (!start || !end) return null;
  return { start, end };
}

function extractDailyBalances(text) {
  const lines = text
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter(Boolean);
  const out = [];
  for (const line of lines) {
    const m = /^Saldo do dia\s+(\d{2}\/\d{2}\/\d{4})\s+R\$\s*([0-9\.\,]+)/i.exec(line);
    if (!m) continue;
    const date = parseDate(m[1]);
    if (!date) continue;
    out.push(date.toISOString().slice(0, 10));
  }
  return out;
}

const pdfPath = path.join(process.cwd(), "2026-01-01_2026-02-28.pdf");
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

const data = fs.readFileSync(pdfPath);
const parser = new PDFParse({ data });
const result = await parser.getText();
await parser.destroy();

if (!result.text || result.text.length < 1000) {
  throw new Error("Texto extraído muito pequeno para o PDF de referência.");
}

const period = extractPeriod(result.text);
if (!period) {
  throw new Error("Não foi possível extrair o período do PDF de referência.");
}

const balances = extractDailyBalances(result.text);
if (balances.length < 10) {
  throw new Error("Não foi possível encontrar saldos diários suficientes.");
}

process.stdout.write(
  JSON.stringify(
    {
      ok: true,
      pages: result.pages?.length ?? null,
      textLen: result.text.length,
      periodStart: period.start.toISOString().slice(0, 10),
      periodEnd: period.end.toISOString().slice(0, 10),
      dailyBalances: balances.length,
    },
    null,
    2,
  ) + "\n",
);

