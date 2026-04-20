"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Issue = {
  id: string;
  type: string;
  severity: string;
  payload: unknown;
};

export function IssuesPanel({
  statementId,
  issues,
}: {
  statementId: string;
  issues: Issue[];
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 lg:col-span-1">
      <div className="text-sm font-medium text-zinc-950">Pendências</div>
      <div className="mt-1 text-xs text-zinc-500">Abertas: {issues.length}</div>

      {error ? <div className="mt-3 text-sm text-red-700">{error}</div> : null}

      <div className="mt-4 space-y-3">
        {issues.map((i) => (
          <div key={i.id} className="rounded-xl border border-zinc-200 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-zinc-900">{i.type}</div>
              <div className="text-xs text-zinc-500">{i.severity}</div>
            </div>
            {i.payload ? (
              <pre className="mt-2 overflow-auto rounded-lg bg-zinc-50 p-2 text-xs text-zinc-700">
                {JSON.stringify(i.payload, null, 2)}
              </pre>
            ) : null}

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={loadingId === i.id}
                className="h-9 rounded-xl bg-zinc-950 px-3 text-sm font-medium text-white transition disabled:opacity-60"
                onClick={async () => {
                  setLoadingId(i.id);
                  setError(null);
                  const res = await fetch(
                    `/api/statements/${statementId}/issues/${i.id}`,
                    {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "resolve" }),
                    },
                  );
                  const json = (await res.json()) as { ok: boolean; message?: string };
                  setLoadingId(null);
                  if (!res.ok || !json.ok) {
                    setError(json.message ?? "Falha ao resolver pendência.");
                    return;
                  }
                  router.refresh();
                }}
              >
                {loadingId === i.id ? "Salvando..." : "Resolver"}
              </button>

              <button
                type="button"
                disabled={loadingId === i.id}
                className="h-9 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-950 transition hover:bg-zinc-50 disabled:opacity-60"
                onClick={async () => {
                  setLoadingId(i.id);
                  setError(null);
                  const res = await fetch(
                    `/api/statements/${statementId}/issues/${i.id}`,
                    {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "ignore" }),
                    },
                  );
                  const json = (await res.json()) as { ok: boolean; message?: string };
                  setLoadingId(null);
                  if (!res.ok || !json.ok) {
                    setError(json.message ?? "Falha ao ignorar pendência.");
                    return;
                  }
                  router.refresh();
                }}
              >
                Ignorar
              </button>
            </div>
          </div>
        ))}

        {!issues.length ? (
          <div className="text-sm text-zinc-600">Nenhuma pendência aberta.</div>
        ) : null}
      </div>
    </div>
  );
}

