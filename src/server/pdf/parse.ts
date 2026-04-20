import crypto from "crypto";

import type { Template, TransactionCategory, TransactionType } from "@prisma/client";
import { z } from "zod";

const ParsedTransactionSchema = z.object({
  data: z.date(),
  descricao: z.string().min(1),
  categoria: z.enum([
    "PIX",
    "VENDAS",
    "RENDIMENTO",
    "TARIFA",
    "JUROS",
    "IMPOSTOS",
    "TRANSFERENCIA",
    "ESTORNO",
    "OUTROS",
  ]),
  valor: z.string().regex(/^\d+(\.\d{2})$/),
  tipo: z.enum(["ENTRADA", "SAIDA"]),
});

export type ParsedTransaction = z.infer<typeof ParsedTransactionSchema> & {
  dedupeHash: string;
};

function parseDate(value: string) {
  const s = value.trim();
  const m = /^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/.exec(s);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);

  const d = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function parseBRLNumber(value: string) {
  const raw = value.trim();
  const normalized = raw
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/^\((.*)\)$/, "-$1");
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return n;
}

function normalizeDescricao(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function classifyCategoria(descricao: string): TransactionCategory {
  const d = normalizeDescricao(descricao).toLowerCase();
  if (d.includes("tarifa")) return "TARIFA";
  if (d.includes("juros")) return "JUROS";
  if (d.includes("iof")) return "IMPOSTOS";
  if (d.includes("rendimento")) return "RENDIMENTO";
  if (d.includes("estorno")) return "ESTORNO";
  if (d.includes("pix")) return "PIX";
  if (d.includes("vendas")) return "VENDAS";
  if (d.includes("ted") || d.includes("doc") || d.includes("transfer")) return "TRANSFERENCIA";
  return "OUTROS";
}

function sha(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function execOnce(re: RegExp, value: string) {
  re.lastIndex = 0;
  return re.exec(value);
}

export function parseTransactionsFromText({
  text,
  template,
  entityId,
}: {
  text: string;
  template: Template;
  entityId: string;
}): ParsedTransaction[] {
  const reData = new RegExp(template.regexData);
  const reValor = new RegExp(template.regexValor);
  const reDescricao = template.regexDescricao ? new RegExp(template.regexDescricao) : null;

  const lines = text
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter(Boolean);

  const out: ParsedTransaction[] = [];

  for (const line of lines) {
    const mData = execOnce(reData, line);
    const mValor = execOnce(reValor, line);
    if (!mData || !mValor) continue;

    const date = parseDate(mData[1] ?? mData[0]);
    if (!date) continue;

    const numberValue = parseBRLNumber(mValor[1] ?? mValor[0]);
    if (numberValue === null) continue;

    const tipo: TransactionType = numberValue < 0 ? "SAIDA" : "ENTRADA";
    const valor = Math.abs(numberValue).toFixed(2);

    const mDescricao = reDescricao ? execOnce(reDescricao, line) : null;
    let descricao = (mDescricao?.[1] ?? mDescricao?.[0] ?? "").trim();

    if (!descricao) {
      descricao = normalizeDescricao(
        line
          .replace(mData[0], "")
          .replace(mValor[0], "")
          .replace(/\s+/g, " ")
          .trim(),
      );
    }

    if (!descricao) descricao = "Transação";

    const normalizedDescricao = normalizeDescricao(descricao).toLowerCase();
    const categoria = classifyCategoria(descricao);
    const dedupeHash = sha(
      `${entityId}|${date.toISOString().slice(0, 10)}|${valor}|${normalizedDescricao}`,
    );

    const candidate = ParsedTransactionSchema.safeParse({
      data: date,
      descricao: normalizeDescricao(descricao),
      categoria,
      valor,
      tipo,
    });

    if (!candidate.success) continue;

    out.push({
      ...candidate.data,
      dedupeHash,
    });
  }

  return out;
}
