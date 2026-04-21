import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ClientForm } from "@/app/app/clients/ClientForm";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const session = await getServerAuthSession();
  const role = session?.user.role;
  if (!session?.user) redirect("/login");
  if (role !== "ADMIN_SAAS") redirect("/app/dashboard");

  const { clientId } = await params;

  const client = await prisma.client.findFirst({
    where: { id: clientId },
    select: { id: true, nome: true },
  });
  if (!client) redirect("/app/clients");

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-zinc-900">Cliente</h1>
        <p className="text-sm text-zinc-600">{client.id}</p>
      </div>
      <ClientForm mode="edit" clientId={client.id} initial={{ nome: client.nome }} />
    </div>
  );
}
