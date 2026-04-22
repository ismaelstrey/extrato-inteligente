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

  const movimentos = /MOVIMENTOS\s+([A-ZÇÃÉÍÓÚ]{3,})\/(\d{4})/i.exec(text);
  if (movimentos) {
    const rawMonth = movimentos[1]
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toUpperCase();
    const year = Number(movimentos[2]);
    const map: Record<string, number> = {
      JAN: 1,
      JANEIRO: 1,
      FEV: 2,
      FEVEREIRO: 2,
      MAR: 3,
      MARCO: 3,
      ABR: 4,
      ABRIL: 4,
      MAI: 5,
      MAIO: 5,
      JUN: 6,
      JUNHO: 6,
      JUL: 7,
      JULHO: 7,
      AGO: 8,
      AGOSTO: 8,
      SET: 9,
      SETEMBRO: 9,
      OUT: 10,
      OUTUBRO: 10,
      NOV: 11,
      NOVEMBRO: 11,
      DEZ: 12,
      DEZEMBRO: 12,
    };
    const month = map[rawMonth];
    if (month && year >= 1900) return { month, year };
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

function isFullDateTemplate(regexData: string) {
  if (!regexData) return false;
  if (regexData.includes("\\d{2}\\/\\d{2}\\/\\d{4}")) return true;
  if (regexData.includes("\\d{2}/\\d{2}/\\d{4}")) return true;
  return false;
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

function isPagBankTemplate(template: Template) {
  const key = `${template.nome ?? ""} ${template.identificador ?? ""}`.toUpperCase();
  return key.includes("PAGBANK") || key.includes("PAGSEGURO") || key.includes("PAG SEGURO");
}

function isBanrisulTemplate(template: Template) {
  const key = `${template.nome ?? ""} ${template.identificador ?? ""}`.toUpperCase();
  return key.includes("BANRISUL") || key.includes("B A N R I S U L");
}

function stripPagBankNonMovements(text: string) {
  return (
    text
      .replace(/\r/g, "")
      .replace(/Saldo do dia\s+\d{2}\/\d{2}\/\d{4}\s+R\$\s*[0-9\.\,]+/gi, " ")
      .replace(/Descricao\s+Data\s+Valor/gi, " ")
      .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function stripBanrisulNonMovements(text: string) {
  return text
    .replace(/\r/g, "")
    .split(/\n/g)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^SALDO\s+NA\s+DATA\b/i.test(l))
    .filter((l) => !/^\+\+\s*MOVIMENTOS\b/i.test(l))
    .filter((l) => !/^MOVIMENTOS\s+[A-ZÇÃÉÍÓÚ]{3,}\/\d{4}$/i.test(l))
    .join("\n");
}

function parseBanrisulTransactionsFromText(input: {
  text: string;
  template: Template;
  entityId: string;
  allowDuplicates?: boolean;
  dedupeSalt?: string;
}): ParsedTransaction[] {
  const cleaned = stripBanrisulNonMovements(input.text);
  const monthYear = inferMonthYear(input.text);
  const lines = cleaned
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter(Boolean);

  const out: ParsedTransaction[] = [];
  let currentDate: Date | null = null;
  let lastIndex = -1;
  let sequence = 0;

  const valueRe = /([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})(-?)\s*$/;
  const dayRe = /^(\d{1,2})\b/;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    if (!line) continue;
    if (/^NOME:/i.test(line)) {
      if (lastIndex >= 0) {
        const name = line.replace(/^NOME:\s*/i, "").trim();
        if (name) {
          const prev = out[lastIndex];
          const nextDesc = normalizeTransactionDescricao(`${prev.descricao} ${name}`);
          out[lastIndex] = {
            ...prev,
            descricao: nextDesc,
            dedupeHash: computeTransactionDedupeHash({
              entityId: input.entityId,
              date: prev.data,
              valor: prev.valor,
              descricao: nextDesc,
              salt: input.allowDuplicates ? input.dedupeSalt : undefined,
              sequence: input.allowDuplicates ? sequence : undefined,
            }),
          };
        }
      }
      continue;
    }

    const mValue = valueRe.exec(line);
    if (!mValue) continue;
    if (!monthYear) continue;

    const mDay = dayRe.exec(line);
    let working = line;
    if (mDay) {
      const dayNum = Number(mDay[1]);
      if (dayNum >= 1 && dayNum <= 31) {
        currentDate = new Date(Date.UTC(monthYear.year, monthYear.month - 1, dayNum));
      }
      working = working.replace(dayRe, "").trim();
    }
    if (!currentDate) continue;

    const numberValue = parseBRLNumber(`${mValue[1]}${mValue[2] ?? ""}`);
    if (numberValue === null) continue;

    const normalizedLine = normalizeTransactionDescricao(line).toLowerCase();
    const shouldBeSaida =
      numberValue < 0 ||
      Boolean(mValue[2]) ||
      normalizedLine.includes("pix enviado") ||
      normalizedLine.includes("pix banri env") ||
      normalizedLine.includes("pg.titulo") ||
      normalizedLine.includes("vero deb");

    const tipo: TransactionType = shouldBeSaida ? "SAIDA" : "ENTRADA";
    const valor = Math.abs(numberValue).toFixed(2);

    const descricao = normalizeTransactionDescricao(
      working.replace(valueRe, "").replace(/\s+/g, " ").trim() || "Transação",
    );

    const categoria = classifyCategoria(descricao);
    const dedupeHash = computeTransactionDedupeHash({
      entityId: input.entityId,
      date: currentDate,
      valor,
      descricao,
      salt: input.allowDuplicates ? input.dedupeSalt : undefined,
      sequence: input.allowDuplicates ? sequence : undefined,
    });

    const candidate = ParsedTransactionSchema.safeParse({
      data: currentDate,
      descricao,
      categoria,
      valor,
      tipo,
    });

    if (!candidate.success) continue;

    out.push({ ...candidate.data, dedupeHash });
    lastIndex = out.length - 1;
    sequence += 1;
  }

  return out;
}

export function parseTransactionsFromText({
  text,
  template,
  entityId,
  allowDuplicates,
  dedupeSalt,
}: {
  text: string;
  template: Template;
  entityId: string;
  allowDuplicates?: boolean;
  dedupeSalt?: string;
}): ParsedTransaction[] {
  if (isBanrisulTemplate(template)) {
    return parseBanrisulTransactionsFromText({
      text,
      template,
      entityId,
      allowDuplicates,
      dedupeSalt,
    });
  }

  const cleanedText = isPagBankTemplate(template) ? stripPagBankNonMovements(text) : text;
  const monthYear = inferMonthYear(cleanedText);
  const reData = new RegExp(template.regexData);
  const reValor = new RegExp(template.regexValor);
  const reDescricao = template.regexDescricao ? new RegExp(template.regexDescricao) : null;

  const lines = isFullDateTemplate(template.regexData)
    ? extractFullDateSegments(normalizePdfTextForFullDateParsing(cleanedText))
    : cleanedText
        .split(/\r?\n/g)
        .map((l) => l.trim())
        .filter(Boolean);

  const out: ParsedTransaction[] = [];
  let sequence = 0;

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
    const dedupeHash = computeTransactionDedupeHash({
      entityId,
      date,
      valor,
      descricao,
      salt: allowDuplicates ? dedupeSalt : undefined,
      sequence: allowDuplicates ? sequence : undefined,
    });

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
    sequence += 1;
  }

  return out;
}
