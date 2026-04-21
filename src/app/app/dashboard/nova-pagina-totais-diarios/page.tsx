import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TransactionsByBankTable } from "@/app/app/dashboard/TransactionsByBankTable";

export default async function NovaPaginaTotaisDiariosPage() {
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
        <h1 className="text-xl font-semibold tracking-tight text-zinc-950">Transações</h1>
        <p className="text-sm text-zinc-600">
          Listagem por empresa e banco com exportação em CSV/TXT.
        </p>
      </div>

      <TransactionsByBankTable entities={entities} />
    </div>
  );
}
