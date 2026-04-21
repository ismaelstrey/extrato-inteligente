import Link from "next/link";
import { notFound } from "next/navigation";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ApproveButton } from "@/app/app/statements/[statementId]/ApproveButton";
import { IssuesPanel } from "@/app/app/statements/[statementId]/IssuesPanel";
import { ReconcileButton } from "@/app/app/statements/[statementId]/ReconcileButton";
import { TransactionsTable } from "@/app/app/statements/[statementId]/TransactionsTable";
import { DeleteStatementButton } from "@/app/app/statements/[statementId]/DeleteStatementButton";

export default async function StatementDetailPage({
  params,
}: {
  params: Promise<{ statementId: string }>;
}) {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  if (!clientId) return null;

  const { statementId } = await params;

  const statement = await prisma.statement.findFirst({
    where: { id: statementId, clientId },
    select: {
      id: true,
      status: true,
      periodStart: true,
      periodEnd: true,
      createdAt: true,
      entity: { select: { id: true, nome: true } },
      template: { select: { nome: true } },
    },
  });

  if (!statement) notFound();

  const issues = await prisma.extractionIssue.findMany({
    where: { statementId: statement.id, status: "OPEN" },
    orderBy: [{ severity: "desc" }, { createdAt: "asc" }],
    select: { id: true, type: true, severity: true, payload: true },
  });

  const transactions = await prisma.transaction.findMany({
    where: { statementId: statement.id },
    orderBy: { data: "asc" },
    select: { id: true, data: true, descricao: true, categoria: true, tipo: true, valor: true },
  });

  const hasHighIssues = issues.some((i) => i.severity === "HIGH");

  const period =
    statement.periodStart && statement.periodEnd
      ? `${statement.periodStart.toISOString().slice(0, 10)} → ${statement.periodEnd
          .toISOString()
          .slice(0, 10)}`
      : "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm text-zinc-500">
            <Link className="underline underline-offset-4" href="/app/statements">
              Extratos
            </Link>{" "}
            / {statement.entity.nome}
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
            Revisão do extrato
          </h1>
          <div className="mt-1 text-sm text-zinc-600">
            Período: {period} · Status: {statement.status} · Template:{" "}
            {statement.template?.nome ?? "—"}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            className="h-10 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-950 transition hover:bg-zinc-50"
            href={`/api/statements/${statement.id}/export/csv`}
          >
            Exportar CSV
          </a>
          <a
            className="h-10 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-950 transition hover:bg-zinc-50"
            href={`/api/statements/${statement.id}/export/txt`}
          >
            Exportar TXT
          </a>
          <a
            className="h-10 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-950 transition hover:bg-zinc-50"
            href={`/api/statements/${statement.id}/export/ofx`}
          >
            Exportar OFX
          </a>
          <ReconcileButton statementId={statement.id} />
          <ApproveButton statementId={statement.id} disabled={hasHighIssues} />
          <DeleteStatementButton statementId={statement.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <IssuesPanel statementId={statement.id} issues={issues} />
        <TransactionsTable
          transactions={transactions.map((t) => ({
            id: t.id,
            data: t.data.toISOString().slice(0, 10),
            descricao: t.descricao,
            categoria: t.categoria,
            tipo: t.tipo,
            valor: String(t.valor),
          }))}
        />
      </div>
    </div>
  );
}
