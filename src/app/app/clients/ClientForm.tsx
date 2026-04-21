"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  mode: "create" | "edit";
  clientId?: string;
  initial: { nome: string };
};

export function ClientForm({ mode, clientId, initial }: Props) {
  const router = useRouter();
  const [nome, setNome] = useState(initial.nome);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        const url = mode === "create" ? "/api/clients" : `/api/clients/${clientId}`;
        const method = mode === "create" ? "POST" : "PATCH";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome }),
        });
        const json = (await res.json().catch(() => null)) as
          | { ok: true; id?: string }
          | { ok: false; message: string }
          | null;

        setSaving(false);

        if (!res.ok || !json || !json.ok) {
          setError((json && "message" in json ? json.message : null) ?? "Falha ao salvar.");
          return;
        }

        const id = mode === "create" ? json.id : clientId;
        router.push(`/app/clients/${id}`);
        router.refresh();
      }}
    >
      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-900" htmlFor="nome">
          Nome
        </label>
        <input
          id="nome"
          className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-0 focus:border-zinc-300"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
      </div>

      {error ? <div className="text-sm text-red-700">{error}</div> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={saving}
          className="h-11 rounded-xl bg-zinc-950 px-4 text-sm font-medium text-white transition disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>

        {mode === "edit" ? (
          <button
            type="button"
            disabled={deleting}
            className="h-11 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-950 transition hover:bg-zinc-50 disabled:opacity-60"
            onClick={async () => {
              setDeleting(true);
              setError(null);
              const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
              const json = (await res.json().catch(() => null)) as
                | { ok: true }
                | { ok: false; message: string }
                | null;
              setDeleting(false);
              if (!res.ok || !json || !json.ok) {
                setError((json && "message" in json ? json.message : null) ?? "Falha ao excluir.");
                return;
              }
              router.push("/app/clients");
              router.refresh();
            }}
          >
            {deleting ? "Excluindo..." : "Excluir"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
