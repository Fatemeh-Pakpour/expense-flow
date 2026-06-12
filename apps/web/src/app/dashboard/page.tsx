import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { SignOutButton } from "@/components/auth/sign-out-button"

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/")

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <section className="mx-auto max-w-4xl">
        <p className="mb-3 text-sm font-medium text-emerald-400">ExpenseFlow</p>
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
        <div className="mt-8 rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold text-slate-100">
            Welcome back, {session.user.name ?? "User"}
          </h2>
          <p className="mt-1 text-sm text-slate-400">{session.user.email}</p>
          <p className="mt-1 text-xs text-slate-600">ID: {session.user.id}</p>
        </div>
        <div className="mt-6">
          <SignOutButton />
        </div>
      </section>
    </main>
  )
}
