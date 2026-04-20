import type { NextRequest } from "next/server";

import { z } from "zod";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const BodySchema = z.object({
  action: z.enum(["resolve", "ignore"]),
});

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ statementId: string; issueId: string }>;
  },
) {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  const userId = session?.user.id;
  if (!clientId || !userId) {
    return Response.json({ ok: false, message: "Não autorizado." }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, message: "Payload inválido." }, { status: 400 });
  }

  const { statementId, issueId } = await params;

  const issue = await prisma.extractionIssue.findFirst({
    where: { id: issueId, statementId },
    select: { id: true, statementId: true, status: true, statement: { select: { clientId: true } } },
  });

  if (!issue || issue.statement.clientId !== clientId) {
    return Response.json({ ok: false, message: "Pendência não encontrada." }, { status: 404 });
  }

  const status = parsed.data.action === "resolve" ? "RESOLVED" : "IGNORED";

  await prisma.extractionIssue.update({
    where: { id: issue.id },
    data: { status, resolvedAt: new Date(), resolvedByUserId: userId },
  });

  const issuesOpen = await prisma.extractionIssue.count({
    where: { statementId, status: "OPEN" },
  });

  const nextStatus = issuesOpen > 0 ? "IN_REVIEW" : "PROCESSED";
  await prisma.statement.update({ where: { id: statementId }, data: { status: nextStatus } });

  return Response.json({ ok: true, issuesOpen, status: nextStatus }, { status: 200 });
}

