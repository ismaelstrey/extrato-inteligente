import crypto from "crypto";

function normalizeDescricao(value: string) {
  const s = value.replace(/\s+/g, " ").trim();
  return s
    .replace(/\s*-?\s*R\$\s*/gi, " ")
    .replace(/\s*-\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function computeTransactionDedupeHash(input: {
  entityId: string;
  date: Date;
  valor: string;
  descricao: string;
  salt?: string;
  sequence?: number;
}) {
  const day = input.date.toISOString().slice(0, 10);
  const normalizedDescricao = normalizeDescricao(input.descricao).toLowerCase();
  const extra =
    input.salt || input.sequence !== undefined ? `|${input.salt ?? ""}|${input.sequence ?? ""}` : "";
  const payload = `${input.entityId}|${day}|${input.valor}|${normalizedDescricao}${extra}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export function normalizeTransactionDescricao(value: string) {
  return normalizeDescricao(value);
}
