import type { NextRequest } from "next/server";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { reconcileStatement } from "@/server/reconcile/reconcileStatement";

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

  const result = await reconcileStatement(statement.id);
  if (!result.ok) return Response.json({ ok: false, message: "Falha ao reconciliar." }, { status: 500 });

  return Response.json(
    { ok: true, issuesOpen: result.issuesOpen, status: result.status },
    { status: 200 },
  );
}

