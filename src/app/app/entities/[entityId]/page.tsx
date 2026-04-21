import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EntityForm } from "@/app/app/entities/EntityForm";

export default async function EditEntityPage({
  params,
}: {
  params: Promise<{ entityId: string }>;
}) {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  const role = session?.user.role;
  if (!clientId) return null;

  if (role !== "CLIENT_ADMIN" && role !== "ADMIN_SAAS") redirect("/app/dashboard");

  const { entityId } = await params;

  const entity = await prisma.entity.findFirst({
    where: { id: entityId, clientId },
    select: { id: true, nome: true },
  });

  if (!entity) notFound();

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-zinc-500">
          <Link className="underline underline-offset-4" href="/app/entities">
            Entidades
          </Link>{" "}
          / {entity.nome}
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-950">Editar entidade</h1>
        <p className="mt-1 text-sm text-zinc-600">Atualize o nome da entidade.</p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <EntityForm mode="edit" entityId={entity.id} initial={{ nome: entity.nome }} />
      </div>
    </div>
  );
}
