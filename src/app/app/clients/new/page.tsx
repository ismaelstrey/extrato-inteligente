import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/auth";
import { ClientForm } from "@/app/app/clients/ClientForm";

export default async function NewClientPage() {
  const session = await getServerAuthSession();
  const role = session?.user.role;
  if (!session?.user) redirect("/login");
  if (role !== "ADMIN_SAAS") redirect("/app/dashboard");

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-zinc-900">Novo Cliente</h1>
        <p className="text-sm text-zinc-600">Crie um cliente (tenant).</p>
      </div>
      <ClientForm mode="create" initial={{ nome: "" }} />
    </div>
  );
}
