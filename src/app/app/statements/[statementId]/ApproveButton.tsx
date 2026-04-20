"use client";

import { useState } from "react";

export function ApproveButton({
  statementId,
  disabled,
}: {
  statementId: string;
  disabled: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled || loading || done}
        className="h-10 rounded-xl bg-zinc-950 px-4 text-sm font-medium text-white transition disabled:opacity-60"
        onClick={async () => {
          setLoading(true);
          setError(null);
          const res = await fetch(`/api/statements/${statementId}/approve`, { method: "POST" });
          const json = (await res.json()) as { ok: boolean; message?: string };
          setLoading(false);

          if (!res.ok || !json.ok) {
            setError(json.message ?? "Falha ao aprovar.");
            return;
          }

          setDone(true);
        }}
      >
        {done ? "Aprovado" : loading ? "Aprovando..." : "Aprovar extrato"}
      </button>
      {error ? <div className="text-sm text-red-700">{error}</div> : null}
    </div>
  );
}

