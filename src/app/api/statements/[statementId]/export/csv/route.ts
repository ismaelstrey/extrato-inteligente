import type { NextRequest } from "next/server";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function csvCell(value: string) {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

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
      periodStart: true,
      periodEnd: true,
    },
  });

  if (!statement) return Response.json({ ok: false, message: "Extrato não encontrado." }, { status: 404 });
  if (statement.status !== "APPROVED" && statement.status !== "EXPORTED") {
    return Response.json({ ok: false, message: "Extrato precisa estar aprovado." }, { status: 400 });
  }

  const transactions = await prisma.transaction.findMany({
    where: { statementId: statement.id },
    orderBy: { data: "asc" },
    select: { data: true, descricao: true, categoria: true, tipo: true, valor: true },
  });

  const header = [
    "data",
    "descricao",
    "categoria",
    "tipo",
    "valor",
    "valor_assinado",
    "entidade",
    "template",
    "periodo_inicio",
    "periodo_fim",
  ].join(";");

  const body = transactions
    .map((t) => {
      const date = t.data.toISOString().slice(0, 10);
      const valor = String(t.valor);
      const signed = t.tipo === "SAIDA" ? `-${valor}` : valor;
      const periodStart = statement.periodStart ? statement.periodStart.toISOString().slice(0, 10) : "";
      const periodEnd = statement.periodEnd ? statement.periodEnd.toISOString().slice(0, 10) : "";

      return [
        csvCell(date),
        csvCell(t.descricao),
        csvCell(t.categoria),
        csvCell(t.tipo),
        csvCell(valor),
        csvCell(signed),
        csvCell(statement.entity.nome),
        csvCell(statement.template?.nome ?? ""),
        csvCell(periodStart),
        csvCell(periodEnd),
      ].join(";");
    })
    .join("\n");

  const csv = `${header}\n${body}\n`;

  await prisma.statement.update({
    where: { id: statement.id },
    data: { status: "EXPORTED" },
  });

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="extrato-${statement.id}.csv"`,
    },
  });
}

