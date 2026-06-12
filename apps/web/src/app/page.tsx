import { SignInButton } from "@/components/auth/sign-in-button"

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <section className="mx-auto max-w-4xl">
        <p className="mb-3 text-sm font-medium text-emerald-400">
          ExpenseFlow
        </p>
        <h1 className="text-4xl font-bold tracking-tight">
          Fullstack Expense Management Platform
        </h1>
        <p className="mt-4 max-w-2xl text-slate-300">
          A production-style SaaS portfolio project built with Next.js,
          NestJS, TypeScript, PostgreSQL, Prisma, and Docker.
        </p>
        <div className="mt-8">
          <SignInButton />
        </div>
      </section>
    </main>
  )
}
