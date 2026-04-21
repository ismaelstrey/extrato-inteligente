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
  const period = /PERIODO:\s*([A-ZÇÃÉÍÓÚ]+)\/(\d{4})/i.exec(text);
  const movimentos = /MOVIMENTOS\s+([A-ZÇÃÉÍÓÚ]{3,})\/(\d{4})/i.exec(text);
  const source = period ?? movimentos;
  if (source) {
    const rawMonth = source[1]
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toUpperCase();
    const year = Number(source[2]);

    const map: Record<string, number> = {
      JANEIRO: 1,
      JAN: 1,
      FEVEREIRO: 2,
      FEV: 2,
      MARCO: 3,
      MAR: 3,
      ABRIL: 4,
      ABR: 4,
      MAIO: 5,
      MAI: 5,
      JUNHO: 6,
      JUN: 6,
      JULHO: 7,
      JUL: 7,
      AGOSTO: 8,
      AGO: 8,
      SETEMBRO: 9,
      SET: 9,
      OUTUBRO: 10,
      OUT: 10,
      NOVEMBRO: 11,
      NOV: 11,
      DEZEMBRO: 12,
      DEZ: 12,
    };

    const month = map[rawMonth];
    if (month && year >= 1900) return { month, year };
  }

  const fullDate = /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/.exec(text);
  if (fullDate) {
    const month = Number(fullDate[2]);
    const year = Number(fullDate[3]);
    if (month >= 1 && month <= 12 && year >= 1900) return { month, year };
  }

  return null;
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

function isFullDateTemplate(regexData: string) {
  if (!regexData) return false;
  if (regexData.includes("\\d{2}\\/\\d{2}\\/\\d{4}")) return true;
  if (regexData.includes("\\d{2}/\\d{2}/\\d{4}")) return true;
  return false;
}

function isDayOfMonthTemplate(regexData: string) {
  if (!regexData) return false;
  if (isFullDateTemplate(regexData)) return false;
  if (regexData.includes("\\d{4}")) return false;
  if (regexData.includes("\\d{1,2}")) return true;
  return false;
}

function inferTipoFromDescricao(descricao: string): TransactionType | null {
  const d = normalizeTransactionDescricao(descricao)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  if (/\bpix\s+enviado\b/.test(d)) return "SAIDA";
  if (/\bpix\s+banri\s+env\b/.test(d)) return "SAIDA";
  if (/\bpix\s+recebido\b/.test(d)) return "ENTRADA";
  if (/\bpix\s+banri\s+rec\b/.test(d)) return "ENTRADA";
  if (/\bvero\s+deb\b/.test(d)) return "SAIDA";
  if (/(^|\s)tar\./.test(d) || d.includes("tarifa")) return "SAIDA";
  if (d.includes("recarga telefone") || d.includes("recarga cel")) return "SAIDA";
  if (d.includes("pg.titulo") || d.includes("pg titulo")) return "SAIDA";
  if (/(^|\s)rend\b/.test(d) || d.includes("rendimento")) return "ENTRADA";
  return null;
}

function normalizePdfTextForFullDateParsing(text: string) {
  return text
    .replace(/(\d)\.\s*\r?\n\s*(\d{3},\d{2})/g, "$1.$2")
    .replace(/\r/g, "");
}

function extractFullDateSegments(text: string) {
  const re = /\b\d{2}\/\d{2}\/\d{4}\b/g;
  const matches = [...text.matchAll(re)];
  if (!matches.length) {
    return text
      .split(/\r?\n/g)
      .map((l) => l.trim())
      .filter(Boolean);
  }

  const out: string[] = [];
  for (let i = 0; i < matches.length; i += 1) {
    const start = matches[i].index ?? 0;
    const end = matches[i + 1]?.index ?? text.length;
    const seg = text.slice(start, end).replace(/\s+/g, " ").trim();
    if (seg) out.push(seg);
  }
  return out;
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

  const fullDateTemplate = isFullDateTemplate(template.regexData);
  const dayOfMonthTemplate = Boolean(monthYear) && isDayOfMonthTemplate(template.regexData);

  const lines = fullDateTemplate
    ? extractFullDateSegments(normalizePdfTextForFullDateParsing(text))
    : text
        .split(/\r?\n/g)
        .map((l) => l.trim())
        .filter(Boolean);

  const out: ParsedTransaction[] = [];

  if (dayOfMonthTemplate) {
    let currentDate: Date | null = null;
    for (const rawLine of lines) {
      const line = rawLine.replace(/\s+/g, " ").trim();
      if (!line) continue;
      if (/^--\s*\d+\s+of\s+\d+\s*--$/i.test(line)) continue;
      if (/^SALDO\s+(ANT|NA\s+DATA|INICIAL)\b/i.test(line)) continue;

      const mData = execOnce(reData, line);
      let rest = line;
      if (mData) {
        const dateValue = (mData[1] ?? mData[0]).trim();
        if (/^\d{1,2}$/.test(dateValue) && monthYear) {
          const day = Number(dateValue);
          currentDate = new Date(Date.UTC(monthYear.year, monthYear.month - 1, day));
        }
        rest = line.slice(mData[0].length).trim();
      }

      if (/^NOME:\s*/i.test(line)) {
        if (out.length && currentDate) {
          const prev = out[out.length - 1];
          const sameDay = prev.data.toISOString().slice(0, 10) === currentDate.toISOString().slice(0, 10);
          if (sameDay) {
            const descricao = normalizeTransactionDescricao(`${prev.descricao} ${line}`);
            const categoria = classifyCategoria(descricao);
            const dedupeHash = computeTransactionDedupeHash({
              entityId,
              date: prev.data,
              valor: prev.valor,
              descricao,
            });
            const candidate = ParsedTransactionSchema.safeParse({
              data: prev.data,
              descricao,
              categoria,
              valor: prev.valor,
              tipo: prev.tipo,
            });
            if (candidate.success) {
              out[out.length - 1] = { ...candidate.data, dedupeHash };
            }
          }
        }
        continue;
      }

      const mValor = execOnce(reValor, line);
      if (!mValor) continue;
      if (!currentDate) continue;

      const numberValue = parseBRLNumber(mValor[1] ?? mValor[0]);
      if (numberValue === null) continue;

      const isNegative = numberValue < 0 || hasNegativeMarker(line);
      const valor = Math.abs(numberValue).toFixed(2);

      const mDescricao = reDescricao ? execOnce(reDescricao, line) : null;
      let descricao = (mDescricao?.[1] ?? mDescricao?.[0] ?? "").trim();

      if (!descricao) {
        const lineForDesc = mData ? rest : line;
        descricao = normalizeTransactionDescricao(
          lineForDesc
            .replace(mValor[0], "")
            .replace(/\s+/g, " ")
            .trim(),
        );
      }

      if (!descricao) descricao = "Transação";

      const inferredTipo = inferTipoFromDescricao(descricao);
      const tipo: TransactionType = isNegative ? "SAIDA" : (inferredTipo ?? "ENTRADA");

      const categoria = classifyCategoria(descricao);
      const dedupeHash = computeTransactionDedupeHash({ entityId, date: currentDate, valor, descricao });

      const candidate = ParsedTransactionSchema.safeParse({
        data: currentDate,
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
