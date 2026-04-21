import assert from "node:assert/strict";
import test from "node:test";

import {
  inferCompetenciaFromRows,
  mergeDailyTotals,
  toCsvDailyTotals,
  toTxtDailyTotals,
} from "@/lib/dashboard/dailyTotals";

test("mergeDailyTotals combina entrada/saída por data e ordena", () => {
  const merged = mergeDailyTotals({
    entrada: [
      { date: "2026-01-02", total: 10 },
      { date: "2026-01-01", total: 5 },
    ],
    saida: [
      { date: "2026-01-01", total: 2 },
      { date: "2026-01-03", total: 7 },
    ],
  });

  assert.deepEqual(merged, [
    { date: "2026-01-01", entrada: 5, saida: 2 },
    { date: "2026-01-02", entrada: 10, saida: 0 },
    { date: "2026-01-03", entrada: 0, saida: 7 },
  ]);
});

test("inferCompetenciaFromRows usa o primeiro dia como 01/MM/AAAA", () => {
  assert.equal(
    inferCompetenciaFromRows({
      entrada: [{ date: "2026-03-15", total: 1 }],
      saida: [],
    }),
    "01/03/2026",
  );
  assert.equal(
    inferCompetenciaFromRows({
      entrada: [],
      saida: [{ date: "2026-12-31", total: 1 }],
    }),
    "01/12/2026",
  );
});

test("toCsvDailyTotals exporta CSV com base no filtro", () => {
  const entrada = [
    { date: "2026-01-01", total: 5 },
    { date: "2026-01-02", total: 10.5 },
  ];
  const saida = [{ date: "2026-01-01", total: 2 }];

  const csvEntrada = toCsvDailyTotals({ filter: "ENTRADA", entrada, saida });
  assert.match(csvEntrada, /^data,valor_total_dia/m);
  assert.match(csvEntrada, /2026-01-02,10,50/m);

  const csvTodos = toCsvDailyTotals({ filter: "TODOS", entrada, saida });
  assert.match(csvTodos, /^data,entrada_total_dia,saida_total_dia/m);
  assert.match(csvTodos, /2026-01-01,5,00,2,00/m);
});

test("toTxtDailyTotals exporta TXT no formato solicitado e preenche débito/crédito conforme filtro", () => {
  const entrada = [{ date: "2026-01-01", total: 5 }];
  const saida = [{ date: "2026-01-01", total: 2 }];

  const txtSaida = toTxtDailyTotals({
    filter: "SAIDA",
    entrada,
    saida,
    competencia: "01/01/2026",
    contaBanco: "8",
  });
  assert.match(txtSaida, /^Cabecalho;;;;;$/m);
  assert.match(txtSaida, /^Competencia;01\/01\/2026;Conta Banco;8;Saldo Inicial;0$/m);
  assert.match(txtSaida, /^Lancamentos;;;;;$/m);
  assert.match(
    txtSaida,
    /^01\/01\/2026;Total saídas;;;2;$/m,
  );

  const txtTodos = toTxtDailyTotals({
    filter: "TODOS",
    entrada,
    saida,
    competencia: "01/01/2026",
    contaBanco: "8",
  });
  assert.match(
    txtTodos,
    /^01\/01\/2026;Totais do dia;;5;2;$/m,
  );
});
