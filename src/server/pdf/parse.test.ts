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
  assert.ok(out.every((t) => !/(?:^|\s)-?R\$(?:\s|$)/i.test(t.descricao)));
  assert.ok(out.some((t) => t.data.toISOString().slice(0, 10) === "2026-01-01" && t.valor === "0.02"));
  assert.ok(out.some((t) => t.data.toISOString().slice(0, 10) === "2026-01-02" && t.tipo === "SAIDA"));
  assert.ok(out.some((t) => t.data.toISOString().slice(0, 10) === "2026-01-03" && t.tipo === "ENTRADA"));
});

test("parseTransactionsFromText permite gerar dedupeHash diferente quando allowDuplicates=true", () => {
  const template = {
    id: "t5",
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
    "01/01/2026 Compra R$ 10,00",
    "01/01/2026 Compra R$ 10,00",
  ].join("\n");

  const a = parseTransactionsFromText({ text, template, entityId: "e1" });
  assert.equal(a.length, 2);
  assert.equal(a[0].dedupeHash, a[1].dedupeHash);

  const b = parseTransactionsFromText({
    text,
    template,
    entityId: "e1",
    allowDuplicates: true,
    dedupeSalt: "statement-1",
  });
  assert.equal(b.length, 2);
  assert.notEqual(b[0].dedupeHash, b[1].dedupeHash);
});

test("parseTransactionsFromText (BANRISUL) suporta MOVIMENTOS MMM/AAAA e linhas sem dia usando dia corrente", () => {
  const template = {
    id: "t6",
    nome: "Banrisul",
    identificador: "BANRISUL",
    regexData: "^(\\d{1,2})\\b",
    regexValor: "([0-9]{1,3}(?:\\.[0-9]{3})*,[0-9]{2}-?)$",
    regexDescricao:
      "^\\s*\\d{1,2}\\s+(.+?)\\s+[0-9A-Za-z]+\\s+[0-9]{1,3}(?:\\.[0-9]{3})*,[0-9]{2}-?$",
    clientId: "c1",
    createdAt: new Date(),
    updatedAt: new Date(),
  } satisfies Template;

  const text = [
    "++ MOVIMENTOS MAR/2026",
    "02 REND CDB AUT 0000RC 0,02",
    "VERO DEB BLF 516261 98,90",
    "PIX RECEBIDO 081049 300,00",
    "NOME: BRUNA MAIARA RODRIGUES DE OLIVEIRA",
    "PIX ENVIADO 474432 180,00-",
    "NOME: JOAO CANDIDO MAZUHI NORONHA",
    "SALDO NA DATA 135,43",
  ].join("\n");

  const out = parseTransactionsFromText({ text, template, entityId: "e1" });
  assert.equal(out.length, 4);

  assert.equal(out[0].data.toISOString().slice(0, 10), "2026-03-02");
  assert.equal(out[0].tipo, "ENTRADA");
  assert.equal(out[0].valor, "0.02");

  assert.equal(out[1].data.toISOString().slice(0, 10), "2026-03-02");
  assert.equal(out[1].tipo, "ENTRADA");
  assert.equal(out[1].valor, "98.90");

  assert.equal(out[2].data.toISOString().slice(0, 10), "2026-03-02");
  assert.equal(out[2].tipo, "ENTRADA");
  assert.equal(out[2].valor, "300.00");
  assert.match(out[2].descricao, /BRUNA/i);

  assert.equal(out[3].data.toISOString().slice(0, 10), "2026-03-02");
  assert.equal(out[3].tipo, "SAIDA");
  assert.equal(out[3].valor, "180.00");
  assert.match(out[3].descricao, /JOAO/i);
});
