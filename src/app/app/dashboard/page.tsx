import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardFilters } from "@/app/app/dashboard/DashboardFilters";
import { DailyChart } from "@/app/app/dashboard/DailyChart";

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function parseISODateInput(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ entityId?: string; from?: string; to?: string }>;
}) {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  if (!clientId) return null;

  const sp = (await searchParams) ?? {};

  const now = new Date();
  const defaultFrom = new Date();
  defaultFrom.setDate(defaultFrom.getDate() - 30);

  const from = sp.from ? parseISODateInput(sp.from) ?? defaultFrom : defaultFrom;
  const to = sp.to ? parseISODateInput(sp.to) ?? now : now;

  const entities = await prisma.entity.findMany({
    where: { clientId },
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });

  const entityIdParam = sp.entityId ?? "";
  const entityOk = entityIdParam
    ? entities.some((e) => e.id === entityIdParam)
    : false;

  const where = {
    data: { gte: from, lte: to },
    entity: { clientId },
    ...(entityOk ? { entityId: entityIdParam } : {}),
  } as const;

  const transactions = await prisma.transaction.findMany({
    where,
    select: { data: true, tipo: true, categoria: true, valor: true, entityId: true },
  });

  const totals = transactions.reduce(
    (acc, t) => {
      const value = Number(t.valor.toString());
      if (t.tipo === "ENTRADA") acc.entrada += value;
      else acc.saida += value;
      acc.count += 1;
      return acc;
    },
    { entrada: 0, saida: 0, count: 0 },
  );

  const saldo = totals.entrada - totals.saida;

  const byCategoria = new Map<string, { entrada: number; saida: number; count: number }>();
  const byDay = new Map<string, { entrada: number; saida: number }>();
  const byEntity = new Map<string, { entrada: number; saida: number; count: number }>();

  for (const t of transactions) {
    const value = Number(t.valor.toString());
    const day = t.data.toISOString().slice(0, 10);

    const cat = byCategoria.get(t.categoria) ?? { entrada: 0, saida: 0, count: 0 };
    const dayAgg = byDay.get(day) ?? { entrada: 0, saida: 0 };
    const ent = byEntity.get(t.entityId) ?? { entrada: 0, saida: 0, count: 0 };

    if (t.tipo === "ENTRADA") {
      cat.entrada += value;
      dayAgg.entrada += value;
      ent.entrada += value;
    } else {
      cat.saida += value;
      dayAgg.saida += value;
      ent.saida += value;
    }

    cat.count += 1;
    ent.count += 1;

    byCategoria.set(t.categoria, cat);
    byDay.set(day, dayAgg);
    byEntity.set(t.entityId, ent);
  }

  const categories = [...byCategoria.entries()]
    .map(([categoria, v]) => ({
      categoria,
      entrada: v.entrada,
      saida: v.saida,
      saldo: v.entrada - v.saida,
      count: v.count,
    }))
    .sort((a, b) => Math.abs(b.saldo) - Math.abs(a.saldo));

  const seriesDays: string[] = [];
  {
    const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
    const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
    while (cursor.getTime() <= end.getTime()) {
      seriesDays.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      if (seriesDays.length > 370) break;
    }
  }

  const dailyPoints = seriesDays.map((d) => {
    const v = byDay.get(d) ?? { entrada: 0, saida: 0 };
    return { day: d, entrada: v.entrada, saida: v.saida, saldo: v.entrada - v.saida };
  });

  const entitiesById = new Map(entities.map((e) => [e.id, e.nome]));
  const entityRows = [...byEntity.entries()]
    .map(([entityId, v]) => ({
      entityId,
      nome: entitiesById.get(entityId) ?? entityId,
      entrada: v.entrada,
      saida: v.saida,
      saldo: v.entrada - v.saida,
      count: v.count,
    }))
    .sort((a, b) => Math.abs(b.saldo) - Math.abs(a.saldo));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
          Dashboard
        </h1>
        <p className="text-sm text-zinc-600">
          Totais por período e categoria.
        </p>
      </div>

      <DashboardFilters entities={entities} />

      <DailyChart points={dailyPoints} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="text-xs font-medium text-zinc-500">Entradas</div>
          <div className="mt-2 text-2xl font-semibold text-zinc-950">
            {formatBRL(totals.entrada)}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="text-xs font-medium text-zinc-500">Saídas</div>
          <div className="mt-2 text-2xl font-semibold text-zinc-950">
            {formatBRL(totals.saida)}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="text-xs font-medium text-zinc-500">Saldo</div>
          <div className="mt-2 text-2xl font-semibold text-zinc-950">
            {formatBRL(saldo)}
          </div>
        </div>
      </div>

      {!entityOk ? (
        <div className="rounded-2xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-3 text-sm font-medium text-zinc-950">
            Comparativo por entidade
          </div>
          <div className="overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-white text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-5 py-3">Entidade</th>
                  <th className="px-5 py-3">Entradas</th>
                  <th className="px-5 py-3">Saídas</th>
                  <th className="px-5 py-3">Saldo</th>
                  <th className="px-5 py-3">Transações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {entityRows.map((r) => (
                  <tr key={r.entityId} className="hover:bg-zinc-50">
                    <td className="px-5 py-3 font-medium text-zinc-950">{r.nome}</td>
                    <td className="px-5 py-3 text-zinc-700">{formatBRL(r.entrada)}</td>
                    <td className="px-5 py-3 text-zinc-700">{formatBRL(r.saida)}</td>
                    <td className="px-5 py-3 text-zinc-700">{formatBRL(r.saldo)}</td>
                    <td className="px-5 py-3 text-zinc-700">{r.count}</td>
                  </tr>
                ))}
                {!entityRows.length ? (
                  <tr>
                    <td className="px-5 py-6 text-zinc-600" colSpan={5}>
                      Nenhuma transação no período.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-3 text-sm font-medium text-zinc-950">
          Por categoria
        </div>
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-white text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-5 py-3">Categoria</th>
                <th className="px-5 py-3">Entradas</th>
                <th className="px-5 py-3">Saídas</th>
                <th className="px-5 py-3">Saldo</th>
                <th className="px-5 py-3">Transações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {categories.map((c) => (
                <tr key={c.categoria} className="hover:bg-zinc-50">
                  <td className="px-5 py-3 font-medium text-zinc-950">{c.categoria}</td>
                  <td className="px-5 py-3 text-zinc-700">{formatBRL(c.entrada)}</td>
                  <td className="px-5 py-3 text-zinc-700">{formatBRL(c.saida)}</td>
                  <td className="px-5 py-3 text-zinc-700">{formatBRL(c.saldo)}</td>
                  <td className="px-5 py-3 text-zinc-700">{c.count}</td>
                </tr>
              ))}
              {!categories.length ? (
                <tr>
                  <td className="px-5 py-6 text-zinc-600" colSpan={5}>
                    Nenhuma transação no período.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="text-sm font-medium text-zinc-900">Transações no período</div>
        <div className="mt-2 text-sm text-zinc-600">{totals.count}</div>
      </div>
    </div>
  );
}
