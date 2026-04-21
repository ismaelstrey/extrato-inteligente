import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DailyTotalsTable } from "@/app/app/dashboard/DailyTotalsTable";

export default async function TotaisDiariosPage() {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  if (!clientId) return null;

  const entities = await prisma.entity.findMany({
    where: { clientId },
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-950">Totais diários</h1>
        <p className="text-sm text-zinc-600">
          Selecione a entidade e o banco para ver o total por dia (entradas ou saídas).
        </p>
      </div>

      <DailyTotalsTable entities={entities} />
    </div>
  );
}
