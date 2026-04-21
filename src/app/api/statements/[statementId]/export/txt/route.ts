import type { NextRequest } from "next/server";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { inferCompetenciaFromTransactions, toTxtTransactions } from "@/lib/dashboard/transactionExports";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
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
    tipo: t.tipo,
    valor: Number(t.valor.toString()),
  }));

  const competencia = inferCompetenciaFromTransactions(rows);
  const txt = toTxtTransactions({ rows, competencia, contaBanco: "8" });

  const safeEntity = (statement.entity.nome || "empresa").replaceAll(/\s+/g, "-");
  const safeBank = (statement.template?.nome ?? "banco").replaceAll(/\s+/g, "-");

  return new Response(txt, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="extrato-${safeEntity}-${safeBank}-${statement.id}.txt"`,
    },
  });
}
