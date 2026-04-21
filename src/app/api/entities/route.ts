import type { NextRequest } from "next/server";

import { z } from "zod";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const CreateSchema = z.object({
  nome: z.string().min(1).max(120),
});

export async function GET() {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  if (!clientId) return Response.json({ ok: false, message: "Não autorizado." }, { status: 401 });

  const entities = await prisma.entity.findMany({
    where: { clientId },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, createdAt: true, updatedAt: true },
  });

  return Response.json({ ok: true, entities }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  const role = session?.user.role;
  if (!clientId) return Response.json({ ok: false, message: "Não autorizado." }, { status: 401 });
  if (role !== "CLIENT_ADMIN" && role !== "ADMIN_SAAS") {
    return Response.json({ ok: false, message: "Sem permissão." }, { status: 403 });
  }

  const parsed = CreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, message: "Payload inválido." }, { status: 400 });
  }

  const entity = await prisma.entity.create({
    data: { clientId, nome: parsed.data.nome.trim() },
    select: { id: true },
  });

  return Response.json({ ok: true, id: entity.id }, { status: 201 });
}
