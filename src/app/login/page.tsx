import { redirect } from "next/navigation";

import { LoginForm } from "@/app/login/LoginForm";
import { getServerAuthSession } from "@/auth";

export default async function LoginPage() {
  const session = await getServerAuthSession();
  if (session?.user) redirect("/app/dashboard");

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
            Extrato Inteligente
          </h1>
          <p className="text-sm text-zinc-600">
            Acesse para processar extratos em PDF e gerar transações estruturadas.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
