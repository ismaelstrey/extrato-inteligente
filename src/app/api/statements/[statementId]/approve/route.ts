import type { NextRequest } from "next/server";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ statementId: string }> },
) {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  if (!clientId) return Response.json({ ok: false, message: "Não autorizado." }, { status: 401 });

  const { statementId } = await params;

  const statement = await prisma.statement.findFirst({
    where: { id: statementId, clientId },
    select: { id: true },
  });

  if (!statement) return Response.json({ ok: false, message: "Extrato não encontrado." }, { status: 404 });

  const highOpen = await prisma.extractionIssue.count({
    where: { statementId: statement.id, status: "OPEN", severity: "HIGH" },
  });

  if (highOpen > 0) {
    return Response.json(
      { ok: false, message: "Existem pendências críticas abertas." },
      { status: 400 },
    );
  }

  await prisma.statement.update({
    where: { id: statement.id },
    data: { status: "APPROVED" },
  });

  return Response.json({ ok: true }, { status: 200 });
}

