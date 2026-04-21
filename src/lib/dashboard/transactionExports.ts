export type TransactionTipo = "ENTRADA" | "SAIDA";

export type TipoFiltro = "TODOS" | "ENTRADA" | "SAIDA";

export type TransactionRow = {
  id: string;
  date: string;
  descricao: string;
  tipo: TransactionTipo;
  valor: number;
};

export type SortKey = "DATA_ASC" | "DATA_DESC" | "VALOR_ASC" | "VALOR_DESC";

export function formatDateBR(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return value;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function formatCsvNumber(value: number) {
  return value.toFixed(2).replace(".", ",");
}

export function formatTxtNumber(value: number) {
  let s = value.toFixed(2).replace(".", ",");
  s = s.replace(/0+$/g, "").replace(/,$/g, "");
  return s;
}

export function filterTransactions(rows: TransactionRow[], filter: TipoFiltro) {
  if (filter === "TODOS") return rows;
  return rows.filter((r) => r.tipo === filter);
}

export function sortTransactions(rows: TransactionRow[], sort: SortKey) {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    if (sort === "DATA_ASC") return a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
    if (sort === "DATA_DESC") return b.date.localeCompare(a.date) || a.id.localeCompare(b.id);
    if (sort === "VALOR_ASC") return a.valor - b.valor || a.id.localeCompare(b.id);
    return b.valor - a.valor || a.id.localeCompare(b.id);
  });
  return sorted;
}

export function inferCompetenciaFromTransactions(rows: TransactionRow[]) {
  const first = rows[0]?.date ?? "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(first);
  if (!m) return "";
  return `01/${m[2]}/${m[1]}`;
}

export function toCsvTransactions(rows: TransactionRow[]) {
  const lines = ["data,descricao,tipo,valor"];
  for (const r of rows) {
    const safeDesc = r.descricao.replace(/"/g, '""');
    lines.push(`${r.date},"${safeDesc}",${r.tipo},${formatCsvNumber(r.valor)}`);
  }
  return lines.join("\n");
}

export function toTxtTransactions(input: {
  rows: TransactionRow[];
  competencia: string;
  contaBanco: string;
}) {
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
    return out;
  }

  function normalizeDescricao(value: string) {
    return sanitizeAscii(value)
      .replace(/--\s*\d+\s+of\s+\d+\s*--.*$/i, "")
      .replace(/\s*-\s*R\$\s*$/i, "")
      .replace(/\s*R\$\s*$/i, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function toFixed240(line: string) {
    const clean = sanitizeAscii(line).replace(/\r/g, "").replace(/\n/g, "");
    if (clean.length >= 240) return clean.slice(0, 240);
    return clean.padEnd(240, " ");
  }

  const lines: string[] = [];
  lines.push(toFixed240("Cabecalho;;;;;"));
  lines.push(
    toFixed240(
      `Competencia;${input.competencia};Conta Banco;${input.contaBanco};Saldo Inicial;0`,
    ),
  );
  lines.push(toFixed240("Lancamentos;;;;;"));
  lines.push(
    toFixed240("Data;Historico;Documento;Valor Debito (Soma);Valor Credito (Subtrai);"),
  );

  for (let i = 0; i < input.rows.length; i += 1) {
    const r = input.rows[i];
    const data = formatDateBR(r.date);
    const documento = String(i + 1);
    const historico = normalizeDescricao(r.descricao);
    const debito = r.tipo === "ENTRADA" ? formatTxtNumber(r.valor) : "";
    const credito = r.tipo === "SAIDA" ? formatTxtNumber(r.valor) : "";
    lines.push(toFixed240(`${data};${historico};${documento};${debito};${credito};`));
  }

  return lines.join("\r\n");
}
