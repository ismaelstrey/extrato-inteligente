import assert from "node:assert/strict";
import test from "node:test";

import type { Template } from "@prisma/client";

import { parseTransactionsFromText } from "@/server/pdf/parse";

test("parseTransactionsFromText extrai data/valor/descricao e gera dedupeHash", () => {
  const template = {
    id: "t1",
    nome: "Teste",
    identificador: "BANCO",
    regexData: "^(\\d{2}\\/\\d{2}\\/\\d{4})",
    regexValor: "R\\$\\s*([0-9\\.,]+-?)",
    regexDescricao: "^\\d{2}\\/\\d{2}\\/\\d{4}\\s+(.+?)\\s+R\\$\\s*[0-9\\.,]+-?$",
    clientId: "c1",
    createdAt: new Date(),
    updatedAt: new Date(),
  } satisfies Template;

  const text = [
    "BANCO",
    "01/01/2026 Compra padaria R$ 10,00",
    "02/01/2026 Pix enviado R$ 5,50-",
  ].join("\n");

  const out = parseTransactionsFromText({ text, template, entityId: "e1" });

  assert.equal(out.length, 2);
  assert.equal(out[0].data.toISOString().slice(0, 10), "2026-01-01");
  assert.equal(out[0].valor, "10.00");
  assert.equal(out[0].tipo, "ENTRADA");
  assert.equal(out[0].descricao, "Compra padaria");
  assert.ok(out[0].dedupeHash.length >= 32);

  assert.equal(out[1].data.toISOString().slice(0, 10), "2026-01-02");
  assert.equal(out[1].valor, "5.50");
  assert.equal(out[1].tipo, "SAIDA");
  assert.equal(out[1].descricao, "Pix enviado");
  assert.ok(out[1].dedupeHash.length >= 32);
});
