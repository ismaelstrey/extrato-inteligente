import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/app/app/sign-out-button";
import { getServerAuthSession } from "@/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-full flex-1 bg-zinc-50">
      <div className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white p-5 md:block">
        <div className="mb-6">
          <div className="text-sm font-semibold text-zinc-950">
            Extrato Inteligente
          </div>
          <div className="text-xs text-zinc-500">{session.user.email}</div>
        </div>
        <nav className="space-y-1 text-sm">
          <Link
            href="/app/dashboard"
            className="block rounded-lg px-3 py-2 text-zinc-700 hover:bg-zinc-100"
          >
            Dashboard
          </Link>
          <Link
            href="/app/statements"
            className="block rounded-lg px-3 py-2 text-zinc-700 hover:bg-zinc-100"
          >
            Extratos
          </Link>
          <Link
            href="/app/templates"
            className="block rounded-lg px-3 py-2 text-zinc-700 hover:bg-zinc-100"
          >
            Templates
          </Link>
          <Link
            href="/app/upload"
            className="block rounded-lg px-3 py-2 text-zinc-700 hover:bg-zinc-100"
          >
            Upload
          </Link>
        </nav>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 md:px-6">
          <div className="text-sm font-medium text-zinc-900">
            {session.user.role}
          </div>
          <SignOutButton />
        </header>
        <main className="flex min-w-0 flex-1 flex-col px-4 py-6 md:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
