import Link from "next/link";
import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function TemplatesPage() {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  const role = session?.user.role;
  if (!clientId) return null;

  if (role !== "CLIENT_ADMIN" && role !== "ADMIN_SAAS") redirect("/app/dashboard");

  const templates = await prisma.template.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    select: { id: true, nome: true, identificador: true, createdAt: true, updatedAt: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-950">Templates</h1>
          <p className="text-sm text-zinc-600">Cadastre regras (regex) por banco para extração.</p>
        </div>
        <Link
          href="/app/templates/new"
          className="h-10 rounded-xl bg-zinc-950 px-4 text-sm font-medium text-white transition"
        >
          Novo template
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Identificador</th>
              <th className="px-4 py-3">Atualizado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {templates.map((t) => (
              <tr key={t.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <Link className="font-medium text-zinc-950" href={`/app/templates/${t.id}`}>
                    {t.nome}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-700">{t.identificador}</td>
                <td className="px-4 py-3 text-zinc-700">
                  {new Date(t.updatedAt).toISOString().replace("T", " ").slice(0, 16)}
                </td>
              </tr>
            ))}
            {!templates.length ? (
              <tr>
                <td className="px-4 py-6 text-zinc-600" colSpan={3}>
                  Nenhum template cadastrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

