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
corepack pnpm build
```

Run the API and worker in separate terminals. The API serves `apps/web/dist` and binds only to loopback.

```sh
DATABASE_URL=postgres://127.0.0.1:5432/stockhawk corepack pnpm --filter @stockhawk/worker start
DATABASE_URL=postgres://127.0.0.1:5432/stockhawk corepack pnpm start
```

Open `http://127.0.0.1:3100`. `GET /api/readiness` reports API, database, and worker independently.

## Verification

```sh
corepack pnpm verify
DATABASE_URL=postgres://127.0.0.1:5432/stockhawk corepack pnpm test:integration
```

Migrations, real-database integration, browser/live checks, backup/restore, evidence, and release tasks are intentionally never cached.
