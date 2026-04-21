import type { NextRequest } from "next/server";

import { z } from "zod";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const QuerySchema = z.object({
  entityId: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  if (!clientId) return Response.json({ ok: false, message: "Não autorizado." }, { status: 401 });

  const url = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    entityId: url.searchParams.get("entityId") ?? "",
  });
  if (!parsed.success) {
    return Response.json({ ok: false, message: "Parâmetros inválidos." }, { status: 400 });
  }

  const entity = await prisma.entity.findFirst({
    where: { id: parsed.data.entityId, clientId },
    select: { id: true },
  });
  if (!entity) {
    return Response.json({ ok: false, message: "Empresa inválida." }, { status: 404 });
  }

  const usedTemplateIds = await prisma.transaction.findMany({
    where: { entityId: entity.id, templateId: { not: null } },
    distinct: ["templateId"],
    select: { templateId: true },
  });

  const templateIds = usedTemplateIds.map((t) => t.templateId).filter(Boolean) as string[];
  if (!templateIds.length) {
    return Response.json({ ok: true, banks: [] }, { status: 200 });
  }

  const banks = await prisma.template.findMany({
    where: { clientId, id: { in: templateIds } },
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });

  return Response.json({ ok: true, banks }, { status: 200 });
}

