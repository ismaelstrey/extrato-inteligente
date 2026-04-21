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

test("parseTransactionsFromText extrai BANRISUL (MOVIMENTOS MMM/AAAA) com dia do mês e linhas NOME:", () => {
  const template = {
    id: "t4",
    nome: "Banrisul",
    identificador: "BANRISUL",
    regexData: "^(\\d{1,2})\\b",
    regexValor: "([0-9]{1,3}(?:\\.[0-9]{3})*,[0-9]{2}-?)$",
    regexDescricao: "",
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
  assert.match(out[0].descricao, /REND/i);

  assert.equal(out[1].data.toISOString().slice(0, 10), "2026-03-02");
  assert.equal(out[1].tipo, "SAIDA");
  assert.equal(out[1].valor, "98.90");
  assert.match(out[1].descricao, /VERO DEB/i);

  assert.equal(out[2].data.toISOString().slice(0, 10), "2026-03-02");
  assert.equal(out[2].tipo, "ENTRADA");
  assert.equal(out[2].valor, "300.00");
  assert.match(out[2].descricao, /PIX RECEBIDO/i);
  assert.match(out[2].descricao, /NOME:\s*BRUNA/i);

  assert.equal(out[3].data.toISOString().slice(0, 10), "2026-03-02");
  assert.equal(out[3].tipo, "SAIDA");
  assert.equal(out[3].valor, "180.00");
  assert.match(out[3].descricao, /PIX ENVIADO/i);
  assert.match(out[3].descricao, /NOME:\s*JOAO/i);
});
