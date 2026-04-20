"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteStatementButton({ statementId }: { statementId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={loading}
        className="h-10 rounded-xl border border-red-200 bg-white px-4 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
        onClick={async () => {
          const ok = window.confirm(
            "Excluir este extrato? Isso removerá também as transações vinculadas a ele.",
          );
          if (!ok) return;

          setLoading(true);
          setError(null);

          const res = await fetch(`/api/statements/${statementId}`, { method: "DELETE" });
          const json = (await res.json().catch(() => null)) as { ok: boolean; message?: string } | null;

          setLoading(false);

          if (!res.ok || !json?.ok) {
            setError(json?.message ?? "Falha ao excluir.");
            return;
          }

          router.push("/app/statements");
          router.refresh();
        }}
      >
        {loading ? "Excluindo..." : "Excluir extrato"}
      </button>
      {error ? <div className="text-sm text-red-700">{error}</div> : null}
    </div>
  );
}

