"use client";

import { useEffect, useMemo, useReducer } from "react";

import {
  filterTransactions,
  inferCompetenciaFromTransactions,
  TipoFiltro,
  toCsvTransactions,
  toTxtTransactions,
  TransactionRow,
} from "@/lib/dashboard/transactionExports";

import { TransactionsTable } from "@/app/app/statements/[statementId]/TransactionsTable";

type EntityOption = { id: string; nome: string };
type BankOption = { id: string; nome: string };

function formatDateBR(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return value;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function TransactionsByBankTable({ entities }: { entities: EntityOption[] }) {
  const [state, dispatch] = useReducer(
    (
      prev: {
        entityId: string;
        banks: BankOption[];
        bankId: string;
        filter: TipoFiltro;
        loadingBanks: boolean;
        loadingRows: boolean;
        error: string | null;
        rows: TransactionRow[];
      },
      action:
        | { type: "selectEntity"; entityId: string }
        | { type: "selectBank"; bankId: string }
        | { type: "setFilter"; filter: TipoFiltro }
        | { type: "banksLoading" }
        | { type: "banksLoaded"; banks: BankOption[] }
        | { type: "banksError"; message: string }
        | { type: "rowsLoading" }
        | { type: "rowsLoaded"; rows: TransactionRow[] }
        | { type: "rowsError"; message: string },
    ) => {
      switch (action.type) {
        case "selectEntity":
          return {
            ...prev,
            entityId: action.entityId,
            banks: [],
            bankId: "",
            rows: [],
            error: null,
            loadingBanks: false,
            loadingRows: false,
          };
        case "selectBank":
          return { ...prev, bankId: action.bankId, rows: [], error: null, loadingRows: false };
        case "setFilter":
          return { ...prev, filter: action.filter };
        case "banksLoading":
          return { ...prev, loadingBanks: true, error: null };
        case "banksLoaded":
          return { ...prev, loadingBanks: false, banks: action.banks ?? [] };
        case "banksError":
          return { ...prev, loadingBanks: false, error: action.message };
        case "rowsLoading":
          return { ...prev, loadingRows: true, error: null };
        case "rowsLoaded":
          return { ...prev, loadingRows: false, rows: action.rows ?? [] };
        case "rowsError":
          return { ...prev, loadingRows: false, error: action.message };
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
      loadingRows: false,
      error: null,
      rows: [],
    },
  );

  const entityName = useMemo(() => {
    return entities.find((e) => e.id === state.entityId)?.nome ?? "";
  }, [entities, state.entityId]);

  const bankName = useMemo(() => {
    return state.banks.find((b) => b.id === state.bankId)?.nome ?? "";
  }, [state.banks, state.bankId]);

  useEffect(() => {
    const key = "dashboard:transacoes:tipo";
    try {
      const stored = sessionStorage.getItem(key);
      if (stored === "TODOS" || stored === "ENTRADA" || stored === "SAIDA") {
        dispatch({ type: "setFilter", filter: stored });
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    const key = "dashboard:transacoes:tipo";
    try {
      sessionStorage.setItem(key, state.filter);
    } catch {
    }
  }, [state.filter]);

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
      });

    return () => {
      cancelled = true;
    };
  }, [state.entityId]);

  useEffect(() => {
    if (!state.entityId || !state.bankId) return;

    let cancelled = false;
    dispatch({ type: "rowsLoading" });
    fetch(
      `/api/dashboard/transactions?entityId=${encodeURIComponent(
        state.entityId,
      )}&templateId=${encodeURIComponent(state.bankId)}`,
    )
      .then(async (r) => {
        const json = await r.json().catch(() => null);
        if (!r.ok) throw new Error(json?.message ?? "Falha ao carregar transações.");
        return json as { ok: true; transactions: TransactionRow[] };
      })
      .then((json) => {
        if (cancelled) return;
        dispatch({ type: "rowsLoaded", rows: json.transactions ?? [] });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        dispatch({
          type: "rowsError",
          message: e instanceof Error ? e.message : "Falha ao carregar transações.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [state.entityId, state.bankId]);

  const exportRows = useMemo(() => {
    return filterTransactions(state.rows, state.filter);
  }, [state.rows, state.filter]);

  const canExport = exportRows.length > 0 && !state.loadingRows;

  const tableRows = useMemo(() => {
    return state.rows.map((r) => ({
      id: r.id,
      data: formatDateBR(r.date),
      descricao: r.descricao,
      categoria: "OUTROS" as const,
      tipo: r.tipo,
      valor: r.valor.toFixed(2).replace(".", ","),
    }));
  }, [state.rows]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-3">
          <div className="text-sm font-medium text-zinc-950">Transações por banco</div>
          <div className="mt-1 text-xs text-zinc-600">
            Selecione empresa e banco para visualizar e exportar.
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
              onChange={(e) => dispatch({ type: "selectEntity", entityId: e.target.value })}
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
              onChange={(e) => dispatch({ type: "selectBank", bankId: e.target.value })}
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
            <div className="text-sm font-medium text-zinc-900">Exportação</div>
            <div className="flex gap-2">
              <button
                type="button"
                className="h-11 flex-1 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 disabled:bg-zinc-50 disabled:text-zinc-400"
                disabled={!canExport}
                onClick={() => {
                  const csv = toCsvTransactions(exportRows);
                  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  const safeEntity = (entityName || "empresa").replaceAll(/\s+/g, "-");
                  const safeBank = (bankName || "banco").replaceAll(/\s+/g, "-");
                  a.download = `transacoes_${safeEntity}_${safeBank}_${state.filter.toLowerCase()}.csv`;
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
                className="h-11 flex-1 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 disabled:bg-zinc-50 disabled:text-zinc-400"
                disabled={!canExport}
                onClick={() => {
                  const competencia = inferCompetenciaFromTransactions(exportRows);
                  const txt = toTxtTransactions({ rows: exportRows, competencia, contaBanco: "8" });
                  const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  const safeEntity = (entityName || "empresa").replaceAll(/\s+/g, "-");
                  const safeBank = (bankName || "banco").replaceAll(/\s+/g, "-");
                  a.download = `transacoes_${safeEntity}_${safeBank}_${state.filter.toLowerCase()}.txt`;
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

          <div className="md:col-span-3">
            {state.error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {state.error}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <TransactionsTable
        readOnly
        filter={state.filter}
        onFilterChange={(next) => dispatch({ type: "setFilter", filter: next })}
        transactions={tableRows}
      />
    </div>
  );
}
