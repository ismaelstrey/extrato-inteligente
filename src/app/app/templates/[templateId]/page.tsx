import { notFound, redirect } from "next/navigation";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TemplateForm } from "@/app/app/templates/TemplateForm";

export default async function EditTemplatePage({
  params,
}: {
  params: { templateId: string };
}) {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  const role = session?.user.role;
  if (!clientId) return null;
  if (role !== "CLIENT_ADMIN" && role !== "ADMIN_SAAS") redirect("/app/dashboard");

  const template = await prisma.template.findFirst({
    where: { id: params.templateId, clientId },
    select: { id: true, nome: true, identificador: true, regexData: true, regexValor: true, regexDescricao: true },
  });

  if (!template) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-950">Editar template</h1>
        <p className="text-sm text-zinc-600">Atualize o identificador e as regex.</p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <TemplateForm
          mode="edit"
          templateId={template.id}
          initial={{
            nome: template.nome,
            identificador: template.identificador,
            regexData: template.regexData,
            regexValor: template.regexValor,
            regexDescricao: template.regexDescricao,
          }}
        />
      </div>
    </div>
  );
}

