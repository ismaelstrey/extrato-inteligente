import Link from "next/link";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UploadForm } from "@/app/app/upload/UploadForm";

export default async function UploadPage() {
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
        <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
          Upload de extrato
        </h1>
        <p className="text-sm text-zinc-600">
          Envie o PDF e o sistema tentará identificar o banco e aplicar o template
          automaticamente.
        </p>
      </div>

      {entities.length ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <UploadForm entities={entities} />
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700">
          Você ainda não tem entidades cadastradas. Cadastre uma entidade antes de
          fazer upload.{" "}
          <Link className="font-medium text-zinc-950" href="/app/entities">
            Ir para Entidades
          </Link>
        </div>
      )}
    </div>
  );
}
