"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReconcileButton({ statementId }: { statementId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={loading}
        className="h-10 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-950 transition hover:bg-zinc-50 disabled:opacity-60"
        onClick={async () => {
          setLoading(true);
          setError(null);
          const res = await fetch(`/api/statements/${statementId}/reconcile`, { method: "POST" });
          const json = (await res.json()) as { ok: boolean; message?: string };
          setLoading(false);

          if (!res.ok || !json.ok) {
            setError(json.message ?? "Falha ao recalcular.");
            return;
          }

          router.refresh();
        }}
      >
        {loading ? "Recalculando..." : "Recalcular conciliação"}
      </button>
      {error ? <div className="text-sm text-red-700">{error}</div> : null}
    </div>
  );
}

