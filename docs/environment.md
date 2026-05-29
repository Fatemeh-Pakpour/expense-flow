# Environment Variables

This repo has separate apps, so each app owns its own environment file.

```txt
apps/web/.env.local
apps/api/.env
```

Commit only `.env.example` files. Real `.env` files stay local or live in the production platform's secret manager.

## Local Development

Create local files from the examples:

```txt
apps/web/.env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

```txt
apps/api/.env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/expense_flow
FRONTEND_URL=http://localhost:3000
PORT=3001
```

## Production

Set production values in your hosting platform, Docker runtime, CI/CD secrets, or process manager.

API runtime variables:

```txt
DATABASE_URL
FRONTEND_URL
PORT
```

Web build-time public variable:

```txt
NEXT_PUBLIC_API_BASE_URL
```

## Build Time vs Runtime

In Next.js, variables without `NEXT_PUBLIC_` are server-only. Variables with `NEXT_PUBLIC_` are exposed to the browser and inlined into the JavaScript bundle during `next build`.

That means `NEXT_PUBLIC_API_BASE_URL` must be correct when you build the web app. If you build one image and promote it from staging to production, do not use `NEXT_PUBLIC_` for values that need to change after build. Instead, read runtime values on the server, for example in a Server Component, Route Handler, or server action.

Reference: https://nextjs.org/docs/app/guides/environment-variables#runtime-environment-variables
