import type { TransactionRow, TransactionTipo } from "@/lib/dashboard/transactionExports";

type OfxTransaction = {
  trnType: "DEBIT" | "CREDIT" | "CHECK";
  dtPosted: string;
  trnAmt: string;
  fitId: string;
  refNum: string;
  memo: string;
};

function sanitizeAscii(value: string) {
  const noDiacritics = value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[\u2010-\u2015]/g, "-");

  let out = "";
  for (let i = 0; i < noDiacritics.length; i += 1) {
    const code = noDiacritics.charCodeAt(i);
    out += code <= 0x7f ? noDiacritics[i] : " ";
  }
  return out.replace(/\s+/g, " ").trim();
}

function toOfxDateTime(dateIso: string, tz = "[-3:GMT]") {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso);
  if (!m) return `19700101000000${tz}`;
  return `${m[1]}${m[2]}${m[3]}000000${tz}`;
}

function toOfxServerDateTime(now: Date, tz = "[-3:GMT]") {
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const yyyy = String(now.getFullYear());
  const mm = pad2(now.getMonth() + 1);
  const dd = pad2(now.getDate());
  const hh = pad2(now.getHours());
  const mi = pad2(now.getMinutes());
  const ss = pad2(now.getSeconds());
  return `${yyyy}${mm}${dd}${hh}${mi}${ss}${tz}`;
}

function formatTrnAmt(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  return n.toFixed(2);
}

function trnTypeFromTipo(tipo: TransactionTipo): "DEBIT" | "CREDIT" {
  return tipo === "SAIDA" ? "DEBIT" : "CREDIT";
}

function memoFromDescricao(descricao: string) {
  return sanitizeAscii(descricao).slice(0, 255);
}

function inferDtStartEnd(rows: TransactionRow[]) {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const start = sorted[0]?.date ?? "1970-01-01";
  const end = sorted[sorted.length - 1]?.date ?? start;
  return { start, end };
}

export function validateOfxSgml(ofx: string) {
  const required = [
    "OFXHEADER:100",
    "DATA:OFXSGML",
    "VERSION:102",
    "SECURITY:NONE",
    "ENCODING:USASCII",
    "CHARSET:1252",
    "<OFX>",
    "<SIGNONMSGSRSV1>",
    "<SONRS>",
    "<STATUS>",
    "<CODE>0</CODE>",
    "<SEVERITY>INFO</SEVERITY>",
    "<DTSERVER>",
    "<LANGUAGE>ENG</LANGUAGE>",
    "<BANKMSGSRSV1>",
    "<STMTTRNRS>",
    "<STMTRS>",
    "<BANKACCTFROM>",
    "<BANKID>",
    "<ACCTID>",
    "<BANKTRANLIST>",
    "<DTSTART>",
    "<DTEND>",
    "<STMTTRN>",
    "<TRNAMT>",
    "<MEMO>",
    "</OFX>",
  ];

  for (const token of required) {
    if (!ofx.includes(token)) throw new Error(`OFX inválido: campo obrigatório ausente: ${token}`);
  }

  for (let i = 0; i < ofx.length; i += 1) {
    if (ofx.charCodeAt(i) > 0x7f) throw new Error("OFX inválido: contém caracteres fora de ASCII.");
  }
}

