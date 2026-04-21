import Link from "next/link";
import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function EntitiesPage() {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  const role = session?.user.role;
  if (!clientId) return null;

  if (role !== "CLIENT_ADMIN" && role !== "ADMIN_SAAS") redirect("/app/dashboard");

  const entities = await prisma.entity.findMany({
    where: { clientId },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, updatedAt: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-950">Entidades</h1>
          <p className="text-sm text-zinc-600">Empresas/mercados associados ao cliente.</p>
        </div>
        <Link
          href="/app/entities/new"
          className="h-10 rounded-xl bg-zinc-950 px-4 text-sm font-medium text-white transition"
        >
          Nova entidade
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Atualizado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {entities.map((e) => (
              <tr key={e.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <Link className="font-medium text-zinc-950" href={`/app/entities/${e.id}`}>
                    {e.nome}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-700">
                  {new Date(e.updatedAt).toISOString().replace("T", " ").slice(0, 16)}
                </td>
              </tr>
            ))}
            {!entities.length ? (
              <tr>
                <td className="px-4 py-6 text-zinc-600" colSpan={2}>
                  Nenhuma entidade cadastrada.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
