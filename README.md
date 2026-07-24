# StockHawk

Private, local-first Jellycat catalog and availability application.

## Prerequisites

- Node.js `24.11.1`
- Corepack with pnpm `11.13.0`
- PostgreSQL on loopback

## Bootstrap

```sh
corepack pnpm install --frozen-lockfile
createdb -h 127.0.0.1 stockhawk
DATABASE_URL=postgres://127.0.0.1:5432/stockhawk corepack pnpm migrate
DATABASE_URL=postgres://127.0.0.1:5432/stockhawk corepack pnpm seed:sites
DATABASE_URL=postgres://127.0.0.1:5432/stockhawk corepack pnpm seed:synthetic
corepack pnpm build
```

Run the API and worker in separate terminals. The API serves `apps/web/dist` and binds only to loopback.

```sh
DATABASE_URL=postgres://127.0.0.1:5432/stockhawk corepack pnpm --filter @stockhawk/worker start
DATABASE_URL=postgres://127.0.0.1:5432/stockhawk \
  APP_ORIGINS=http://127.0.0.1:3100 \
  corepack pnpm start
```

Open `http://127.0.0.1:3100` for local development. `APP_ORIGINS` is the
comma-separated allowlist of exact application origins accepted for mutations;
every non-loopback origin must use HTTPS.

Production uses Tailscale Serve as the sole ingress to the loopback API. Apply a
deny-by-default Tailscale Grant for approved owner devices and keep Funnel,
subnet routing, exit-node use, alternate LAN proxies, and router forwarding
disabled. StockHawk intentionally has no application account, password, login,
or session; do not add application authentication without a new architecture
decision.

`GET /api/readiness` reports API, database, and worker independently.
`GET /api/offers` reads transactional Search Documents. The Health refresh
command requires the configured exact Origin and same-origin Fetch Metadata and
reports only queued intent until the worker completes its durable receipt. The
Seed List import verifies the checked-in workbook hash, preserves all 2,712
source rows, deterministically reconciles them to 2,489 pre-audit Candidate
Sites, and opens one suspended Onboarding Case. The Health page exposes this
progress; its resume/re-audit command uses the same durable optimistic boundary.
The Seed List import is idempotent. The
synthetic seed is idempotent and exists only to demonstrate the first
exact-variant Offer tracer path.

## Verification

```sh
corepack pnpm verify
DATABASE_URL=postgres://127.0.0.1:5432/stockhawk corepack pnpm test:integration
DATABASE_URL=postgres://127.0.0.1:5432/postgres corepack pnpm test:e2e
```

`test:integration` migrates the configured database before running the real
PostgreSQL suites. Persistence suites create temporary databases to verify
writes, transactions, rollbacks, queues, row locks, and concurrency, then drop
them after the run. The configured PostgreSQL user must be allowed to create
databases.

`test:e2e` builds the application, provisions another temporary database, and
runs the owner-command flow plus axe checks through Chromium,
Fastify, and the worker.

Migrations, real-database integration, browser/live checks, backup/restore,
evidence, and release tasks are intentionally never cached.

Database schema and queries use exact-pinned Drizzle ORM. `pnpm --filter @stockhawk/database db:generate` regenerates reviewed SQL migrations.

TypeScript is exact-pinned at `7.0.2`. Oxlint owns TypeScript, React, Query, and Tailwind source checks. Strict peers remain enabled; pnpm allows only this exact TypeScript version for the ESLint-compatible Query/Tailwind rule packages whose published peer metadata predates TypeScript 7.

pg-boss is exact-pinned at `12.26.2`, and its schema-37 migration is checked in.
The bundled Drizzle adapter expects Drizzle 1's result shape, so StockHawk owns a
narrow adapter for pinned Drizzle `0.45.2`; real-PostgreSQL integration tests
cover the exact pair without weakening peer checks.
