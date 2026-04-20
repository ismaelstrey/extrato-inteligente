import type { NextRequest } from "next/server";

import { z } from "zod";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const UpdateSchema = z.object({
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

export async function GET(_request: NextRequest, { params }: { params: Promise<{ templateId: string }> }) {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  if (!clientId) return Response.json({ ok: false, message: "Não autorizado." }, { status: 401 });

  const { templateId } = await params;

  const template = await prisma.template.findFirst({
    where: { id: templateId, clientId },
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

  if (!template) return Response.json({ ok: false, message: "Template não encontrado." }, { status: 404 });
  return Response.json({ ok: true, template }, { status: 200 });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ templateId: string }> }) {
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

  if (
    !validateRegex(parsed.data.regexData) ||
    !validateRegex(parsed.data.regexValor) ||
    !validateRegex(parsed.data.regexDescricao)
  ) {
    return Response.json({ ok: false, message: "Regex inválida." }, { status: 400 });
  }

  const { templateId } = await params;

  const existing = await prisma.template.findFirst({
    where: { id: templateId, clientId },
    select: { id: true },
  });

  if (!existing) return Response.json({ ok: false, message: "Template não encontrado." }, { status: 404 });

  await prisma.template.update({
    where: { id: existing.id },
    data: parsed.data,
  });

  return Response.json({ ok: true }, { status: 200 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> },
) {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  const role = session?.user.role;
  if (!clientId) return Response.json({ ok: false, message: "Não autorizado." }, { status: 401 });
  if (role !== "CLIENT_ADMIN" && role !== "ADMIN_SAAS") {
    return Response.json({ ok: false, message: "Sem permissão." }, { status: 403 });
  }

  const { templateId } = await params;

  const template = await prisma.template.findFirst({
    where: { id: templateId, clientId },
    select: { id: true },
  });

  if (!template) return Response.json({ ok: false, message: "Template não encontrado." }, { status: 404 });

  await prisma.template.delete({ where: { id: template.id } });
  return Response.json({ ok: true }, { status: 200 });
}

