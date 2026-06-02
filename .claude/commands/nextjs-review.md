# Next.js 16 Architecture Review

Step 1: Call the Context7 'query-docs' tool directly with library ID `/vercel/next.js/v16.2.2`
and query "App Router Server Components async APIs cookies headers params searchParams
Turbopack proxy.ts middleware globalNotFound caching PPR React 19 use Actions useOptimistic".
Do NOT call resolve-library-id first — use the versioned ID as-is so docs are scoped to Next.js 16.

Step 2: Scan my project files:
!`find . -type f \( -name "*.tsx" -o -name "*.ts" \) | grep -v node_modules | grep -v .next | head -60`

Step 3: Also show the folder structure:
!`find . -type d | grep -v node_modules | grep -v .next | grep -v .git`

Step 4: Review my architecture against the fetched docs. Check:
- Async APIs — cookies(), headers(), params, searchParams must all be awaited
- Turbopack config must be top-level in next.config.ts, not inside experimental
- proxy.ts replacing middleware.ts
- Server vs Client Component boundaries (minimize "use client")
- Cache Components and PPR usage
- React 19 patterns — use(), Actions, useOptimistic, useFormStatus
- TypeScript strictness, no `any`
- File/folder naming conventions for App Router

Step 5: Give a final verdict for a senior frontend challenge submission.
Rate each area: ✅ Good / ⚠️ Needs improvement / ❌ Critical issue