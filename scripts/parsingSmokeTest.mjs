import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { PDFParse } from "pdf-parse";

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

const fixturesDir = path.join(process.cwd(), "extratos");
if (!fs.existsSync(fixturesDir)) {
  throw new Error("Diretório extratos/ não encontrado.");
}

const pdfFiles = fs
  .readdirSync(fixturesDir)
  .filter((f) => f.toLowerCase().endsWith(".pdf"))
  .sort((a, b) => a.localeCompare(b));

if (!pdfFiles.length) {
  throw new Error("Nenhum PDF encontrado em extratos/.");
}

ensurePdfWorkerConfigured();

const results = [];
for (const file of pdfFiles) {
  const pdfPath = path.join(fixturesDir, file);
  const data = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data, disableWorker: true });
  const result = await parser.getText();
  await parser.destroy();

  const text = result.text ?? "";
  if (text.length < 500) {
    throw new Error(`Texto extraído muito pequeno: ${file} (len=${text.length}).`);
  }

  results.push({
    pdf: file,
    pages: result.pages?.length ?? null,
    textLen: text.length,
  });
}

process.stdout.write(JSON.stringify({ ok: true, fixtures: results }, null, 2) + "\n");
