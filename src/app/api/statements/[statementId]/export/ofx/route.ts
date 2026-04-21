import type { NextRequest } from "next/server";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { TransactionTipo } from "@/lib/dashboard/transactionExports";
import { toOfxSgml } from "@/lib/ofx/ofxExport";

export const runtime = "nodejs";

function inferBankIdFromTemplateName(name: string | null | undefined) {
  const n = (name ?? "").toUpperCase();
  if (n.includes("SICREDI")) return "748";
  if (n.includes("BANRISUL")) return "041";
  if (n.includes("UNICRED")) return "136";
  if (n.includes("PAG") || n.includes("PAGBANK") || n.includes("PAGSEGURO")) return "290";
  return "0";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ statementId: string }> },
) {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  if (!clientId) return Response.json({ ok: false, message: "Não autorizado." }, { status: 401 });

  const { statementId } = await params;

  const statement = await prisma.statement.findFirst({
    where: { id: statementId, clientId },
    select: {
      id: true,
      status: true,
      periodStart: true,
      periodEnd: true,
      entity: { select: { nome: true } },
      template: { select: { nome: true } },
    },
  });

  if (!statement) return Response.json({ ok: false, message: "Extrato não encontrado." }, { status: 404 });
  if (statement.status !== "APPROVED" && statement.status !== "EXPORTED") {
    return Response.json({ ok: false, message: "Extrato precisa estar aprovado." }, { status: 400 });
  }

  const transactions = await prisma.transaction.findMany({
    where: { statementId: statement.id },
    orderBy: [{ data: "asc" }, { id: "asc" }],
    select: { id: true, data: true, descricao: true, tipo: true, valor: true },
  });

  const rows = transactions.map((t) => ({
    id: t.id,
    date: t.data.toISOString().slice(0, 10),
    descricao: t.descricao,
    tipo: t.tipo as TransactionTipo,
    valor: Number(t.valor.toString()),
  }));

  const bankId =
    request.nextUrl.searchParams.get("bankId") ?? inferBankIdFromTemplateName(statement.template?.nome);
  const acctId = request.nextUrl.searchParams.get("acctId") ?? "0";

  const dtStart = statement.periodStart ? statement.periodStart.toISOString().slice(0, 10) : undefined;
  const dtEnd = statement.periodEnd ? statement.periodEnd.toISOString().slice(0, 10) : undefined;

  const org = statement.template?.nome ?? statement.entity.nome ?? "EXTRATO";
  const fid = statement.template?.nome ?? statement.entity.nome ?? "EXTRATO";

  const ofx = toOfxSgml({
    rows,
    bankId,
    acctId,
    org,
    fid,
    dtStart,
    dtEnd,
  });

  const safeEntity = (statement.entity.nome || "empresa").replaceAll(/\s+/g, "-");
  const safeBank = (statement.template?.nome ?? "banco").replaceAll(/\s+/g, "-");

  return new Response(ofx, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ofx; charset=us-ascii",
      "Content-Disposition": `attachment; filename="extrato-${safeEntity}-${safeBank}-${statement.id}.ofx"`,
    },
  });
}

