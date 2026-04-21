import type { Template, TransactionCategory, TransactionType } from "@prisma/client";
import { z } from "zod";

import { computeTransactionDedupeHash, normalizeTransactionDescricao } from "@/server/transactions/dedupe";

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
  const raw = value.trim().replace(/−/g, "-");
  const normalized = raw
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/^\+/, "")
    .replace(/^(.*)-$/, "-$1")
    .replace(/^\((.*)\)$/, "-$1");
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return n;
}

function inferMonthYear(text: string) {
  const fullDate = /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/.exec(text);
  if (fullDate) {
    const month = Number(fullDate[2]);
    const year = Number(fullDate[3]);
    if (month >= 1 && month <= 12 && year >= 1900) return { month, year };
  }

  const period = /PERIODO:\s*([A-ZÇÃÉÍÓÚ]+)\/(\d{4})/i.exec(text);
  if (!period) return null;
  const rawMonth = period[1]
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase();
  const year = Number(period[2]);

  const map: Record<string, number> = {
    JANEIRO: 1,
    FEVEREIRO: 2,
    MARCO: 3,
    ABRIL: 4,
    MAIO: 5,
    JUNHO: 6,
    JULHO: 7,
    AGOSTO: 8,
    SETEMBRO: 9,
    OUTUBRO: 10,
    NOVEMBRO: 11,
    DEZEMBRO: 12,
  };

  const month = map[rawMonth];
  if (!month || year < 1900) return null;
  return { month, year };
}

function classifyCategoria(descricao: string): TransactionCategory {
  const d = normalizeTransactionDescricao(descricao).toLowerCase();
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

function execOnce(re: RegExp, value: string) {
  re.lastIndex = 0;
  return re.exec(value);
}

function hasNegativeMarker(line: string) {
  const s = line.replace(/−/g, "-").replace(/\s+/g, " ").trim();
  if (/[-]\s*R\$/i.test(s)) return true;
  if (/R\$\s*[-]/i.test(s)) return true;
  if (/\(\s*R\$/i.test(s)) return true;
  if (/\d(?:\.\d{3})*(?:,\d{2})?\s*-\s*$/.test(s)) return true;
  return false;
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
  const monthYear = inferMonthYear(text);
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

    const dateValue = (mData[1] ?? mData[0]).trim();
    const date =
      parseDate(dateValue) ??
      (monthYear && /^\d{1,2}$/.test(dateValue)
        ? new Date(Date.UTC(monthYear.year, monthYear.month - 1, Number(dateValue)))
        : null);
    if (!date) continue;

    const numberValue = parseBRLNumber(mValor[1] ?? mValor[0]);
    if (numberValue === null) continue;

    const isNegative = numberValue < 0 || hasNegativeMarker(line);
    const tipo: TransactionType = isNegative ? "SAIDA" : "ENTRADA";
    const valor = Math.abs(numberValue).toFixed(2);

    const mDescricao = reDescricao ? execOnce(reDescricao, line) : null;
    let descricao = (mDescricao?.[1] ?? mDescricao?.[0] ?? "").trim();

    if (!descricao) {
      descricao = normalizeTransactionDescricao(
        line
          .replace(mData[0], "")
          .replace(mValor[0], "")
          .replace(/\s+/g, " ")
          .trim(),
      );
    }

    if (!descricao) descricao = "Transação";

    const categoria = classifyCategoria(descricao);
    const dedupeHash = computeTransactionDedupeHash({ entityId, date, valor, descricao });

    const candidate = ParsedTransactionSchema.safeParse({
      data: date,
      descricao: normalizeTransactionDescricao(descricao),
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
