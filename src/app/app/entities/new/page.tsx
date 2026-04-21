import Link from "next/link";
import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/auth";
import { EntityForm } from "@/app/app/entities/EntityForm";

export default async function NewEntityPage() {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  const role = session?.user.role;
  if (!clientId) return null;

  if (role !== "CLIENT_ADMIN" && role !== "ADMIN_SAAS") redirect("/app/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-zinc-500">
          <Link className="underline underline-offset-4" href="/app/entities">
            Entidades
          </Link>{" "}
          / Nova
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-950">Nova entidade</h1>
        <p className="mt-1 text-sm text-zinc-600">Cadastre uma empresa/mercado para associar extratos.</p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <EntityForm mode="create" initial={{ nome: "" }} />
      </div>
    </div>
  );
}
