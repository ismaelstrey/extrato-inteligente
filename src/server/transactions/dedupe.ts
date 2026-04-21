import crypto from "crypto";

function normalizeDescricao(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function computeTransactionDedupeHash(input: {
  entityId: string;
  date: Date;
  valor: string;
  descricao: string;
}) {
  const day = input.date.toISOString().slice(0, 10);
  const normalizedDescricao = normalizeDescricao(input.descricao).toLowerCase();
  const payload = `${input.entityId}|${day}|${input.valor}|${normalizedDescricao}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export function normalizeTransactionDescricao(value: string) {
  return normalizeDescricao(value);
}
