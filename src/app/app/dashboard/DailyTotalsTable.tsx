"use client";

import { useEffect, useMemo, useReducer } from "react";

import {
  formatDateBR,
  inferCompetenciaFromRows,
  mergeDailyTotals,
  TipoFiltro,
  toCsvDailyTotals,
  toTxtDailyTotals,
} from "@/lib/dashboard/dailyTotals";

type EntityOption = { id: string; nome: string };
type BankOption = { id: string; nome: string };

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function DailyTotalsTable({ entities }: { entities: EntityOption[] }) {
  const [state, dispatch] = useReducer(
    (
      prev: {
        entityId: string;
        banks: BankOption[];
        bankId: string;
        filter: TipoFiltro;
        loadingBanks: boolean;
        loadingTotals: boolean;
        error: string | null;
        totalsEntrada: { date: string; total: number }[];
        totalsSaida: { date: string; total: number }[];
      },
      action:
        | { type: "selectEntity"; entityId: string }
        | { type: "selectBank"; bankId: string }
        | { type: "setFilter"; filter: TipoFiltro }
        | { type: "banksLoading" }
        | { type: "banksLoaded"; banks: BankOption[] }
        | { type: "banksError"; message: string }
        | { type: "totalsLoading" }
        | {
            type: "totalsLoaded";
            totalsEntrada: { date: string; total: number }[];
            totalsSaida: { date: string; total: number }[];
          }
        | { type: "totalsError"; message: string },
    ) => {
      switch (action.type) {
        case "selectEntity":
          return {
            ...prev,
            entityId: action.entityId,
            banks: [],
            bankId: "",
            totalsEntrada: [],
            totalsSaida: [],
            error: null,
            loadingBanks: false,
            loadingTotals: false,
          };
        case "selectBank":
          return {
            ...prev,
            bankId: action.bankId,
            totalsEntrada: [],
            totalsSaida: [],
            error: null,
            loadingTotals: false,
          };
        case "setFilter":
          return { ...prev, filter: action.filter, error: null };
        case "banksLoading":
          return { ...prev, loadingBanks: true, error: null };
        case "banksLoaded":
          return { ...prev, loadingBanks: false, banks: action.banks ?? [] };
        case "banksError":
          return { ...prev, loadingBanks: false, error: action.message };
        case "totalsLoading":
          return { ...prev, loadingTotals: true, error: null };
        case "totalsLoaded":
          return {
            ...prev,
            loadingTotals: false,
            totalsEntrada: action.totalsEntrada ?? [],
            totalsSaida: action.totalsSaida ?? [],
          };
        case "totalsError":
          return { ...prev, loadingTotals: false, error: action.message };
        default:
          return prev;
      }
    },
    {
      entityId: "",
      banks: [],
      bankId: "",
      filter: "TODOS",
      loadingBanks: false,
      loadingTotals: false,
      error: null,
      totalsEntrada: [],
      totalsSaida: [],
    },
  );

  const entityName = useMemo(() => {
    return entities.find((e) => e.id === state.entityId)?.nome ?? "";
  }, [entities, state.entityId]);

  const bankName = useMemo(() => {
    return state.banks.find((b) => b.id === state.bankId)?.nome ?? "";
  }, [state.banks, state.bankId]);

  useEffect(() => {
    if (!state.entityId) return;

    let cancelled = false;
    dispatch({ type: "banksLoading" });
    fetch(`/api/dashboard/banks?entityId=${encodeURIComponent(state.entityId)}`)
      .then(async (r) => {
        const json = await r.json().catch(() => null);
        if (!r.ok) throw new Error(json?.message ?? "Falha ao carregar bancos.");
        return json as { ok: true; banks: BankOption[] };
      })
      .then((json) => {
        if (cancelled) return;
        dispatch({ type: "banksLoaded", banks: json.banks ?? [] });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        dispatch({
          type: "banksError",
          message: e instanceof Error ? e.message : "Falha ao carregar bancos.",
        });
      })
      .finally(() => {
        if (cancelled) return;
      });

    return () => {
      cancelled = true;
    };
  }, [state.entityId]);

  useEffect(() => {
    if (!state.entityId || !state.bankId) return;

    let cancelled = false;
    dispatch({ type: "totalsLoading" });
    const base = `/api/dashboard/daily-totals?entityId=${encodeURIComponent(
      state.entityId,
    )}&templateId=${encodeURIComponent(state.bankId)}`;

    Promise.all([
      fetch(`${base}&tipo=ENTRADA`).then(async (r) => {
        const json = await r.json().catch(() => null);
        if (!r.ok) throw new Error(json?.message ?? "Falha ao carregar totais de entradas.");
        return json as { ok: true; totals: { date: string; total: number }[] };
      }),
      fetch(`${base}&tipo=SAIDA`).then(async (r) => {
        const json = await r.json().catch(() => null);
        if (!r.ok) throw new Error(json?.message ?? "Falha ao carregar totais de saídas.");
        return json as { ok: true; totals: { date: string; total: number }[] };
      }),
    ])
      .then(([entrada, saida]) => {
        if (cancelled) return;
        dispatch({
          type: "totalsLoaded",
          totalsEntrada: entrada.totals ?? [],
          totalsSaida: saida.totals ?? [],
        });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        dispatch({
          type: "totalsError",
          message: e instanceof Error ? e.message : "Falha ao carregar totais.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [state.entityId, state.bankId]);

  useEffect(() => {
    const key = "dashboard:totais-diarios:tipo";
    try {
      const stored = sessionStorage.getItem(key);
      if (stored === "TODOS" || stored === "ENTRADA" || stored === "SAIDA") {
        dispatch({ type: "setFilter", filter: stored });
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    const key = "dashboard:totais-diarios:tipo";
    try {
      sessionStorage.setItem(key, state.filter);
    } catch {
    }
  }, [state.filter]);

  const merged = useMemo(() => {
    return mergeDailyTotals({ entrada: state.totalsEntrada, saida: state.totalsSaida });
  }, [state.totalsEntrada, state.totalsSaida]);

  const viewRowsTotals = useMemo(() => {
    return state.filter === "ENTRADA" ? state.totalsEntrada : state.totalsSaida;
  }, [state.filter, state.totalsEntrada, state.totalsSaida]);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-3">
        <div className="text-sm font-medium text-zinc-950">Totais diários por banco</div>
        <div className="mt-1 text-xs text-zinc-600">
          Selecione empresa e banco para somar os valores por dia.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-900" htmlFor="empresa">
            Empresa
          </label>
          <select
            id="empresa"
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-0 focus:border-zinc-300"
            value={state.entityId}
            onChange={(e) => {
              dispatch({ type: "selectEntity", entityId: e.target.value });
            }}
          >
            <option value="">Selecione...</option>
            {entities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-900" htmlFor="banco">
            Banco
          </label>
          <select
            id="banco"
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-0 focus:border-zinc-300 disabled:bg-zinc-50 disabled:text-zinc-400"
            value={state.bankId}
            onChange={(e) => {
              dispatch({ type: "selectBank", bankId: e.target.value });
            }}
            disabled={!state.entityId || state.loadingBanks}
          >
            <option value="">
              {state.loadingBanks
                ? "Carregando..."
                : !state.entityId
                  ? "Selecione uma empresa"
                  : "Selecione..."}
            </option>
            {state.banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nome}
              </option>
            ))}
          </select>
          {!state.loadingBanks && state.entityId && !state.banks.length ? (
            <div className="text-xs text-zinc-600">Nenhum banco encontrado para esta empresa.</div>
          ) : null}
        </div>

        <div className="space-y-1">
          <div className="text-sm font-medium text-zinc-900">Tipo</div>
          <div className="grid h-11 grid-cols-3 overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <button
              type="button"
              className={
                state.filter === "TODOS"
                  ? "bg-zinc-950 text-sm font-medium text-white"
                  : "bg-white text-sm font-medium text-zinc-700"
              }
              onClick={() => {
                if (state.filter === "TODOS") return;
                dispatch({ type: "setFilter", filter: "TODOS" });
              }}
              disabled={state.loadingTotals}
            >
              Todos
            </button>
            <button
              type="button"
              className={
                state.filter === "ENTRADA"
                  ? "bg-zinc-950 text-sm font-medium text-white"
                  : "bg-white text-sm font-medium text-zinc-700"
              }
              onClick={() => {
                if (state.filter === "ENTRADA") return;
                dispatch({ type: "setFilter", filter: "ENTRADA" });
              }}
              disabled={state.loadingTotals}
            >
              Entradas
            </button>
            <button
              type="button"
              className={
                state.filter === "SAIDA"
                  ? "bg-zinc-950 text-sm font-medium text-white"
                  : "bg-white text-sm font-medium text-zinc-700"
              }
              onClick={() => {
                if (state.filter === "SAIDA") return;
                dispatch({ type: "setFilter", filter: "SAIDA" });
              }}
              disabled={state.loadingTotals}
            >
              Saídas
            </button>
          </div>
        </div>

        <div className="md:col-span-3">
          {state.error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {state.error}
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t border-zinc-200 px-5 py-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-zinc-700">
            {entityName && bankName ? (
              <span className="font-medium text-zinc-950">
                {entityName} · {bankName} ·{" "}
                {state.filter === "TODOS"
                  ? "Todos"
                  : state.filter === "ENTRADA"
                    ? "Entradas"
                    : "Saídas"}
              </span>
            ) : (
              <span>Selecione empresa e banco.</span>
            )}
            {state.loadingTotals ? (
              <span className="ml-2 text-zinc-500">Carregando...</span>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <button
              type="button"
              className="h-10 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 disabled:bg-zinc-50 disabled:text-zinc-400"
              disabled={
                state.loadingTotals ||
                (state.filter === "TODOS"
                  ? !merged.length
                  : !viewRowsTotals.length)
              }
              onClick={() => {
                const csv = toCsvDailyTotals({
                  filter: state.filter,
                  entrada: state.totalsEntrada,
                  saida: state.totalsSaida,
                });
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                const safeEntity = (entityName || "empresa").replaceAll(/\s+/g, "-");
                const safeBank = (bankName || "banco").replaceAll(/\s+/g, "-");
                a.download = `totais-diarios_${safeEntity}_${safeBank}_${state.filter.toLowerCase()}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              }}
            >
              Exportar CSV
            </button>
            <button
              type="button"
              className="h-10 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 disabled:bg-zinc-50 disabled:text-zinc-400"
              disabled={
                state.loadingTotals ||
                (state.filter === "TODOS"
                  ? !merged.length
                  : !viewRowsTotals.length)
              }
              onClick={() => {
                const competencia = inferCompetenciaFromRows({
                  entrada: state.totalsEntrada,
                  saida: state.totalsSaida,
                });
                const txt = toTxtDailyTotals({
                  filter: state.filter,
                  entrada: state.totalsEntrada,
                  saida: state.totalsSaida,
                  competencia,
                  contaBanco: "8",
                });
                const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                const safeEntity = (entityName || "empresa").replaceAll(/\s+/g, "-");
                const safeBank = (bankName || "banco").replaceAll(/\s+/g, "-");
                a.download = `totais-diarios_${safeEntity}_${safeBank}_${state.filter.toLowerCase()}.txt`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              }}
            >
              Exportar TXT
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-white text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-5 py-3">Data</th>
              {state.filter === "TODOS" ? (
                <>
                  <th className="px-5 py-3">Entradas</th>
                  <th className="px-5 py-3">Saídas</th>
                </>
              ) : (
                <th className="px-5 py-3">Valor total do dia</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {state.filter === "TODOS"
              ? merged.map((r) => (
                  <tr key={r.date} className="hover:bg-zinc-50">
                    <td className="px-5 py-3 font-medium text-zinc-950">{formatDateBR(r.date)}</td>
                    <td className="px-5 py-3 text-zinc-700">{formatBRL(r.entrada)}</td>
                    <td className="px-5 py-3 text-zinc-700">{formatBRL(r.saida)}</td>
                  </tr>
                ))
              : viewRowsTotals.map((r) => (
                  <tr key={r.date} className="hover:bg-zinc-50">
                    <td className="px-5 py-3 font-medium text-zinc-950">{formatDateBR(r.date)}</td>
                    <td className="px-5 py-3 text-zinc-700">{formatBRL(r.total)}</td>
                  </tr>
                ))}
            {!state.loadingTotals &&
            state.entityId &&
            state.bankId &&
            (state.filter === "TODOS" ? !merged.length : !viewRowsTotals.length) ? (
              <tr>
                <td className="px-5 py-6 text-zinc-600" colSpan={state.filter === "TODOS" ? 3 : 2}>
                  Nenhuma transação encontrada.
                </td>
              </tr>
            ) : null}
            {!state.entityId || !state.bankId ? (
              <tr>
                <td className="px-5 py-6 text-zinc-600" colSpan={state.filter === "TODOS" ? 3 : 2}>
                  Selecione empresa e banco para visualizar os totais.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
