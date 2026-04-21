"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Role = "USER" | "CLIENT_ADMIN" | "ADMIN_SAAS";

type Props = {
  mode: "create" | "edit";
  userId?: string;
  isAdminSaas?: boolean;
  initial: {
    email?: string;
    name: string;
    role: Role;
    active: boolean;
    twoFactorEnabled: boolean;
    clientId?: string;
  };
};

export function UserForm({ mode, userId, initial, isAdminSaas }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState(initial.email ?? "");
  const [name, setName] = useState(initial.name);
  const [role, setRole] = useState<Role>(initial.role);
  const [active, setActive] = useState(initial.active);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(initial.twoFactorEnabled);
  const [clientId, setClientId] = useState(initial.clientId ?? "");
  const [password, setPassword] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        const url = mode === "create" ? "/api/users" : `/api/users/${userId}`;
        const method = mode === "create" ? "POST" : "PATCH";

        const payload: Record<string, unknown> = {
          name,
          role,
          active,
          twoFactorEnabled,
        };

        if (mode === "create") {
          payload.email = email;
          payload.password = password;
          if (isAdminSaas) payload.clientId = clientId;
        } else {
          if (password.trim()) payload.password = password;
        }

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
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

        const id = mode === "create" ? json.id : userId;
        router.push(`/app/users/${id}`);
        router.refresh();
      }}
    >
      {mode === "create" ? (
        <>
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-900" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-0 focus:border-zinc-300"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </>
      ) : null}
      {mode === "create" && isAdminSaas ? (
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-900" htmlFor="clientId">
            ClientId
          </label>
          <input
            id="clientId"
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-0 focus:border-zinc-300"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
          />
        </div>
      ) : null}

      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-900" htmlFor="name">
          Nome
        </label>
        <input
          id="name"
          className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-0 focus:border-zinc-300"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-900" htmlFor="role">
          Role
        </label>
        <select
          id="role"
          className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-0 focus:border-zinc-300"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
        >
          <option value="USER">USER</option>
          <option value="CLIENT_ADMIN">CLIENT_ADMIN</option>
          <option value="ADMIN_SAAS">ADMIN_SAAS</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-900" htmlFor="password">
          {mode === "create" ? "Senha" : "Nova senha (opcional)"}
        </label>
        <input
          id="password"
          className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-0 focus:border-zinc-300"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required={mode === "create"}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Ativo
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={twoFactorEnabled}
            onChange={(e) => setTwoFactorEnabled(e.target.checked)}
          />
          2FA habilitado (email)
        </label>
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
            disabled={deactivating}
            className="h-11 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-950 transition hover:bg-zinc-50 disabled:opacity-60"
            onClick={async () => {
              setDeactivating(true);
              setError(null);
              const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
              const json = (await res.json().catch(() => null)) as
                | { ok: true }
                | { ok: false; message: string }
                | null;
              setDeactivating(false);
              if (!res.ok || !json || !json.ok) {
                setError((json && "message" in json ? json.message : null) ?? "Falha ao desativar.");
                return;
              }
              router.push("/app/users");
              router.refresh();
            }}
          >
            {deactivating ? "Desativando..." : "Desativar"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
