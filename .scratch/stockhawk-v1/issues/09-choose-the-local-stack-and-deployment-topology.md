# Choose the local stack and deployment topology

Type: research
Label: wayfinder:research
Status: resolved
Triage: ready-for-agent
Blocked by: 01, 04, 05

## Question

Which application, database, job-runner, process-supervision, logging, backup, and private-access deployment topology best satisfies the accepted domain model, Connector seam, crawl concurrency, fast search, Mac mini operation, recoverability, and maintainability by one developer? Compare realistic options, include security and failure-recovery tradeoffs, and recommend a minimal topology with explicit operational characteristics.

## Upstream constraints

- The accepted UI stack must support TanStack Table and TanStack Query. Evaluate exact framework/runtime integration in this ticket rather than reopening those library choices.
- Every true UI mutation must use an enforced optimistic command boundary: immediate cache update, rollback on failure, and authoritative reconciliation. Optimism may represent submitted intent such as `Queued`, never fabricate external Storefront, stock, discovery, or certification success.
- Owner direction superseding the earlier dual-edge design: use Tailscale Serve as the sole ingress with deny-by-default device authorization. Remove Caddy and all application authentication. Background services recover at boot; UI access may remain unavailable until Tailscale returns after normal macOS login.

## Research asset

- [Primary-source local stack and deployment recommendation](../research/09-local-stack-and-deployment-topology.md)
- [Primary-source frontend stack check](../research/frontend-stack-primary-sources.md)
- [Frontend tooling reference](../research/frontend-tooling-reference.md)

## Answer

StockHawk V1 runs **natively on the Mac mini**, without Docker Desktop, as one pinned TypeScript release with separate web and collection processes:

| Concern | V1 choice |
| --- | --- |
| Runtime | Node.js 24 LTS, TypeScript, pnpm workspace, Turborepo local task orchestration |
| Browser app | React/Vite SPA, TanStack Router, TanStack Query v5, exact latest TanStack Table v9 beta |
| UI foundation | Locally owned shadcn/ui `base-nova` components over Base UI, Tailwind CSS v4, Lucide icons, locked StockHawk theme |
| Frontend enforcement | Oxlint plus TanStack Query rules; ESLint Tailwind governance; Prettier Tailwind ordering; React Compiler verification |
| Server | Fastify same-origin JSON API serving the built SPA |
| Database | PostgreSQL 18 |
| Data access | Drizzle over `node-postgres`, plus reviewed PostgreSQL-specific SQL |
| Runtime contracts | Zod 4 schemas at untrusted process, HTTP, URL, Integration, Connector, and versioned-JSON ingress |
| Search | Controlled Search Documents with GIN full text, measured `pg_trgm`, and query-shaped B-tree indexes |
| Durable jobs | pg-boss v12 in the same PostgreSQL database |
| Collection | Separate worker containing the due-work planner, shared Crawl Request Broker, HTTP clients, Connectors, and adaptive Playwright pool |
| Supervision | Native `launchd` LaunchDaemons, including separate calendar backup verification |
| Private access | Tailscale Serve HTTPS as the sole ingress, restricted to approved devices by a deny-by-default Grant; no application-local authentication or LAN fallback |
| Diagnostics | Redacted Pino JSON with bounded 30-day files; durable Health and throughput aggregates in PostgreSQL |
| Backup | Daily validated `pg_dump -Fc`, seven completed generations, encrypted external copy when configured, weekly clean restore |

pnpm owns dependency installation and the workspace. Turborepo supplies dependency-aware, filterable task orchestration and local caching only; it does not create another runtime or deployment boundary. Cache only deterministic tasks whose inputs, environment, and outputs are completely declared. Migrations, real-PostgreSQL integration, Playwright and live-Storefront checks, backup/restore, and actual-Mac release work are always uncached. V1 has no remote task cache. `launchd` starts the built API and worker entrypoints directly, never Turborepo. Workspace packages remain coarse and follow real deployable or shared Module seams rather than creating a shallow package for every folder.

Zod is the canonical runtime decoder for data entering trusted Modules: environment and deployment configuration, browser URL/search state, HTTP commands and queries, immutable Storefront Integration configuration, Adapter options, Certification Recipes, Connector outputs, and versioned JSON evidence/checkpoints. Decode once at the owning Interface, derive TypeScript types from the schema where useful, then pass typed values inward. App-owned commands and versioned configuration are closed contracts; retailer payload decoders validate the fields StockHawk consumes while tolerating unrelated additive fields. Do not scatter repeated `safeParse` calls through Implementations or maintain parallel handwritten validators. Zod does not replace PostgreSQL constraints and checked-in migrations, Catalog Certification, product matching, or shopper-visible Stock Semantics Validation.

