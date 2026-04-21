"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Tx = {
  id: string;
  data: string;
  descricao: string;
  categoria:
    | "PIX"
    | "VENDAS"
    | "RENDIMENTO"
    | "TARIFA"
    | "JUROS"
    | "IMPOSTOS"
    | "TRANSFERENCIA"
    | "ESTORNO"
    | "OUTROS";
  tipo: "ENTRADA" | "SAIDA";
  valor: string;
};

type TipoFiltro = "TODOS" | "ENTRADA" | "SAIDA";

export function TransactionsTable({
  transactions,
  readOnly,
  filter,
  onFilterChange,
}: {
  transactions: Tx[];
  readOnly?: boolean;
  filter?: TipoFiltro;
  onFilterChange?: (next: TipoFiltro) => void;
}) {
  const router = useRouter();
  const [internalFilter, setInternalFilter] = useState<TipoFiltro>(filter ?? "TODOS");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<{
    data: string;
    descricao: string;
    categoria: Tx["categoria"];
    tipo: "ENTRADA" | "SAIDA";
    valor: string;
  }>({ data: "", descricao: "", categoria: "OUTROS", tipo: "ENTRADA", valor: "" });

  const activeFilter = filter ?? internalFilter;

  const filteredTransactions = useMemo(() => {
    if (activeFilter === "TODOS") return transactions;
    return transactions.filter((t) => t.tipo === activeFilter);
  }, [activeFilter, transactions]);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white lg:col-span-2">
      <div className="flex flex-col gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm font-medium text-zinc-950">
          Transações ({filteredTransactions.length}
          {activeFilter !== "TODOS" ? ` de ${transactions.length}` : ""})
        </div>
        <div className="inline-flex w-full rounded-xl border border-zinc-200 bg-white p-1 sm:w-auto">
          {(["TODOS", "ENTRADA", "SAIDA"] as const).map((k) => (
            <button
              key={k}
              type="button"
              className={
                k === activeFilter
                  ? "h-9 flex-1 rounded-lg bg-zinc-950 px-3 text-sm font-medium text-white sm:flex-none"
                  : "h-9 flex-1 rounded-lg px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 sm:flex-none"
              }
              onClick={() => {
                if (filter) {
                  onFilterChange?.(k);
                  return;
                }
                setInternalFilter(k);
                onFilterChange?.(k);
              }}
            >
              {k === "TODOS" ? "Todos" : k === "ENTRADA" ? "Entradas" : "Saídas"}
            </button>
          ))}
        </div>
      </div>
      {error ? <div className="px-4 py-3 text-sm text-red-700">{error}</div> : null}
      <div className="max-h-[560px] overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 border-b border-zinc-200 bg-white text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Valor</th>
              {!readOnly ? <th className="px-4 py-3"></th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredTransactions.map((t) => {
              const isEditing = editingId === t.id;
              const isSaving = savingId === t.id;
              return (
                <tr key={t.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 text-zinc-700">
                    {!readOnly && isEditing ? (
                      <input
                        className="h-9 w-36 rounded-lg border border-zinc-200 bg-white px-2 text-sm"
                        value={form.data}
                        onChange={(e) => setForm((s) => ({ ...s, data: e.target.value }))}
                      />
                    ) : (
                      t.data
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-900">
                    {!readOnly && isEditing ? (
                      <input
                        className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-2 text-sm"
                        value={form.descricao}
                        onChange={(e) =>
                          setForm((s) => ({ ...s, descricao: e.target.value }))
                        }
                      />
                    ) : (
                      t.descricao
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {!readOnly && isEditing ? (
                      <select
                        className="h-9 rounded-lg border border-zinc-200 bg-white px-2 text-sm"
                        value={form.categoria}
                        onChange={(e) =>
                          setForm((s) => ({
                            ...s,
                            categoria: e.target.value as Tx["categoria"],
                          }))
                        }
                      >
                        <option value="PIX">PIX</option>
                        <option value="VENDAS">VENDAS</option>
                        <option value="RENDIMENTO">RENDIMENTO</option>
                        <option value="TARIFA">TARIFA</option>
                        <option value="JUROS">JUROS</option>
                        <option value="IMPOSTOS">IMPOSTOS</option>
                        <option value="TRANSFERENCIA">TRANSFERÊNCIA</option>
                        <option value="ESTORNO">ESTORNO</option>
                        <option value="OUTROS">OUTROS</option>
                      </select>
                    ) : (
                      t.categoria
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {!readOnly && isEditing ? (
                      <select
                        className="h-9 rounded-lg border border-zinc-200 bg-white px-2 text-sm"
                        value={form.tipo}
                        onChange={(e) =>
                          setForm((s) => ({ ...s, tipo: e.target.value as Tx["tipo"] }))
                        }
                      >
                        <option value="ENTRADA">ENTRADA</option>
                        <option value="SAIDA">SAIDA</option>
                      </select>
                    ) : (
                      t.tipo
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {!readOnly && isEditing ? (
                      <input
                        className="h-9 w-28 rounded-lg border border-zinc-200 bg-white px-2 text-sm"
                        value={form.valor}
                        onChange={(e) => setForm((s) => ({ ...s, valor: e.target.value }))}
                      />
                    ) : (
                      `R$ ${t.valor}`
                    )}
                  </td>
                  {!readOnly ? (
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={isSaving}
                            className="h-9 rounded-xl bg-zinc-950 px-3 text-sm font-medium text-white transition disabled:opacity-60"
                            onClick={async () => {
                              setSavingId(t.id);
                              setError(null);
                              const valor = Number(form.valor.replace(",", "."));
                              const res = await fetch(`/api/transactions/${t.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  data: form.data,
                                  descricao: form.descricao,
                                  categoria: form.categoria,
                                  tipo: form.tipo,
                                  valor,
                                }),
                              });
                              const json = (await res.json()) as { ok: boolean; message?: string };
                              setSavingId(null);
                              if (!res.ok || !json.ok) {
                                setError(json.message ?? "Falha ao salvar transação.");
                                return;
                              }
                              setEditingId(null);
                              router.refresh();
                            }}
                          >
                            {isSaving ? "Salvando..." : "Salvar"}
                          </button>
                          <button
                            type="button"
                            disabled={isSaving}
                            className="h-9 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-950 transition hover:bg-zinc-50 disabled:opacity-60"
                            onClick={() => setEditingId(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="h-9 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-950 transition hover:bg-zinc-50"
                          onClick={() => {
                            setError(null);
                            setEditingId(t.id);
                            setForm({
                              data: t.data,
                              descricao: t.descricao,
                              categoria: t.categoria,
                              tipo: t.tipo,
                              valor: t.valor,
                            });
                          }}
                        >
                          Editar
                        </button>
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })}

            {!filteredTransactions.length ? (
              <tr>
                <td className="px-4 py-6 text-zinc-600" colSpan={!readOnly ? 6 : 5}>
                  Nenhuma transação encontrada para este filtro.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
