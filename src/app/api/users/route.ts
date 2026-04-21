import type { NextRequest } from "next/server";

import bcrypt from "bcryptjs";
import { z } from "zod";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const CreateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120).optional(),
  password: z.string().min(6).max(200),
  role: z.enum(["CLIENT_ADMIN", "USER", "ADMIN_SAAS"]).optional(),
  clientId: z.string().min(1).optional(),
  twoFactorEnabled: z.boolean().optional(),
  active: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  const role = session?.user.role;
  if (!session?.user || !clientId) return Response.json({ ok: false, message: "Não autorizado." }, { status: 401 });
  if (role !== "CLIENT_ADMIN" && role !== "ADMIN_SAAS") {
    return Response.json({ ok: false, message: "Sem permissão." }, { status: 403 });
  }

  const url = new URL(request.url);
  const clientIdParam = url.searchParams.get("clientId") ?? "";
  const where = role === "ADMIN_SAAS" ? (clientIdParam ? { clientId: clientIdParam } : {}) : { clientId };

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, role: true, active: true, twoFactorEnabled: true, createdAt: true, updatedAt: true },
  });

  return Response.json({ ok: true, users }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  const role = session?.user.role;
  if (!session?.user || !clientId) return Response.json({ ok: false, message: "Não autorizado." }, { status: 401 });
  if (role !== "CLIENT_ADMIN" && role !== "ADMIN_SAAS") {
    return Response.json({ ok: false, message: "Sem permissão." }, { status: 403 });
  }

  const parsed = CreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, message: "Payload inválido." }, { status: 400 });

  const targetClientId = role === "ADMIN_SAAS" ? parsed.data.clientId ?? "" : clientId;
  if (!targetClientId) {
    return Response.json({ ok: false, message: "clientId é obrigatório." }, { status: 400 });
  }

  const requestedRole = parsed.data.role ?? "USER";
  if (role !== "ADMIN_SAAS" && requestedRole === "ADMIN_SAAS") {
    return Response.json({ ok: false, message: "Sem permissão para criar ADMIN_SAAS." }, { status: 403 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email.trim().toLowerCase(),
        name: parsed.data.name?.trim() ?? null,
        role: requestedRole,
        clientId: targetClientId,
        passwordHash,
        twoFactorEnabled: parsed.data.twoFactorEnabled ?? false,
        active: parsed.data.active ?? true,
      },
      select: { id: true },
    });

    return Response.json({ ok: true, id: user.id }, { status: 201 });
  } catch (error) {
    const message = String(error);
    if (message.includes("Unique constraint failed") || message.includes("P2002")) {
      return Response.json({ ok: false, message: "Email já cadastrado." }, { status: 409 });
    }
    if (message.includes("Foreign key") || message.includes("P2003")) {
      return Response.json({ ok: false, message: "clientId inválido." }, { status: 400 });
    }
    throw error;
  }
}
