import type { NextRequest } from "next/server";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function parseISODate(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function GET(request: NextRequest) {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  if (!clientId) return Response.json({ ok: false, message: "Não autorizado." }, { status: 401 });

  const entityId = request.nextUrl.searchParams.get("entityId");
  const templateId = request.nextUrl.searchParams.get("templateId");

  if (!entityId || !templateId) {
    return Response.json(
      { ok: false, message: "entityId e templateId são obrigatórios." },
      { status: 400 },
    );
  }

  const fromRaw = request.nextUrl.searchParams.get("from");
  const toRaw = request.nextUrl.searchParams.get("to");
  const from = fromRaw ? parseISODate(fromRaw) : null;
  const to = toRaw ? parseISODate(toRaw) : null;

  const takeRaw = request.nextUrl.searchParams.get("take");
  const take = takeRaw ? Number(takeRaw) : 5000;
  const safeTake = Number.isFinite(take) ? Math.min(Math.max(1, take), 20000) : 5000;

  const txs = await prisma.transaction.findMany({
    where: {
      entityId,
      templateId,
      entity: { clientId },
      template: { clientId },
      ...(from || to ? { data: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    },
    orderBy: [{ data: "asc" }, { id: "asc" }],
    take: safeTake,
    select: { id: true, data: true, descricao: true, tipo: true, valor: true },
  });

  const rows = txs.map((t) => ({
    id: t.id,
    date: t.data.toISOString().slice(0, 10),
    descricao: t.descricao,
    tipo: t.tipo,
    valor: Number(t.valor.toString()),
  }));

  return Response.json({ ok: true, transactions: rows }, { status: 200 });
}
