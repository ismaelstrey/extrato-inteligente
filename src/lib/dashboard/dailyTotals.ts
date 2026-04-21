export type TipoFiltro = "TODOS" | "ENTRADA" | "SAIDA";

export type DailyTotalRow = { date: string; total: number };

export type DailyTotalsMergedRow = {
  date: string;
  entrada: number;
  saida: number;
};

export function mergeDailyTotals(input: {
  entrada: DailyTotalRow[];
  saida: DailyTotalRow[];
}): DailyTotalsMergedRow[] {
  const byDate = new Map<string, DailyTotalsMergedRow>();

  for (const r of input.entrada) {
    const prev = byDate.get(r.date) ?? { date: r.date, entrada: 0, saida: 0 };
    byDate.set(r.date, { ...prev, entrada: r.total });
  }

  for (const r of input.saida) {
    const prev = byDate.get(r.date) ?? { date: r.date, entrada: 0, saida: 0 };
    byDate.set(r.date, { ...prev, saida: r.total });
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function formatDateBR(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return value;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function formatCsvNumber(value: number) {
  return value.toFixed(2).replace(".", ",");
}

export function toCsvDailyTotals(input: {
  filter: TipoFiltro;
  entrada: DailyTotalRow[];
  saida: DailyTotalRow[];
}) {
  if (input.filter === "TODOS") {
    const merged = mergeDailyTotals({ entrada: input.entrada, saida: input.saida });
    const lines = ["data,entrada_total_dia,saida_total_dia"];
    for (const r of merged) {
      lines.push(`${r.date},${formatCsvNumber(r.entrada)},${formatCsvNumber(r.saida)}`);
    }
    return lines.join("\n");
  }

  const rows = input.filter === "ENTRADA" ? input.entrada : input.saida;
  const lines = ["data,valor_total_dia"];
  for (const r of rows) {
    lines.push(`${r.date},${formatCsvNumber(r.total)}`);
  }
  return lines.join("\n");
}

export function formatTxtNumber(value: number) {
  let s = value.toFixed(2).replace(".", ",");
  s = s.replace(/0+$/g, "").replace(/,$/g, "");
  return s;
}

export function inferCompetenciaFromRows(input: { entrada: DailyTotalRow[]; saida: DailyTotalRow[] }) {
  const firstDate = (input.entrada[0]?.date ?? input.saida[0]?.date ?? "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(firstDate);
  if (!m) return "";
  return `01/${m[2]}/${m[1]}`;
}

export function toTxtDailyTotals(input: {
  filter: TipoFiltro;
  entrada: DailyTotalRow[];
  saida: DailyTotalRow[];
  competencia: string;
  contaBanco: string;
}) {
  const lines: string[] = [];
  lines.push("Cabecalho;;;;;");
  lines.push(`Competencia;${input.competencia};Conta Banco;${input.contaBanco};Saldo Inicial;0`);
  lines.push("Lancamentos;;;;;");
  lines.push("Data;Historico;Documento;Valor Debito (Soma);Valor Credito (Subtrai);");

  if (input.filter === "TODOS") {
    const merged = mergeDailyTotals({ entrada: input.entrada, saida: input.saida });
    for (const r of merged) {
      lines.push(
        `${formatDateBR(r.date)};Totais do dia;;${formatTxtNumber(r.entrada)};${formatTxtNumber(r.saida)};`,
      );
    }
    return lines.join("\n") + "\n";
  }

  const historico = input.filter === "ENTRADA" ? "Total entradas" : "Total saídas";
  const rows = input.filter === "ENTRADA" ? input.entrada : input.saida;

  for (const r of rows) {
    const debito = input.filter === "ENTRADA" ? formatTxtNumber(r.total) : "";
    const credito = input.filter === "SAIDA" ? formatTxtNumber(r.total) : "";
    lines.push(`${formatDateBR(r.date)};${historico};;${debito};${credito};`);
  }

  return lines.join("\n") + "\n";
}
