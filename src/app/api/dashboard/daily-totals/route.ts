import type { NextRequest } from "next/server";

import { Prisma, TransactionType } from "@prisma/client";
import { z } from "zod";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const QuerySchema = z.object({
  entityId: z.string().min(1),
  templateId: z.string().min(1),
  tipo: z.nativeEnum(TransactionType),
});

export async function GET(request: NextRequest) {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  if (!clientId) return Response.json({ ok: false, message: "Não autorizado." }, { status: 401 });

  const url = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    entityId: url.searchParams.get("entityId") ?? "",
    templateId: url.searchParams.get("templateId") ?? "",
    tipo: url.searchParams.get("tipo") ?? "",
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

  const template = await prisma.template.findFirst({
    where: { id: parsed.data.templateId, clientId },
    select: { id: true },
  });
  if (!template) {
    return Response.json({ ok: false, message: "Banco inválido." }, { status: 404 });
  }

  const rows = await prisma.$queryRaw<
    { date: Date; total: Prisma.Decimal | number | string | null }[]
  >(Prisma.sql`
    SELECT
      (t."data" AT TIME ZONE 'UTC')::date AS "date",
      COALESCE(SUM(t."valor"), 0) AS "total"
    FROM "Transaction" t
    JOIN "Entity" e ON e.id = t."entityId"
    WHERE
      e."clientId" = ${clientId}
      AND t."entityId" = ${entity.id}
      AND t."templateId" = ${template.id}
      AND t."tipo" = ${parsed.data.tipo}::"TransactionType"
    GROUP BY 1
    ORDER BY 1 ASC
  `);

  const totals = rows.map((r) => ({
    date: r.date.toISOString().slice(0, 10),
    total: Number(r.total ?? 0),
  }));

  return Response.json({ ok: true, totals }, { status: 200 });
}