The frontend uses shadcn/ui's Base UI-backed `base-nova` source components, `@base-ui/react`, Tailwind CSS v4 through the Vite plugin, and Lucide icons. Generated component source is owned and reviewed inside `apps/web`; a separate UI package is unjustified while there is one consumer. StockHawk defines its own CSS-first semantic theme from the locked design's exact light/dark variables. It never imports external ACERTUS packages, colors, fonts, or components and never allows shadcn defaults to redefine the accepted artifact. Do not install parallel Radix-backed component copies.

At this decision date the exact snapshot is shadcn `4.14.0`, Base UI `1.6.0`, Tailwind CSS/Vite plugin `4.3.3`, TanStack Query `5.101.4`, and TanStack Table/core `9.0.0-beta.55`. The bootstrap ticket resolves the requested current tags again, pins each result without a range, and records it in the Evidence Bundle. Table must use the `beta` tag because untagged installation is still v8. Table owns row models and manual server state; Query owns remote cache and optimistic commands. Neither owns URL state or authoritative domain truth.

StockHawk adapts the inspected tooling structure at commit `d60c74dcec2401125f912e710a30ca003bf6ed94`: type-aware Oxlint for TypeScript, React, React Compiler, console, and TanStack Query rules; ESLint flat config with the compiler-aware Tailwind rules; the official Tailwind Prettier plugin; and committed Tailwind IntelliSense settings. Tailwind arbitrary values, unknown classes, contradictions, and unsorted classes fail verification. Reusable locked-design choices become semantic theme tokens; one-off exact geometry uses component-owned CSS Modules or scoped custom properties rather than arbitrary utilities or fake global tokens. Every warning fails `lint:check` except a deliberately documented plugin recommendation. pnpm peer checks stay strict; a narrow exact-version compatibility exception requires explicit proof and cannot become a broad workspace disable.

PostgreSQL is selected over SQLite because StockHawk's risk is concurrent write shape, not merely row count. API commands, Connector batches, stock observations, Current Projections, Search Documents, Change Events, checkpoints, Health summaries, and queue state must commit concurrently and transactionally. SQLite WAL still has one writer and would require StockHawk to invent a cross-process single-writer coordinator. PostgreSQL also supplies the required constraints, MVCC, text indexes, queue claiming, retention paths, and future Change Event consumption without another data service.

The normalized relational model stays authoritative. Versioned structured evidence uses `jsonb`; rare pinned source bodies may use compressed `bytea`. Routine checks retain extracted decision evidence, content hashes, and provenance rather than duplicating entire HTML bodies. High-volume rolling detail may be time-partitioned when representative query plans justify it and follows the accepted 30-day compaction/pinning policy. Only rebuildable images and temporary downloads live outside PostgreSQL in a content-addressed, quota-bound filesystem cache. The browser never fetches retailer images directly: cache misses use the same governed Crawl Request Broker, and missing images remain healthy.

Drizzle provides typed access, but it does not replace database design. Schema changes are generated as checked-in SQL, reviewed and amended for checks, foreign keys, restrictive deletion, partial/expression indexes, extensions, and multi-row invariants, then applied once by a migration command before services start. Runtime schema push and startup-time application migrations are forbidden. Complex search and persistence operations may use reviewed SQL behind the one authoritative Persistence Boundary.

pg-boss is selected over Graphile Worker, BullMQ/Redis, and in-memory timers. It can enqueue through the current Drizzle transaction and supplies PostgreSQL-backed scheduling, priority, retries, heartbeats, expiry, dead letters, and keyed exclusive policies without a second daemon. StockHawk still treats every handler as retryable: queue delivery never substitutes for domain idempotency. Domain tables—not pg-boss internals—own due times, priority, run state, coalescing, checkpoints, and Health. A frequent planner enqueues bounded Storefront work quanta, never one permanent job per Offer. Per-Storefront keyed exclusivity plus database constraints enforces one active Connector job; checkpoints and deterministic batch identities make crash replay harmless. Every HTTP, browser, redirect, and image request still acquires global and Storefront permits from the single residential-IP broker.

