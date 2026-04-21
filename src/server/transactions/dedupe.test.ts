import assert from "node:assert/strict";
import test from "node:test";

import { computeTransactionDedupeHash } from "@/server/transactions/dedupe";

test("computeTransactionDedupeHash normaliza espaços na descrição", () => {
  const entityId = "e1";
  const date = new Date("2026-01-10T00:00:00.000Z");
  const valor = "10.00";

  const a = computeTransactionDedupeHash({
    entityId,
    date,
    valor,
    descricao: "Pix   enviado   -   Fulano",
  });
  const b = computeTransactionDedupeHash({
    entityId,
    date,
    valor,
    descricao: "Pix enviado - Fulano",
  });

  assert.equal(a, b);
});

test("computeTransactionDedupeHash muda com entidade/data/valor", () => {
  const base = {
    entityId: "e1",
    date: new Date("2026-01-10T00:00:00.000Z"),
    valor: "10.00",
    descricao: "Compra",
  };

  const h1 = computeTransactionDedupeHash(base);
  const h2 = computeTransactionDedupeHash({ ...base, valor: "11.00" });
  const h3 = computeTransactionDedupeHash({ ...base, entityId: "e2" });
  const h4 = computeTransactionDedupeHash({ ...base, date: new Date("2026-01-11T00:00:00.000Z") });

  assert.notEqual(h1, h2);
  assert.notEqual(h1, h3);
  assert.notEqual(h1, h4);
});
