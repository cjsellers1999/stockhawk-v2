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
DATABASE_URL=postgres://127.0.0.1:5432/stockhawk corepack pnpm seed:synthetic
corepack pnpm build
```

Run the API and worker in separate terminals. The API serves `apps/web/dist` and binds only to loopback.

```sh
DATABASE_URL=postgres://127.0.0.1:5432/stockhawk corepack pnpm --filter @stockhawk/worker start
DATABASE_URL=postgres://127.0.0.1:5432/stockhawk corepack pnpm start
```

Open `http://127.0.0.1:3100`. `GET /api/readiness` reports API, database, and worker independently. `GET /api/offers` reads transactional Search Documents. The synthetic seed is idempotent and exists only to demonstrate the first exact-variant Offer tracer path.

## Verification

```sh
corepack pnpm verify
DATABASE_URL=postgres://127.0.0.1:5432/stockhawk corepack pnpm test:integration
```

`test:integration` migrates the configured database before running the real
PostgreSQL suites. The catalog persistence suite creates its own temporary
database to verify writes, transactions, rollbacks, row locks, and concurrency,
then drops it after the run. The configured PostgreSQL user must be allowed to
create databases.

Migrations, real-database integration, browser/live checks, backup/restore,
evidence, and release tasks are intentionally never cached.

Database schema and queries use exact-pinned Drizzle ORM. `pnpm --filter @stockhawk/database db:generate` regenerates reviewed SQL migrations.

TypeScript is exact-pinned at `7.0.2`. Oxlint owns TypeScript, React, Query, and Tailwind source checks. Strict peers remain enabled; pnpm allows only this exact TypeScript version for the ESLint-compatible Query/Tailwind rule packages whose published peer metadata predates TypeScript 7.
