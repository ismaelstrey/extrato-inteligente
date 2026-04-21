import assert from "node:assert/strict";
import test from "node:test";

import { toOfxSgml } from "@/lib/ofx/ofxExport";

test("toOfxSgml gera OFX SGML no modelo Sicredi (campos e ordem principais)", () => {
  const ofx = toOfxSgml({
    bankId: "748",
    acctId: "1090000000025136",
    org: "C.C.P.I. CAMINHO DAS AGUAS",
    fid: "C.C.P.I. CAMINHO DAS AGUAS",
    rows: [
      {
        id: "tx-1",
        date: "2024-01-02",
        descricao: "LIQUIDACAO BOLETO",
        tipo: "SAIDA",
        valor: 1815.04,
      },
      {
        id: "tx-2",
        date: "2024-01-03",
        descricao: "LIQ.COBRANCA SIMPLES",
        tipo: "ENTRADA",
        valor: 4468.18,
      },
    ],
    dtStart: "2024-01-01",
    dtEnd: "2024-01-31",
  });

  assert.ok(ofx.startsWith("OFXHEADER:100\r\nDATA:OFXSGML\r\nVERSION:102\r\n"));
  assert.match(ofx, /<BANKID>748<\/BANKID>/);
  assert.match(ofx, /<ACCTID>1090000000025136<\/ACCTID>/);
  assert.match(ofx, /<DTSTART>20240101000000\[-3:GMT\]<\/DTSTART>/);
  assert.match(ofx, /<DTEND>20240131000000\[-3:GMT\]<\/DTEND>/);

  const idxStart = ofx.indexOf("<BANKTRANLIST>");
  const idxFirstTrn = ofx.indexOf("<STMTTRN>", idxStart);
  const idxSecondTrn = ofx.indexOf("<STMTTRN>", idxFirstTrn + 1);
  assert.ok(idxStart > 0);
  assert.ok(idxFirstTrn > idxStart);
  assert.ok(idxSecondTrn > idxFirstTrn);

  assert.match(
    ofx,
    /<STMTTRN>\r\n<TRNTYPE>DEBIT<\/TRNTYPE>\r\n<DTPOSTED>20240102000000\[-3:GMT\]<\/DTPOSTED>\r\n<TRNAMT>-1815\.04<\/TRNAMT>[\s\S]*?<MEMO>LIQUIDACAO BOLETO<\/MEMO>\r\n<\/STMTTRN>/,
  );
  assert.match(
    ofx,
    /<STMTTRN>\r\n<TRNTYPE>CREDIT<\/TRNTYPE>\r\n<DTPOSTED>20240103000000\[-3:GMT\]<\/DTPOSTED>\r\n<TRNAMT>4468\.18<\/TRNAMT>[\s\S]*?<MEMO>LIQ\.COBRANCA SIMPLES<\/MEMO>\r\n<\/STMTTRN>/,
  );

  for (let i = 0; i < ofx.length; i += 1) assert.ok(ofx.charCodeAt(i) <= 0x7f);
});

