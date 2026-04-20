import Link from "next/link";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function StatementsPage() {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  if (!clientId) return null;

  const statements = await prisma.statement.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      status: true,
      createdAt: true,
      periodStart: true,
      periodEnd: true,
      entity: { select: { nome: true } },
      template: { select: { nome: true } },
      _count: { select: { transactions: true, issues: true } },
    },
  });

  const statementIds = statements.map((s) => s.id);

  const issuesOpen = statementIds.length
    ? await prisma.extractionIssue.groupBy({
        by: ["statementId"],
        where: { statementId: { in: statementIds }, status: "OPEN" },
        _count: { _all: true },
      })
    : [];

  const issuesOpenByStatementId = new Map(issuesOpen.map((i) => [i.statementId, i._count._all]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-950">Extratos</h1>
        <p className="text-sm text-zinc-600">Histórico de uploads e processamento.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Entidade</th>
              <th className="px-4 py-3">Período</th>
              <th className="px-4 py-3">Template</th>
              <th className="px-4 py-3">Transações</th>
              <th className="px-4 py-3">Pendências</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {statements.map((s) => {
              const period =
                s.periodStart && s.periodEnd
                  ? `${s.periodStart.toISOString().slice(0, 10)} → ${s.periodEnd
                      .toISOString()
                      .slice(0, 10)}`
                  : "—";
              const open = issuesOpenByStatementId.get(s.id) ?? 0;
              return (
                <tr key={s.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link className="font-medium text-zinc-950" href={`/app/statements/${s.id}`}>
                      {s.entity.nome}
                    </Link>
                    <div className="text-xs text-zinc-500">
                      {new Date(s.createdAt).toISOString().replace("T", " ").slice(0, 16)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{period}</td>
                  <td className="px-4 py-3 text-zinc-700">{s.template?.nome ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-700">{s._count.transactions}</td>
                  <td className="px-4 py-3 text-zinc-700">
                    {open} / {s._count.issues}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{s.status}</td>
                </tr>
              );
            })}
            {!statements.length ? (
              <tr>
                <td className="px-4 py-6 text-zinc-600" colSpan={6}>
                  Nenhum extrato processado ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

