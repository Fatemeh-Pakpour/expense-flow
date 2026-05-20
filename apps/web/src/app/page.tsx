import { getApiHealth } from '@/lib/api';

export default async function Home() {
  const health = await getApiHealth();

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

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">System status</h2>

          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-slate-400">API</dt>
              <dd className="mt-1 font-medium text-emerald-400">
                {health.api}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-400">Database</dt>
              <dd className="mt-1 font-medium text-emerald-400">
                {health.database}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-400">Checked at</dt>
              <dd className="mt-1 font-medium">{health.timestamp}</dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  );
}