import Link from "next/link";
import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function ClientsPage() {
  const session = await getServerAuthSession();
  const role = session?.user.role;
  if (!session?.user) redirect("/login");
  if (role !== "ADMIN_SAAS") redirect("/app/dashboard");

  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, nome: true, createdAt: true, _count: { select: { users: true, entities: true } } },
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-zinc-900">Clientes</h1>
          <p className="text-sm text-zinc-600">Gestão SaaS.</p>
        </div>
        <Link
          href="/app/clients/new"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-medium text-white"
        >
          Novo cliente
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-600">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Usuários</th>
              <th className="px-4 py-3 font-medium">Entidades</th>
              <th className="px-4 py-3 font-medium">Criado em</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-t border-zinc-100">
                <td className="px-4 py-3">
                  <Link className="text-zinc-900 hover:underline" href={`/app/clients/${c.id}`}>
                    {c.nome}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-700">{c._count.users}</td>
                <td className="px-4 py-3 text-zinc-700">{c._count.entities}</td>
                <td className="px-4 py-3 text-zinc-700">{c.createdAt.toISOString().slice(0, 10)}</td>
              </tr>
            ))}
            {clients.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-zinc-500" colSpan={4}>
                  Nenhum cliente encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

