"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/app/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorStep, setTwoFactorStep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="w-full max-w-sm space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const res = await signIn("credentials", {
          redirect: false,
          email,
          password,
          ...(twoFactorStep ? { twoFactorCode } : {}),
          callbackUrl,
        });

        setLoading(false);

        if (!res || res.error) {
          if (res?.error === "2FA_REQUIRED") {
            setTwoFactorStep(true);
            setError("Código enviado para seu email.");
            return;
          }
          if (res?.error === "2FA_INVALID") {
            setTwoFactorStep(true);
            setError("Código inválido ou expirado.");
            return;
          }
          if (res?.error === "2FA_UNAVAILABLE") {
            setError("2FA indisponível: configure SMTP no servidor.");
            return;
          }
          if (res?.error === "2FA_DELIVERY_FAILED") {
            setError("Falha ao enviar o código de verificação.");
            return;
          }
          setError("Email ou senha inválidos.");
          return;
        }

        router.push(res.url ?? callbackUrl);
      }}
    >
      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-900" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-0 focus:border-zinc-300"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-900" htmlFor="password">
          Senha
        </label>
        <input
          id="password"
          className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-0 focus:border-zinc-300"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {twoFactorStep ? (
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-900" htmlFor="twoFactorCode">
            Código (2FA)
          </label>
          <input
            id="twoFactorCode"
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-0 focus:border-zinc-300"
            inputMode="numeric"
            value={twoFactorCode}
            onChange={(e) => setTwoFactorCode(e.target.value)}
            required
          />
        </div>
      ) : null}
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <p className="text-xs text-zinc-500">
          Se você ainda não tem usuário, crie via seed no banco.
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="h-11 w-full rounded-xl bg-zinc-950 px-4 text-sm font-medium text-white transition disabled:opacity-60"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
