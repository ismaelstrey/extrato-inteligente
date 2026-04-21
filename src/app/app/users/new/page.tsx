import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/auth";
import { UserForm } from "@/app/app/users/UserForm";

export default async function NewUserPage() {
  const session = await getServerAuthSession();
  const role = session?.user.role;
  if (!session?.user) redirect("/login");
  if (role !== "CLIENT_ADMIN" && role !== "ADMIN_SAAS") redirect("/app/dashboard");

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-zinc-900">Novo Usuário</h1>
        <p className="text-sm text-zinc-600">Crie um usuário e defina permissões.</p>
      </div>
      <UserForm
        mode="create"
        isAdminSaas={role === "ADMIN_SAAS"}
        initial={{
          email: "",
          name: "",
          role: "USER",
          active: true,
          twoFactorEnabled: false,
          clientId: "",
        }}
      />
    </div>
  );
}