The UI is fully server-driven at scale: Fastify performs text/filter/sort/keyset queries, and the browser never loads the whole catalog. URL state is validated by TanStack Router; TanStack Query owns server state; TanStack Table runs in manual server-side mode. The [locked owner design](../design/DESIGN.md) governs the rendered shell, Search, Health, light/dark tokens, density, and responsive behavior. Every mutation uses one exported `useOptimisticCommand` boundary. A static import rule prevents feature code from importing `useMutation` or calling mutation endpoints directly. The boundary snapshots and updates relevant caches, shows only truthful submitted intent such as `Queued`, sends an idempotency key, rolls back failure, then reconciles authoritative state. The API requires that idempotency key and atomically records the command receipt, domain intent, and any pg-boss wakeup.

Tailscale Serve is StockHawk's sole front door. It exposes the loopback-only Fastify server at a stable HTTPS `*.ts.net` URL exclusively inside the owner's tailnet. A deny-by-default Tailscale Grant permits only the owner's approved devices to the tagged StockHawk node on HTTPS; Funnel, subnet routing, exit-node use, database ports, alternate LAN proxies, and public router forwarding remain disabled. That tailnet policy is the application access boundary: StockHawk deliberately has no account, password, login, session, authentication cookie, or CSRF token. Mutations retain exact-Origin and Fetch-Metadata checks plus idempotency. Application authentication must not be reintroduced without a new owner-approved architecture decision. The Tailscale hostname contains no personal information because its certificate name is published through normal certificate-transparency infrastructure.

There is no Caddy or direct-LAN fallback. After a reboot, `launchd` restores PostgreSQL, Fastify, and the worker without a logged-in user, so collection and durable processing recover automatically. UI access intentionally fails closed until the supported Tailscale client reconnects and persistent Serve returns after normal macOS login. StockHawk reports the Tailscale/Serve access edge when reachable and never weakens FileVault or enables automatic login merely to recover access.

Fastify and PostgreSQL bind only to loopback or Unix sockets. The Mac firewall and FileVault remain enabled; router forwarding and UPnP exposure are forbidden. The Crawl Request Broker allowlists audited public origins, validates redirects, and blocks loopback, link-local, and private destinations. Tailscale is inbound access only: the collector never selects a Tailscale exit node, so every retailer request still leaves through the home residential IP and the accepted shared broker.

`launchd` supervises PostgreSQL, the Fastify API, and the worker under least-privilege service accounts and starts them without an interactive login. Tailscale's supported macOS user client owns the persistent Serve configuration and reconnects after user login. Startup does not rely on fragile ordering: API and worker retry database readiness. The Mac is configured to avoid sleep and restart after power loss. Worker, browser, and internet failures preserve searchable stale/Partial truth; Tailscale failure removes UI access but leaves local background processing intact. A worker restart recreates browser contexts, reclaims expired jobs, and resumes from the last committed checkpoint. Database durability settings remain enabled; no crawl optimization may disable `fsync`, `synchronous_commit`, or `full_page_writes`.

Pino emits structured, correlated diagnostics while redacting credentials, cookies, authorization, sessions, and raw retailer bodies. Daily/size rotation and a disk high-water mark prevent logs from consuming the machine; early emergency pruning raises visible Health degradation. Checks/second, useful observations/second, outcomes, rate limits, backlog age, freshness attainment, run summaries, and Health transitions are compact PostgreSQL facts, never reconstructed from log files.

A separate calendar LaunchDaemon creates one daily custom-format dump to a temporary file, parses it with `pg_restore --list`, checksums it, atomically publishes it, and retains the latest seven completed generations. It copies the validated dump to an encrypted external APFS target when mounted; a same-disk dump is explicitly not disk-failure recovery. Weekly automation restores the newest dump into a disposable database and verifies schema, extensions, constraints, representative search, idempotency, and Search Document rebuild. Monthly, the documented operator drill performs a fresh application start. The target is a 24-hour logical-loss RPO and a representative-load restore under four hours; total-disk-loss coverage requires a current external copy.

Docker Desktop, Next.js, Electron, Redis/BullMQ, Temporal, Caddy or another alternate ingress, application-local authentication, a public Tailscale Funnel, and a separate search engine are rejected for V1 because each adds exposure, a VM, persistence system, deployment model, or synchronization boundary without solving an accepted requirement. Tailscale Serve and its Grant own the private inbound boundary and never participate in crawling. The rejected options may be reconsidered only through a new owner-approved architecture decision after measured evidence crosses a documented trigger.
