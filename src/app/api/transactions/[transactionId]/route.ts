import type { NextRequest } from "next/server";

import { z } from "zod";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { reconcileStatement } from "@/server/reconcile/reconcileStatement";

export const runtime = "nodejs";

const BodySchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  descricao: z.string().min(1).max(280),
  categoria: z.enum([
    "PIX",
    "VENDAS",
    "RENDIMENTO",
    "TARIFA",
    "JUROS",
    "IMPOSTOS",
    "TRANSFERENCIA",
    "ESTORNO",
    "OUTROS",
  ]),
  tipo: z.enum(["ENTRADA", "SAIDA"]),
  valor: z.number().positive(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> },
) {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  const userId = session?.user.id;
  if (!clientId || !userId) {
    return Response.json({ ok: false, message: "Não autorizado." }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, message: "Payload inválido." }, { status: 400 });
  }

  const { transactionId } = await params;

  const tx = await prisma.transaction.findFirst({
    where: { id: transactionId },
    select: {
      id: true,
      data: true,
      descricao: true,
      categoria: true,
      tipo: true,
      valor: true,
      statement: {
        select: { id: true, clientId: true },
      },
    },
  });

  if (!tx?.statement || tx.statement.clientId !== clientId) {
    return Response.json({ ok: false, message: "Transação não encontrada." }, { status: 404 });
  }

  const iso = `${parsed.data.data}T00:00:00.000Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return Response.json({ ok: false, message: "Data inválida." }, { status: 400 });
  }

  const valor = Number(parsed.data.valor.toFixed(2));

  const before = {
    data: tx.data.toISOString().slice(0, 10),
    descricao: tx.descricao,
    categoria: tx.categoria,
    tipo: tx.tipo,
    valor: String(tx.valor),
  };

  const after = {
    data: parsed.data.data,
    descricao: parsed.data.descricao,
    categoria: parsed.data.categoria,
    tipo: parsed.data.tipo,
    valor: valor.toFixed(2),
  };

  await prisma.$transaction([
    prisma.transactionAudit.create({
      data: {
        transactionId: tx.id,
        userId,
        action: "UPDATE",
        before,
        after,
      },
    }),
    prisma.transaction.update({
      where: { id: tx.id },
      data: {
        data: date,
        descricao: parsed.data.descricao,
        categoria: parsed.data.categoria,
        tipo: parsed.data.tipo,
        valor: valor.toFixed(2),
      },
    }),
  ]);

  const reconcile = await reconcileStatement(tx.statement.id);
  return Response.json(
    { ok: true, reconcile: reconcile.ok ? { issuesOpen: reconcile.issuesOpen, status: reconcile.status } : null },
    { status: 200 },
  );
}

