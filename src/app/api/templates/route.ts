import type { NextRequest } from "next/server";

import { z } from "zod";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const CreateSchema = z.object({
  nome: z.string().min(1).max(80),
  identificador: z.string().min(1).max(120),
  regexData: z.string().min(1).max(500),
  regexValor: z.string().min(1).max(500),
  regexDescricao: z.string().min(1).max(800),
});

function validateRegex(value: string) {
  try {
    new RegExp(value);
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  if (!clientId) return Response.json({ ok: false, message: "Não autorizado." }, { status: 401 });

  const templates = await prisma.template.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      nome: true,
      identificador: true,
      regexData: true,
      regexValor: true,
      regexDescricao: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return Response.json({ ok: true, templates }, { status: 200 });
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

  if (
    !validateRegex(parsed.data.regexData) ||
    !validateRegex(parsed.data.regexValor) ||
    !validateRegex(parsed.data.regexDescricao)
  ) {
    return Response.json({ ok: false, message: "Regex inválida." }, { status: 400 });
  }

  const template = await prisma.template.create({
    data: { ...parsed.data, clientId },
    select: { id: true },
  });

  return Response.json({ ok: true, id: template.id }, { status: 201 });
}
