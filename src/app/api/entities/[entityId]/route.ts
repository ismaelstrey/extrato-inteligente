import type { NextRequest } from "next/server";

import { z } from "zod";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const UpdateSchema = z.object({
  nome: z.string().min(1).max(120),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ entityId: string }> },
) {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  if (!clientId) return Response.json({ ok: false, message: "Não autorizado." }, { status: 401 });

  const { entityId } = await params;
  const entity = await prisma.entity.findFirst({
    where: { id: entityId, clientId },
    select: { id: true, nome: true, createdAt: true, updatedAt: true },
  });

  if (!entity) return Response.json({ ok: false, message: "Entidade não encontrada." }, { status: 404 });
  return Response.json({ ok: true, entity }, { status: 200 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ entityId: string }> },
) {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  const role = session?.user.role;
  if (!clientId) return Response.json({ ok: false, message: "Não autorizado." }, { status: 401 });
  if (role !== "CLIENT_ADMIN" && role !== "ADMIN_SAAS") {
    return Response.json({ ok: false, message: "Sem permissão." }, { status: 403 });
  }

  const parsed = UpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, message: "Payload inválido." }, { status: 400 });
  }

  const { entityId } = await params;
  const entity = await prisma.entity.findFirst({
    where: { id: entityId, clientId },
    select: { id: true },
  });

  if (!entity) return Response.json({ ok: false, message: "Entidade não encontrada." }, { status: 404 });

  await prisma.entity.update({
    where: { id: entity.id },
    data: { nome: parsed.data.nome.trim() },
  });

  return Response.json({ ok: true }, { status: 200 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ entityId: string }> },
) {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  const role = session?.user.role;
  if (!clientId) return Response.json({ ok: false, message: "Não autorizado." }, { status: 401 });
  if (role !== "CLIENT_ADMIN" && role !== "ADMIN_SAAS") {
    return Response.json({ ok: false, message: "Sem permissão." }, { status: 403 });
  }

  const { entityId } = await params;
  const entity = await prisma.entity.findFirst({
    where: { id: entityId, clientId },
    select: { id: true },
  });

  if (!entity) return Response.json({ ok: false, message: "Entidade não encontrada." }, { status: 404 });

  await prisma.entity.delete({ where: { id: entity.id } });
  return Response.json({ ok: true }, { status: 200 });
}
