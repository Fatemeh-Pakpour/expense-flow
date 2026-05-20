# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Expense Flow is a fullstack expense management platform. It is a **pnpm monorepo** with two apps:

- `apps/web` — Next.js 16 frontend (React 19, Tailwind CSS v4, TypeScript)
- `apps/api` — NestJS 11 backend (TypeScript, Prisma v6, PostgreSQL)

## Package Manager

This project uses **pnpm v11** with workspaces. Always use `pnpm`, never `npm` or `yarn`.

To target a specific workspace: `pnpm --filter web <script>` or `pnpm --filter api <script>`

## Common Commands

```bash
# Install dependencies
pnpm install

# Development (runs both apps in parallel)
pnpm dev

# Run individual apps
pnpm dev:web
pnpm dev:api

# Build all
pnpm build

# Lint all
pnpm lint

# Type check all
pnpm typecheck
```

### Database (requires Docker)

```bash
pnpm db:up        # Start PostgreSQL container
pnpm db:down      # Stop PostgreSQL container
pnpm db:logs      # Tail PostgreSQL logs
pnpm db:migrate   # Run Prisma migrations
pnpm db:studio    # Open Prisma Studio
```

### Prisma (run from repo root)

```bash
pnpm --filter api exec prisma generate    # Regenerate client after schema changes
pnpm --filter api exec prisma migrate dev # Create and apply a new migration
```

## Architecture

### API (`apps/api`)

NestJS application with a standard module structure. Entry point: `src/main.ts`, listens on `PORT` env var (default 3000).

- **PrismaService** (`src/prisma/prisma.service.ts`) extends `PrismaClient` and handles connect/disconnect lifecycle. Inject this into feature modules to access the database.
- **Prisma schema** lives at `prisma/schema.prisma`. This is Prisma v6 — the datasource `url` is configured in `prisma.config.ts` (not in the schema), and `.env` is loaded via `import "dotenv/config"` in `prisma.config.ts`.
- Domain models: `User` (with `EMPLOYEE | MANAGER | ADMIN` roles) and `Expense` (with `DRAFT | SUBMITTED | APPROVED | REJECTED` statuses).

### Web (`apps/web`)

Next.js App Router application. Currently scaffolded — feature pages go under `src/app/`.

## Environment Variables

Copy `apps/api/.env` and set:

```env
DATABASE_URL="postgresql://expense_user:expense_password@localhost:5432/expense_flow"
```

The Docker Compose file at the repo root starts a PostgreSQL container pre-configured with these credentials.

## pnpm Workspace Notes

- `pnpm-workspace.yaml` at the root defines `apps/*` and `packages/*` as workspace members.
- Build script approvals (`allowBuilds`) for `@nestjs/core`, `sharp`, and `unrs-resolver` are declared in `pnpm-workspace.yaml`.
- Line endings are enforced to LF via `.gitattributes`.
