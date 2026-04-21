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
  { params }: { params: Promise<{ clientId: string }> },
) {
  const session = await getServerAuthSession();
  const role = session?.user.role;
  if (!session?.user) return Response.json({ ok: false, message: "Não autorizado." }, { status: 401 });
  if (role !== "ADMIN_SAAS") return Response.json({ ok: false, message: "Sem permissão." }, { status: 403 });

  const { clientId } = await params;

  const client = await prisma.client.findFirst({
    where: { id: clientId },
    select: { id: true, nome: true, createdAt: true, updatedAt: true },
  });

  if (!client) return Response.json({ ok: false, message: "Cliente não encontrado." }, { status: 404 });
  return Response.json({ ok: true, client }, { status: 200 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const session = await getServerAuthSession();
  const role = session?.user.role;
  if (!session?.user) return Response.json({ ok: false, message: "Não autorizado." }, { status: 401 });
  if (role !== "ADMIN_SAAS") return Response.json({ ok: false, message: "Sem permissão." }, { status: 403 });

  const parsed = UpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, message: "Payload inválido." }, { status: 400 });

  const { clientId } = await params;
  const client = await prisma.client.findFirst({ where: { id: clientId }, select: { id: true } });
  if (!client) return Response.json({ ok: false, message: "Cliente não encontrado." }, { status: 404 });

  await prisma.client.update({ where: { id: client.id }, data: { nome: parsed.data.nome.trim() } });
  return Response.json({ ok: true }, { status: 200 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const session = await getServerAuthSession();
  const role = session?.user.role;
  if (!session?.user) return Response.json({ ok: false, message: "Não autorizado." }, { status: 401 });
  if (role !== "ADMIN_SAAS") return Response.json({ ok: false, message: "Sem permissão." }, { status: 403 });

  const { clientId } = await params;
  const client = await prisma.client.findFirst({ where: { id: clientId }, select: { id: true } });
  if (!client) return Response.json({ ok: false, message: "Cliente não encontrado." }, { status: 404 });

  try {
    await prisma.client.delete({ where: { id: client.id } });
  } catch (error) {
    const message = String(error);
    if (message.includes("Foreign key") || message.includes("P2003")) {
      return Response.json(
        { ok: false, message: "Cliente possui dados vinculados e não pode ser excluído." },
        { status: 409 },
      );
    }
    throw error;
  }

  return Response.json({ ok: true }, { status: 200 });
}
