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

test("computeTransactionDedupeHash permite diferenciar duplicados com salt/sequence", () => {
  const base = {
    entityId: "e1",
    date: new Date("2026-01-10T00:00:00.000Z"),
    valor: "10.00",
    descricao: "Compra",
  };

  const h1 = computeTransactionDedupeHash(base);
  const h2 = computeTransactionDedupeHash({ ...base, salt: "s1", sequence: 0 });
  const h3 = computeTransactionDedupeHash({ ...base, salt: "s1", sequence: 1 });
  const h4 = computeTransactionDedupeHash({ ...base, salt: "s2", sequence: 0 });

  assert.notEqual(h1, h2);
  assert.notEqual(h2, h3);
  assert.notEqual(h2, h4);
});
