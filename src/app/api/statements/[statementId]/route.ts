import type { NextRequest } from "next/server";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ statementId: string }> },
) {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  const role = session?.user.role;
  if (!clientId) return Response.json({ ok: false, message: "Não autorizado." }, { status: 401 });
  if (role !== "CLIENT_ADMIN" && role !== "ADMIN_SAAS") {
    return Response.json({ ok: false, message: "Sem permissão." }, { status: 403 });
  }

  const { statementId } = await params;

  const statement = await prisma.statement.findFirst({
    where: { id: statementId, clientId },
    select: { id: true },
  });

  if (!statement) return Response.json({ ok: false, message: "Extrato não encontrado." }, { status: 404 });

  await prisma.$transaction([
    prisma.transaction.deleteMany({ where: { statementId: statement.id } }),
    prisma.statement.delete({ where: { id: statement.id } }),
  ]);

  return Response.json({ ok: true }, { status: 200 });
}