export function toOfxSgml(input: {
  rows: TransactionRow[];
  bankId: string;
  acctId: string;
  org: string;
  fid: string;
  dtStart?: string;
  dtEnd?: string;
  ledgerBalAmt?: number;
  ledgerBalDate?: string;
}) {
  const tz = "[-3:GMT]";
  const { start, end } =
    input.dtStart && input.dtEnd ? { start: input.dtStart, end: input.dtEnd } : inferDtStartEnd(input.rows);

  const dtStart = toOfxDateTime(start, tz);
  const dtEnd = toOfxDateTime(end, tz);
  const dtServer = toOfxServerDateTime(new Date(), tz);

  const txs: OfxTransaction[] = input.rows.map((r) => {
    const trnType = trnTypeFromTipo(r.tipo);
    const amt = r.tipo === "SAIDA" ? -Math.abs(r.valor) : Math.abs(r.valor);
    const dtPosted = toOfxDateTime(r.date, tz);
    const fitId = sanitizeAscii(r.id).slice(0, 80) || "0";
    const refNum = fitId;
    const memo = memoFromDescricao(r.descricao);
    return { trnType, dtPosted, trnAmt: formatTrnAmt(amt), fitId, refNum, memo };
  });

  const org = sanitizeAscii(input.org).padEnd(30, " ").slice(0, 30);
  const fid = sanitizeAscii(input.fid).padEnd(30, " ").slice(0, 30);
  const bankId = sanitizeAscii(input.bankId).replace(/\D/g, "").slice(0, 11) || "0";
  const acctId = sanitizeAscii(input.acctId).replace(/\s+/g, "").slice(0, 34) || "0";

  const balAmt = formatTrnAmt(input.ledgerBalAmt ?? 0);
  const balDate = toOfxDateTime(input.ledgerBalDate ?? end, tz).replace(tz, "");

  const lines: string[] = [];
  lines.push("OFXHEADER:100");
  lines.push("DATA:OFXSGML");
  lines.push("VERSION:102");
  lines.push("SECURITY:NONE");
  lines.push("ENCODING:USASCII");
  lines.push("CHARSET:1252");
  lines.push("COMPRESSION:NONE");
  lines.push("OLDFILEUID:NONE");
  lines.push("NEWFILEUID:NONE");
  lines.push("");
  lines.push("<OFX>");
  lines.push("<SIGNONMSGSRSV1>");
  lines.push("<SONRS>");
  lines.push("<STATUS>");
  lines.push("<CODE>0</CODE>");
  lines.push("<SEVERITY>INFO</SEVERITY>");
  lines.push("</STATUS>");
  lines.push(`<DTSERVER>${dtServer}</DTSERVER>`);
  lines.push("<LANGUAGE>ENG</LANGUAGE>");
  lines.push("<FI>");
  lines.push(`<ORG>${org}</ORG>`);
  lines.push(`<FID>${fid}</FID>`);
  lines.push("</FI>");
  lines.push("</SONRS>");
  lines.push("</SIGNONMSGSRSV1>");
  lines.push("<BANKMSGSRSV1>");
  lines.push("<STMTTRNRS>");
  lines.push("<TRNUID>1</TRNUID>");
  lines.push("<STATUS>");
  lines.push("<CODE>0</CODE>");
  lines.push("<SEVERITY>INFO</SEVERITY>");
  lines.push("</STATUS>");
  lines.push("<STMTRS>");
  lines.push("<CURDEF>BRL</CURDEF>");
  lines.push("<BANKACCTFROM>");
  lines.push(`<BANKID>${bankId}</BANKID>`);
  lines.push(`<ACCTID>${acctId}</ACCTID>`);
  lines.push("<ACCTTYPE>CHECKING</ACCTTYPE>");
  lines.push("</BANKACCTFROM>");
  lines.push("<BANKTRANLIST>");
  lines.push(`<DTSTART>${dtStart}</DTSTART>`);
  lines.push(`<DTEND>${dtEnd}</DTEND>`);

  for (const t of txs) {
    lines.push("<STMTTRN>");
    lines.push(`<TRNTYPE>${t.trnType}</TRNTYPE>`);
    lines.push(`<DTPOSTED>${t.dtPosted}</DTPOSTED>`);
    lines.push(`<TRNAMT>${t.trnAmt}</TRNAMT>`);
    lines.push(`<FITID>${t.fitId}</FITID>`);
    lines.push(`<REFNUM>${t.refNum}</REFNUM>`);
    lines.push(`<MEMO>${t.memo}</MEMO>`);
    lines.push("</STMTTRN>");
  }

  lines.push("</BANKTRANLIST>");
  lines.push("<LEDGERBAL>");
  lines.push(`<BALAMT>${balAmt}</BALAMT>`);
  lines.push(`<DTASOF>${balDate}</DTASOF>`);
  lines.push("</LEDGERBAL>");
  lines.push("</STMTRS>");
  lines.push("</STMTTRNRS>");
  lines.push("</BANKMSGSRSV1>");
  lines.push("</OFX>");

  const ofx = lines.join("\r\n");
  validateOfxSgml(ofx);
  return ofx;
}

