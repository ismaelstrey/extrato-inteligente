import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UserForm } from "@/app/app/users/UserForm";

export default async function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const session = await getServerAuthSession();
  const clientId = session?.user.clientId;
  const role = session?.user.role;
  if (!session?.user || !clientId) redirect("/login");
  if (role !== "CLIENT_ADMIN" && role !== "ADMIN_SAAS") redirect("/app/dashboard");

  const { userId } = await params;

  const user = await prisma.user.findFirst({
    where: role === "ADMIN_SAAS" ? { id: userId } : { id: userId, clientId },
    select: { id: true, email: true, name: true, role: true, active: true, twoFactorEnabled: true },
  });

  if (!user) redirect("/app/users");

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-zinc-900">Usuário</h1>
        <p className="text-sm text-zinc-600">{user.email}</p>
      </div>
      <UserForm
        mode="edit"
        userId={user.id}
        isAdminSaas={role === "ADMIN_SAAS"}
        initial={{
          name: user.name ?? "",
          role: user.role as "USER" | "CLIENT_ADMIN" | "ADMIN_SAAS",
          active: user.active,
          twoFactorEnabled: user.twoFactorEnabled,
        }}
      />
    </div>
  );
}
