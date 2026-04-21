import type { NextRequest } from "next/server";

import bcrypt from "bcryptjs";
import { z } from "zod";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const UpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  role: z.enum(["CLIENT_ADMIN", "USER", "ADMIN_SAAS"]).optional(),
  active: z.boolean().optional(),
  twoFactorEnabled: z.boolean().optional(),
  password: z.string().min(6).max(200).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  const role = session?.user.role;
  if (!session?.user || !clientId) return Response.json({ ok: false, message: "Não autorizado." }, { status: 401 });
  if (role !== "CLIENT_ADMIN" && role !== "ADMIN_SAAS") {
    return Response.json({ ok: false, message: "Sem permissão." }, { status: 403 });
  }

  const { userId } = await params;

  const user = await prisma.user.findFirst({
    where: role === "ADMIN_SAAS" ? { id: userId } : { id: userId, clientId },
    select: { id: true, email: true, name: true, role: true, active: true, twoFactorEnabled: true, createdAt: true, updatedAt: true, clientId: true },
  });

  if (!user) return Response.json({ ok: false, message: "Usuário não encontrado." }, { status: 404 });
  if (role !== "ADMIN_SAAS") {
    return Response.json(
      {
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          active: user.active,
          twoFactorEnabled: user.twoFactorEnabled,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
      { status: 200 },
    );
  }

  return Response.json({ ok: true, user }, { status: 200 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  const role = session?.user.role;
  if (!session?.user || !clientId) return Response.json({ ok: false, message: "Não autorizado." }, { status: 401 });
  if (role !== "CLIENT_ADMIN" && role !== "ADMIN_SAAS") {
    return Response.json({ ok: false, message: "Sem permissão." }, { status: 403 });
  }

  const parsed = UpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, message: "Payload inválido." }, { status: 400 });

  const { userId } = await params;

  const user = await prisma.user.findFirst({
    where: role === "ADMIN_SAAS" ? { id: userId } : { id: userId, clientId },
    select: { id: true, role: true, clientId: true },
  });
  if (!user) return Response.json({ ok: false, message: "Usuário não encontrado." }, { status: 404 });

  if (parsed.data.role) {
    if (role !== "ADMIN_SAAS" && parsed.data.role === "ADMIN_SAAS") {
      return Response.json({ ok: false, message: "Sem permissão para promover a ADMIN_SAAS." }, { status: 403 });
    }
    if (role === "CLIENT_ADMIN" && user.role === "ADMIN_SAAS") {
      return Response.json({ ok: false, message: "Sem permissão." }, { status: 403 });
    }
  }

  const passwordHash = parsed.data.password ? await bcrypt.hash(parsed.data.password, 10) : undefined;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name ? parsed.data.name.trim() : undefined,
      role: parsed.data.role,
      active: parsed.data.active,
      twoFactorEnabled: parsed.data.twoFactorEnabled,
      passwordHash,
    },
  });

  return Response.json({ ok: true }, { status: 200 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  const role = session?.user.role;
  if (!session?.user || !clientId) return Response.json({ ok: false, message: "Não autorizado." }, { status: 401 });
  if (role !== "CLIENT_ADMIN" && role !== "ADMIN_SAAS") {
    return Response.json({ ok: false, message: "Sem permissão." }, { status: 403 });
  }

  const { userId } = await params;
  const user = await prisma.user.findFirst({
    where: role === "ADMIN_SAAS" ? { id: userId } : { id: userId, clientId },
    select: { id: true, role: true },
  });
  if (!user) return Response.json({ ok: false, message: "Usuário não encontrado." }, { status: 404 });
  if (role === "CLIENT_ADMIN" && user.role === "ADMIN_SAAS") {
    return Response.json({ ok: false, message: "Sem permissão." }, { status: 403 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { active: false } });
  return Response.json({ ok: true }, { status: 200 });
}
