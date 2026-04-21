import assert from "node:assert/strict";
import test from "node:test";

import {
  filterTransactions,
  inferCompetenciaFromTransactions,
  sortTransactions,
  toCsvTransactions,
  toTxtTransactions,
} from "@/lib/dashboard/transactionExports";

test("filterTransactions filtra por tipo e mantém TODOS", () => {
  const rows = [
    { id: "1", date: "2026-02-18", descricao: "A", tipo: "ENTRADA" as const, valor: 10 },
    { id: "2", date: "2026-02-18", descricao: "B", tipo: "SAIDA" as const, valor: 5 },
  ];

  assert.equal(filterTransactions(rows, "TODOS").length, 2);
  assert.deepEqual(filterTransactions(rows, "ENTRADA").map((r) => r.id), ["1"]);
  assert.deepEqual(filterTransactions(rows, "SAIDA").map((r) => r.id), ["2"]);
});

test("sortTransactions ordena por data e valor", () => {
  const rows = [
    { id: "2", date: "2026-02-19", descricao: "B", tipo: "ENTRADA" as const, valor: 5 },
    { id: "1", date: "2026-02-18", descricao: "A", tipo: "SAIDA" as const, valor: 10 },
  ];

  assert.deepEqual(sortTransactions(rows, "DATA_ASC").map((r) => r.id), ["1", "2"]);
  assert.deepEqual(sortTransactions(rows, "DATA_DESC").map((r) => r.id), ["2", "1"]);
  assert.deepEqual(sortTransactions(rows, "VALOR_ASC").map((r) => r.id), ["2", "1"]);
  assert.deepEqual(sortTransactions(rows, "VALOR_DESC").map((r) => r.id), ["1", "2"]);
});

test("inferCompetenciaFromTransactions usa 01/MM/AAAA da primeira data", () => {
  const rows = [{ id: "1", date: "2026-02-18", descricao: "A", tipo: "ENTRADA" as const, valor: 1 }];
  assert.equal(inferCompetenciaFromTransactions(rows), "01/02/2026");
});

test("toTxtTransactions segue padrão Cabeçalho/Lançamentos e preenche débito/crédito", () => {
  const rows = [
    { id: "1", date: "2026-02-18", descricao: "Deposito", tipo: "ENTRADA" as const, valor: 100 },
    { id: "2", date: "2026-02-18", descricao: "Doc.", tipo: "SAIDA" as const, valor: 5 },
  ];

  const txt = toTxtTransactions({ rows, competencia: "01/02/2026", contaBanco: "8" });
  const lines = txt.split(/\r?\n/).filter(Boolean);
  assert.equal(lines.length, 6);
  for (const l of lines) {
    assert.equal(l.length, 240);
    assert.equal(Buffer.byteLength(l, "utf8"), 240);
  }
  assert.ok(lines[0].startsWith("Cabecalho;;;;;"));
  assert.ok(lines[1].startsWith("Competencia;01/02/2026;Conta Banco;8;Saldo Inicial;0"));
  assert.ok(lines[2].startsWith("Lancamentos;;;;;"));
  assert.ok(lines[3].startsWith("Data;Historico;Documento;Valor Debito (Soma);Valor Credito (Subtrai);"));
  assert.ok(lines[4].startsWith("18/02/2026;Deposito;1;100;;"));
  assert.ok(lines[5].startsWith("18/02/2026;Doc.;2;;5;"));
});

test("toCsvTransactions inclui cabeçalho e escapa aspas na descrição", () => {
  const rows = [{ id: "1", date: "2026-02-18", descricao: 'Teste "A"', tipo: "ENTRADA" as const, valor: 1.5 }];
  const csv = toCsvTransactions(rows);
  assert.match(csv, /^data,descricao,tipo,valor$/m);
  assert.match(csv, /2026-02-18,"Teste ""A""",ENTRADA,1,50/m);
});
