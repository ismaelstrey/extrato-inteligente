import Link from "next/link";
import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function UsersPage() {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  const role = session?.user.role;
  if (!session?.user || !clientId) redirect("/login");
  if (role !== "CLIENT_ADMIN" && role !== "ADMIN_SAAS") redirect("/app/dashboard");

  if (role === "ADMIN_SAAS") {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        twoFactorEnabled: true,
        client: { select: { id: true, nome: true } },
      },
    });

    return (
      <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-zinc-900">Usuários</h1>
            <p className="text-sm text-zinc-600">Gerencie permissões e 2FA.</p>
          </div>
          <Link
            href="/app/users/new"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-medium text-white"
          >
            Novo usuário
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-600">
              <tr>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Ativo</th>
                <th className="px-4 py-3 font-medium">2FA</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-zinc-100">
                  <td className="px-4 py-3 text-zinc-700">
                    <Link className="text-zinc-900 hover:underline" href={`/app/clients/${u.client.id}`}>
                      {u.client.nome}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link className="text-zinc-900 hover:underline" href={`/app/users/${u.id}`}>
                      {u.email}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{u.name ?? "-"}</td>
                  <td className="px-4 py-3 text-zinc-700">{u.role}</td>
                  <td className="px-4 py-3 text-zinc-700">{u.active ? "Sim" : "Não"}</td>
                  <td className="px-4 py-3 text-zinc-700">{u.twoFactorEnabled ? "Sim" : "Não"}</td>
                </tr>
              ))}
              {users.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-zinc-500" colSpan={6}>
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const users = await prisma.user.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, role: true, active: true, twoFactorEnabled: true },
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-zinc-900">Usuários</h1>
          <p className="text-sm text-zinc-600">Gerencie permissões e 2FA.</p>
        </div>
        <Link
          href="/app/users/new"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-medium text-white"
        >
          Novo usuário
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-600">
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Ativo</th>
              <th className="px-4 py-3 font-medium">2FA</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-zinc-100">
                <td className="px-4 py-3">
                  <Link className="text-zinc-900 hover:underline" href={`/app/users/${u.id}`}>
                    {u.email}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-700">{u.name ?? "-"}</td>
                <td className="px-4 py-3 text-zinc-700">{u.role}</td>
                <td className="px-4 py-3 text-zinc-700">{u.active ? "Sim" : "Não"}</td>
                <td className="px-4 py-3 text-zinc-700">{u.twoFactorEnabled ? "Sim" : "Não"}</td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-zinc-500" colSpan={5}>
                  Nenhum usuário encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
