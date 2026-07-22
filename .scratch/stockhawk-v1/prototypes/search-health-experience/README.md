# StockHawk Search + Health table prototype

> PROTOTYPE — throw away after the interaction verdict is captured.

React/Vite prototype using real TanStack Table row models and TanStack Query cache/mutations. It does not crawl stores or persist production data.

Run:

```sh
./.scratch/stockhawk-v1/prototypes/search-health-experience/run.sh
```

Open [http://127.0.0.1:4173/?variant=A&page=search](http://127.0.0.1:4173/?variant=A&page=search).

## Table directions

- `A — Compact ledger`: densest scan, all facts remain in the table.
- `B — Table + inspector`: fewer table columns with selected-row details beside them.
- `C — Store outline`: expandable linear Storefront/state sections with child rows.

Every direction supports light/dark mode, flat/Storefront search views, one match-any chip input, URL-persistent state, sorting, filtering, pagination, images and safe retailer handoff.

## Optimistic mutation enforcement

- User commands show `Queued` immediately.
- Canonical health, stock, or certification never changes until verified evidence returns.
- `src/data/use-optimistic-command-mutation.ts` snapshots the cache, updates immediately, rolls back errors, then invalidates for reconciliation.
- `scripts/check-optimistic-mutations.mjs` fails verification if application code imports TanStack Query's `useMutation` directly.
- `npm run verify` runs enforcement, type checking, unit tests, the complete real-Chrome interaction suite, and a production build.

The Chrome suite covers layouts, theme, navigation, selection, multi-query chips, filters, historical listings, grouping, collapse/expand, sorting, pagination, health filters, and optimistic commands.

Mock retailer links point to `example.com`; they perform no purchase action.
