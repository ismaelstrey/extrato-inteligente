import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/auth";
import { TemplateForm } from "@/app/app/templates/TemplateForm";

export default async function NewTemplatePage() {
  const session = await getServerAuthSession();
  const role = session?.user.role;
  if (!session?.user) return null;
  if (role !== "CLIENT_ADMIN" && role !== "ADMIN_SAAS") redirect("/app/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-950">Novo template</h1>
        <p className="text-sm text-zinc-600">Configure o identificador e as regex.</p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <TemplateForm
          mode="create"
          initial={{
            nome: "",
            identificador: "",
            regexData: "(\\\\d{2}\\\\/\\\\d{2}\\\\/\\\\d{4})",
            regexValor: "(-?\\\\(?\\\\d{1,3}(?:\\\\.\\\\d{3})*(?:,\\\\d{2})\\\\)?)",
            regexDescricao:
              "(?:\\\\d{2}\\\\/\\\\d{2}\\\\/\\\\d{4})\\\\s+(.+?)\\\\s+(-?\\\\(?\\\\d{1,3}(?:\\\\.\\\\d{3})*(?:,\\\\d{2})\\\\)?)$",
          }}
        />
      </div>
    </div>
  );
}

