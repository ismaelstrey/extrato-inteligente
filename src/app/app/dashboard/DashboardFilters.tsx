"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

type EntityOption = { id: string; nome: string };

function toDateInputValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function DashboardFilters({ entities }: { entities: EntityOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialEntityId = searchParams.get("entityId") ?? "";
  const initialFrom = searchParams.get("from") ?? "";
  const initialTo = searchParams.get("to") ?? "";

  const defaults = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return { from: toDateInputValue(from), to: toDateInputValue(to) };
  }, []);

  const [entityId, setEntityId] = useState(initialEntityId);
  const [from, setFrom] = useState(initialFrom || defaults.from);
  const [to, setTo] = useState(initialTo || defaults.to);

  return (
    <form
      className="grid grid-cols-1 gap-3 rounded-2xl border border-zinc-200 bg-white p-5 md:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (entityId) params.set("entityId", entityId);
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        router.push(`/app/dashboard?${params.toString()}`);
      }}
    >
      <div className="space-y-1 md:col-span-2">
        <label className="text-sm font-medium text-zinc-900" htmlFor="entity">
          Entidade
        </label>
        <select
          id="entity"
          className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-0 focus:border-zinc-300"
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
        >
          <option value="">Todas</option>
          {entities.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-900" htmlFor="from">
          De
        </label>
        <input
          id="from"
          className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-0 focus:border-zinc-300"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-900" htmlFor="to">
          Até
        </label>
        <input
          id="to"
          className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-0 focus:border-zinc-300"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          required
        />
      </div>

      <div className="md:col-span-4">
        <button
          type="submit"
          className="h-11 rounded-xl bg-zinc-950 px-4 text-sm font-medium text-white transition"
        >
          Aplicar filtros
        </button>
      </div>
    </form>
  );
}

