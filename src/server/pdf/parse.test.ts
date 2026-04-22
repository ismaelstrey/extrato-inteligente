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

test("parseTransactionsFromText reconstrói valor quebrado em linha (ex: 5.\\n085,00) e extrai PIX", () => {
  const template = {
    id: "t2",
    nome: "Unicred",
    identificador: "UNICRED",
    regexData: "^(\\d{2}\\/\\d{2}\\/\\d{4})",
    regexValor:
      "\\s(-?[0-9]{1,3}(?:\\.[0-9]{3})*,[0-9]{2})\\s+[0-9]{1,3}(?:\\.[0-9]{3})*,[0-9]{2}\\s*$",
    regexDescricao:
      "^\\d{2}\\/\\d{2}\\/\\d{4}\\s+(.+?)\\s+-?[0-9]{1,3}(?:\\.[0-9]{3})*,[0-9]{2}\\s+[0-9]{1,3}(?:\\.[0-9]{3})*,[0-9]{2}\\s*$",
    clientId: "c1",
    createdAt: new Date(),
    updatedAt: new Date(),
  } satisfies Template;

  const text = [
    "LANÇAMENTOS (R$) SALDO (R$)",
    "07/01/2026 CRED PIX CRED RECEBIMENTO PIX(DIAGNOVA DIAGNOSTICOS MEDICOS LTDA.) 5.",
    "085,00 5.115,16",
    "07/01/2026 DEB PIX DEBITO TRANSF PIX(JESSICA GONCALVES) -5.000,00 115,16",
  ].join("\n");

  const out = parseTransactionsFromText({ text, template, entityId: "e1" });

  assert.equal(out.length, 2);
  assert.equal(out[0].data.toISOString().slice(0, 10), "2026-01-07");
  assert.equal(out[0].tipo, "ENTRADA");
  assert.equal(out[0].valor, "5085.00");
  assert.match(out[0].descricao, /DIAGNOVA/i);

  assert.equal(out[1].data.toISOString().slice(0, 10), "2026-01-07");
  assert.equal(out[1].tipo, "SAIDA");
  assert.equal(out[1].valor, "5000.00");
});

test("parseTransactionsFromText separa duas transações na mesma linha quando há duas datas", () => {
  const template = {
    id: "t3",
    nome: "Unicred",
    identificador: "UNICRED",
    regexData: "^(\\d{2}\\/\\d{2}\\/\\d{4})",
    regexValor:
      "\\s(-?[0-9]{1,3}(?:\\.[0-9]{3})*,[0-9]{2})\\s+[0-9]{1,3}(?:\\.[0-9]{3})*,[0-9]{2}\\s*$",
    regexDescricao:
      "^\\d{2}\\/\\d{2}\\/\\d{4}\\s+(.+?)\\s+-?[0-9]{1,3}(?:\\.[0-9]{3})*,[0-9]{2}\\s+[0-9]{1,3}(?:\\.[0-9]{3})*,[0-9]{2}\\s*$",
    clientId: "c1",
    createdAt: new Date(),
    updatedAt: new Date(),
  } satisfies Template;

  const text =
    "07/01/2026 CRED PIX RECEBIMENTO PIX(DIAGNOVA) 5.085,00 5.115,16 07/01/2026 DEB PIX TRANSF PIX(JESSICA) -5.000,00 115,16";

  const out = parseTransactionsFromText({ text, template, entityId: "e1" });

  assert.equal(out.length, 2);
  assert.equal(out[0].tipo, "ENTRADA");
  assert.equal(out[0].valor, "5085.00");
  assert.equal(out[1].tipo, "SAIDA");
  assert.equal(out[1].valor, "5000.00");
});

test('parseTransactionsFromText (PAGBANK) ignora "Saldo do dia" e mantém apenas movimentações', () => {
  const template = {
    id: "t4",
    nome: "PAGBANK",
    identificador: "PAGBANK",
    regexData: "^(\\d{2}\\/\\d{2}\\/\\d{4})",
    regexValor: "R\\$\\s*([0-9\\.,]+-?)",
    regexDescricao: "^\\d{2}\\/\\d{2}\\/\\d{4}\\s+(.+?)\\s+R\\$\\s*[0-9\\.,]+-?$",
    clientId: "c1",
    createdAt: new Date(),
    updatedAt: new Date(),
  } satisfies Template;

  const text = [
    "PAGBANK",
    "Saldo do dia 01/01/2026 R$ 1.234,56",
    "01/01/2026 Rendimento da conta R$ 0,02",
    "02/01/2026 QR Code Pix enviado - Mercado X -R$ R$ 10,00-",
    "-- 1 of 9 -- Descrição Data Valor",
    "03/01/2026 Vendas - Disponivel CREDITO VISA R$ 33,25",
  ].join("\n");

  const out = parseTransactionsFromText({ text, template, entityId: "e1" });

  assert.ok(out.length >= 3);
  assert.ok(out.every((t) => !/saldo do dia/i.test(t.descricao)));
  assert.ok(out.some((t) => t.data.toISOString().slice(0, 10) === "2026-01-01" && t.valor === "0.02"));
  assert.ok(out.some((t) => t.data.toISOString().slice(0, 10) === "2026-01-02" && t.tipo === "SAIDA"));
  assert.ok(out.some((t) => t.data.toISOString().slice(0, 10) === "2026-01-03" && t.tipo === "ENTRADA"));
});
