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
  const role = session?.user.role;
  if (!session?.user) return Response.json({ ok: false, message: "Não autorizado." }, { status: 401 });
  if (role !== "ADMIN_SAAS") return Response.json({ ok: false, message: "Sem permissão." }, { status: 403 });

  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, nome: true, createdAt: true, updatedAt: true, _count: { select: { users: true, entities: true } } },
  });

  return Response.json({ ok: true, clients }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession();
  const role = session?.user.role;
  if (!session?.user) return Response.json({ ok: false, message: "Não autorizado." }, { status: 401 });
  if (role !== "ADMIN_SAAS") return Response.json({ ok: false, message: "Sem permissão." }, { status: 403 });

  const parsed = CreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, message: "Payload inválido." }, { status: 400 });

  const client = await prisma.client.create({
    data: { nome: parsed.data.nome.trim() },
    select: { id: true },
  });

  return Response.json({ ok: true, id: client.id }, { status: 201 });
}
