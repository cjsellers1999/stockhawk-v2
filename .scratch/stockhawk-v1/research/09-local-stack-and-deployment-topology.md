# Local stack and deployment topology

Date: 2026-07-22  
Status: recommended V1 decision

Owner amendment: private access is required while away from home. Tailscale Serve is now the normal access path; Caddy remains the pre-login LAN fallback because supported Tailscale on macOS is user-scoped.

## Decision

Run StockHawk natively on the Mac mini as one TypeScript release with two StockHawk processes, one PostgreSQL database, and two private access edges:

- Node.js 24 LTS and TypeScript.
- A pnpm workspace with Turborepo for local-only development, build, and deterministic verification orchestration.
- React/Vite SPA with TanStack Query, TanStack Table, and TanStack Router.
- Fastify JSON API; it also serves the built SPA.
- Zod 4 as the shared runtime-contract decoder at untrusted application boundaries.
- PostgreSQL 18, Drizzle typed access, and reviewed checked-in SQL migrations.
- PostgreSQL full-text search plus `pg_trgm`; no separate search engine.
- pg-boss v12 for durable jobs in the same PostgreSQL database.
- A separate worker process containing the planner, request broker, Connectors, HTTP clients, and adaptive Playwright pool.
- Native macOS `launchd` supervision; no Docker Desktop in production.
- Tailscale Serve as the normal private HTTPS path for approved owner devices at home or away.
- Caddy internal HTTPS on unprivileged LAN port `8443` as the automatic no-login reboot fallback. Fastify and PostgreSQL remain loopback-only.
- Pino structured JSON diagnostics retained for 30 days. Durable Health and run summaries remain in PostgreSQL.
- One format/checksum-validated `pg_dump -Fc` daily, seven completed daily generations, encrypted external-disk copy when available, and an automated weekly restore test.

Use the latest supported patch of each selected major and pin exact application dependencies in the lockfile. Node recommends LTS lines for production; Node 24 is the active LTS line at this decision date. PostgreSQL supports each major for five years. [Node releases](https://nodejs.org/en/about/previous-releases), [PostgreSQL versioning](https://www.postgresql.org/support/versioning/)

```text
Approved owner device anywhere       Approved home-LAN device
        |                                      |
 Tailscale client                         HTTPS :8443
        |                                      |
 encrypted direct/DERP path                  Caddy
        |                                      |
 Tailscale Serve HTTPS                        |
        |                                      |
        +------------- 127.0.0.1 --------------+
                          |
 Fastify API + built React SPA -------- PostgreSQL 18
        |                                  |    |
        |                                  |    +-- pg-boss queues
        |                                  +------- domain/history/search
        |
 launchd -> StockHawk worker --------------+
                 |
          shared request broker
             /          \
          HTTP      audited Playwright pool
             \          /
            one residential IP

 launchd -> daily backup/weekly restore verifier -> encrypted external disk
```

The API and worker are separate so a browser or Connector crash cannot take down morning search. Tailscale Serve and Caddy are alternate inbound routes to the same loopback API, not separate applications. The system remains one codebase, schema, deployment, and release—not microservices.

### Workspace orchestration and runtime contracts

pnpm owns workspace dependencies. Turborepo runs dependency-aware, filterable tasks and caches only deterministic work locally. Build, lint, typecheck, and unit tasks may be cached after their inputs, environment, and outputs are declared. Migrations, real-database integration, Playwright/live-source checks, backup/restore, and actual-Mac gates never accept a cached result. V1 has no remote cache, and production `launchd` services invoke built API and worker entrypoints without Turborepo. Keep workspace packages coarse and aligned to real deployable or shared Module seams. [Turborepo documentation](https://turborepo.com/docs), [pnpm workspaces](https://pnpm.io/workspaces)

Zod schemas decode untrusted values once at their owning Interface: process configuration, URL/search state, API input, Storefront Integration and Adapter configuration, Connector output, and versioned JSON evidence/checkpoints. Internal Implementations receive parsed typed values rather than repeatedly validating them. App-owned commands and versioned configurations reject unknown structure; retailer payload schemas validate consumed fields but tolerate unrelated additive fields. Infer TypeScript types from the schema where practical and test the boundary with malformed and unknown-version inputs. Zod supplements rather than replaces PostgreSQL constraints, migrations, matching, certification, or shopper-visible stock validation. [Zod documentation](https://zod.dev/)

## Why this application stack

| Option | Result | Reason |
| --- | --- | --- |
| React/Vite + Fastify | Choose | Direct fit for the accepted client-side table, URL state, and server-state model. Fastify gives a small, explicit API/process boundary. Vite documents backend integration without requiring its own production server. |
| Next.js full stack | Reject for V1 | SSR, React Server Components, and framework deployment conventions do not help a private operational dashboard. They add another caching/rendering model around live server-side search. |
| Electron or native Swift | Reject | The owner wants access from approved private devices at home or away, and TanStack Query/Table are accepted. A browser UI avoids shipping a desktop client. |

The browser never loads 100,000 Offers. Fastify owns filtering, sorting, and keyset pagination; TanStack Table uses manual server-side pagination. TanStack Query owns server state. [Vite backend integration](https://vite.dev/guide/backend-integration), [Fastify TypeScript](https://fastify.dev/docs/latest/Reference/TypeScript/), [TanStack Table pagination](https://tanstack.com/table/latest/docs/guide/pagination)

Shared Zod schemas own runtime API contracts; a tested Fastify integration validates inputs and supplies response serialization schemas without a second handwritten contract. Each access edge is same-origin: Tailscale Serve and Caddy proxy both the SPA and API on their respective hostname. The application allowlists those two exact origins and uses host-only sessions. [Fastify validation and serialization](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)

### Enforced optimistic command boundary

Every UI mutation, including retries and review commands, must pass through one exported `useOptimisticCommand` boundary. Feature components cannot import `useMutation` directly or call mutation endpoints directly.

The boundary always:

1. cancels relevant reads and snapshots affected cache state;
2. applies the truthful immediate intent, such as `Queued` or `Saving`;
3. sends an idempotent command identity;
4. rolls back the snapshot on rejection; and
5. reconciles and refetches authoritative server state on settlement.

It never optimistically invents `in stock`, Healthy, Certified, or successful crawl evidence. TanStack Query directly supports optimistic cache update, rollback, and invalidation. [TanStack optimistic updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)

Enforce this with an import restriction, a static architecture test, and integration tests for success, duplicate submission, failure rollback, and stale-response reconciliation. The API requires an idempotency key for every command and writes the command receipt with its domain effects.

## Why PostgreSQL, not SQLite

100,000 rows alone would not disqualify SQLite. Write shape does. StockHawk concurrently commits observation batches, current projections, Search Documents, Change Events, checkpoints, Health summaries, operator commands, and job state. SQLite WAL allows readers alongside a writer but still permits only one writer at a time. That would require a custom single-writer coordinator shared by the API and worker. [SQLite WAL](https://www.sqlite.org/wal.html), [SQLite isolation](https://www.sqlite.org/isolation.html)

PostgreSQL provides concurrent MVCC transactions, database-enforced constraints, `SKIP LOCKED` queue claiming, and native text indexes in the same durability boundary. It therefore removes custom coordination rather than merely raising capacity. [PostgreSQL MVCC](https://www.postgresql.org/docs/current/mvcc-intro.html), [PostgreSQL `SELECT`](https://www.postgresql.org/docs/current/sql-select.html)

Keep current state, history, Source Evidence envelopes, Search Documents, Change Events, command receipts, work/checkpoint state, and queue rows in PostgreSQL. A committed observation batch updates its immutable evidence, current projection, Search Document, events, and checkpoint in one transaction. Preserve PostgreSQL durability defaults; never trade power-loss safety for throughput by disabling `fsync`, `synchronous_commit`, or `full_page_writes`. [PostgreSQL WAL settings](https://www.postgresql.org/docs/current/runtime-config-wal.html)

Authoritative evidence also stays inside that transaction boundary: normalized facts use typed columns, bounded Connector-specific evidence uses versioned `jsonb`, and rare pinned source bodies use compressed `bytea`. Routine stock checks store decision-grade extracted facts, source hashes, and provenance—not a complete HTML body every time. Time-partition the high-volume rolling detail where benchmarks justify it, then apply the accepted 30-day compaction/pinning rules. The filesystem holds only rebuildable content-addressed image cache and temporary downloads; StockHawk never depends on an unbacked filesystem blob to explain a domain decision.

Drizzle supplies typed queries and transaction integration. Generate and check in SQL migrations, then inspect and edit them for foreign keys, restrictive deletion, checks, partial/expression indexes, and PostgreSQL-specific features. Never auto-`push` a schema at service startup. Production roles separate migration DDL from runtime DML. [Drizzle transactions](https://orm.drizzle.team/docs/transactions), [Drizzle migration generation](https://orm.drizzle.team/docs/drizzle-kit-generate)

### Search

One relational Search Document remains authoritative for each Retailer Listing. Store normalized searchable text separately from display text. Use:

- a GIN `tsvector` index, normally with the `simple` configuration so names, codes, and sizes are not English-stemmed;
- GIN/GiST `pg_trgm` indexes only on measured normalized title, retailer, and URL fields needing fragment, spelling, or word-order tolerance; and
- composite B-tree indexes matching stock/classification/store filters and keyset order.

PostgreSQL recommends GIN for regularly searched full-text data; `pg_trgm` supports indexed similarity and `LIKE`/`ILIKE`. [Full-text indexes](https://www.postgresql.org/docs/current/textsearch-indexes.html), [`pg_trgm`](https://www.postgresql.org/docs/current/pgtrgm.html)

Do not add Elasticsearch or Meilisearch in V1. A separate index creates a second service, backup, and synchronization boundary and cannot participate in the authoritative observation transaction. Benchmark representative 100,000-plus Offer queries with `EXPLAIN (ANALYZE, BUFFERS)` before accepting indexes. Every index must name the production query it serves.

## Why pg-boss, not Graphile Worker, Redis, or timers

| Option | Result | Tradeoff |
| --- | --- | --- |
| pg-boss v12 | Choose | PostgreSQL-backed; jobs can be inserted inside the existing Drizzle transaction; retries/backoff, heartbeat/expiry, scheduling, dead letters, and queue policies are built in. No new daemon. |
| Graphile Worker | Viable, not chosen | Also PostgreSQL-backed and mature. Its `job_key` has locked-job and high-contention caveats; a killed worker's job can remain locked for hours by default. StockHawk needs short, explicit crash leases and per-Storefront policies. |
| BullMQ/Redis | Reject | Adds Redis, a second persistence/backup/failure domain, and an outbox problem between PostgreSQL domain commits and Redis enqueue. |
| In-process timers/arrays | Reject | Work disappears on crash/reboot and cannot be atomically committed with a domain command. |

pg-boss v12 documents Drizzle transaction adapters, `SKIP LOCKED`, retries/backoff, heartbeats, expiration, dead letters, and exclusive/keyed queue policies. [pg-boss](https://github.com/timgit/pg-boss), [queue policies](https://github.com/timgit/pg-boss/blob/master/docs/api/queues.md), [job heartbeat and expiration](https://github.com/timgit/pg-boss/blob/master/docs/api/jobs.md)

Graphile remains a credible fallback, but its own documentation warns that adding a matching locked `job_key` creates another job and that high contention has a race; abrupt termination keeps jobs locked for at least four hours by default. [Graphile job-key caveats](https://worker.graphile.org/docs/job-key), [Graphile crash recovery](https://worker.graphile.org/docs/admin-functions)

Queue records are execution mechanics, not StockHawk truth:

- StockHawk's domain tables own due time, priority, coalescing, run state, checkpoint, attempts, and Health.
- A small planner wakes frequently and enqueues bounded Storefront discovery or monitoring quanta. Never create one recurring job per Offer.
- Use a small fixed queue vocabulary. Use `singletonKey`/exclusive or strict-key policies for Storefront ownership, backed by StockHawk uniqueness and lease constraints.
- Insert an operator command receipt, due-work intent, and pg-boss wakeup in the same Drizzle transaction.
- Each handler is idempotent. A crash can repeat an external request, but replay cannot duplicate observations, events, or current-state transitions.
- Use heartbeats and short bounded job expiry. A job checkpoint advances after each bounded committed batch; shutdown stops taking work, flushes a safe batch, then exits.
- The Health page reads StockHawk run/work aggregates, not private queue tables. pg-boss failures are translated into typed run/Health evidence.

The shared Crawl Request Broker remains the only way a Connector obtains HTTP, browser, or image-fetch capacity. Playwright BrowserContexts isolate cookies and storage, not the residential IP; all contexts consume the same global and per-Storefront permits. [Playwright BrowserContext](https://playwright.dev/docs/api/class-browsercontext)

## Native macOS, not Docker Desktop

| Concern | Native `launchd` | Docker Desktop on macOS |
| --- | --- | --- |
| Boot | LaunchDaemon can start before user login | Adds Docker Desktop and its Linux VM startup state |
| Crawl ceiling | No VM CPU/RAM/disk allocation can become an accidental bottleneck | VM resource and disk-image limits add another ceiling to inspect |
| Data/recovery | PostgreSQL files and dumps have ordinary explicit paths | Named volumes live behind the VM and require Docker-aware recovery |
| Maintenance | macOS + Node + PostgreSQL + Caddy + supported Tailscale client | Same software plus Docker Desktop/VM/network/storage layers |
| Portability | Provisioning script and pinned versions | Stronger image portability, not valuable enough for this one fixed Mac |

Docker Desktop's Mac settings explicitly manage a Linux VM, resource limits, disk image, sign-in startup, and Time Machine inclusion. Those layers do not improve the one-machine private-access requirement. Use containers only for optional development/CI parity, never as V1 production truth. [Docker Desktop settings](https://docs.docker.com/desktop/settings-and-maintenance/settings/), [Docker volumes](https://docs.docker.com/engine/storage/volumes/)

Install API, worker, PostgreSQL, and Caddy as supervised LaunchDaemons under least-privilege service accounts. Caddy serves `https://<mac-mini-bonjour-name>:8443`, with HTTP redirects disabled, so it does not require root merely to bind ports `80` or `443`. `RunAtLoad`/keep-alive restarts unexpected exits. The backup verifier is a separate calendar LaunchDaemon so a broken queue cannot suppress backups. Apple documents LaunchDaemons as system services that can run without a logged-in user. [Apple `launchd` guide](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html)

Configure Tailscale Serve in persistent background mode to proxy its private HTTPS hostname to Fastify's loopback port. Serve configuration resumes across a Tailscale restart, but official Tailscale documentation states that macOS cannot run Tailscale as the system before a user logs in. Therefore Tailscale cannot replace the LaunchDaemon-backed LAN edge without weakening reboot recovery. Caddy restores local access before login; Tailscale remote access returns automatically after the owner's normal macOS login and Tailscale reconnection. FileVault remains enabled and StockHawk does not enable automatic login to hide this platform limitation. [Tailscale Serve persistence](https://tailscale.com/docs/reference/tailscale-cli/serve), [Tailscale unattended limitation on macOS](https://tailscale.com/docs/how-to/run-unattended)

Configure the Mac to restart after power failure and avoid sleep while serving. On reboot: PostgreSQL starts; API and worker wait/retry for database readiness; the worker reclaims expired jobs and resumes from committed checkpoints; browser contexts are recreated empty. Search remains usable if the worker is down, with visible stale/partial status. [Apple energy settings](https://support.apple.com/guide/mac-help/change-energy-settings-mchlp1168/mac)

## Logs, metrics, and retention

Use Pino JSON from API and worker. Include request, command, job, run, Storefront, Adapter, attempt, checkpoint, method, duration, and outcome identifiers. Redact authorization, cookies, passwords, session IDs, raw response bodies, and retailer personal data. [Fastify logging](https://fastify.dev/docs/latest/Reference/Logging/), [Pino redaction](https://github.com/pinojs/pino/blob/main/docs/redaction.md)

A dedicated Pino transport writes daily and size-bounded files; a retention LaunchDaemon compresses closed partitions and deletes diagnostics older than 30 days. A disk high-water mark prunes oldest unpinned diagnostics early and raises Health degradation instead of filling the disk. Do not log every successful Offer check as a permanent row.

Permanent compact truth stays in PostgreSQL: minute-level checks/second, success/unknown/rate-limit counts, latency, backlog age, freshness attainment, run summaries, Health transitions, and Change Events. The UI's throughput and Health views query these aggregates, never parse logs. Raw payload/evidence pruning follows the accepted 30-day/pinning rules; image cache is disposable and missing images never affect Health.

## Backup and recovery

Run a separate `launchd` job daily:

1. `pg_dump -Fc` to a temporary file without `--no-sync`;
2. require `pg_restore --list` to parse it, calculate a checksum, and record both validations;
3. atomically rename only that validated dump;
4. copy it plus its manifest to an encrypted external APFS volume when mounted; and
5. retain the newest seven completed daily generations.

`pg_dump` creates a consistent export while normal work continues; custom format is compressed and supports selective/parallel restore. [PostgreSQL `pg_dump`](https://www.postgresql.org/docs/current/app-pgdump.html), [`pg_restore`](https://www.postgresql.org/docs/current/app-pgrestore.html)

Weekly, automatically restore the newest dump into a disposable database and verify schema version, required constraints/extensions, invariant counts, representative searches, command idempotency, and Search Document rebuild. Only that stronger test receives `restore_verified_at`; daily format validation is not mislabeled as a restore. Monthly, perform the documented operator drill through a fresh application start. Never treat an untested dump as fully restore-proven.

Back up the database, deployment manifests, migration history, Storefront Integration configuration, declarative Tailscale Grant and Serve setup, and restore instructions. Do not copy Tailscale node private keys: revoke a lost Mac, enroll and tag the replacement, then recreate Serve from the recorded command. Provisioning recreates database roles; other secrets live in macOS Keychain or mode-`0600` files and are rotated after disaster recovery. Exclude rebuildable image caches, `node_modules`, browser binaries, and 30-day diagnostics. A same-disk dump is useful for operator error but is not disaster recovery.

V1 operational targets:

- power/process failure: automatic restart, no acknowledged domain transition lost, bounded work replay;
- backup RPO: at most 24 hours for logical/application loss; this also covers total disk loss only when the encrypted external copy is configured and current;
- daily backup retention: seven days;
- restore-test cadence: weekly automated plus monthly operator drill;
- database-restore RTO: under four hours once a replacement Mac/PostgreSQL installation is ready, proved at representative load;
- post-restore freshness: timestamps remain honest, and due work is regenerated rather than pretending restored stock is fresh.

Point-in-time WAL archiving is unnecessary for V1. Revisit it if a 24-hour RPO becomes unacceptable. [PostgreSQL continuous archiving](https://www.postgresql.org/docs/current/continuous-archiving.html)

## Private access and threat boundary

Tailscale Serve terminates normal HTTPS and proxies only to Fastify on loopback. A tagged StockHawk node and a deny-by-default Tailscale Grant allow only the owner's approved identity/devices to TCP `443`; Tailscale Funnel, subnet routing, exit-node use, and all other service ports remain disabled. Serve is private to the tailnet, and tailnet traffic is end-to-end encrypted whether the device reaches the Mac directly or through a DERP relay. [Tailscale Serve](https://tailscale.com/docs/reference/examples/serve), [Tailscale Grants](https://tailscale.com/docs/features/access-control/grants), [Tailscale connection types](https://tailscale.com/docs/reference/connection-types)

Tailscale's valid HTTPS certificate avoids installing a private CA for normal use. Enabling tailnet HTTPS publishes the chosen machine and tailnet DNS certificate name to public certificate-transparency infrastructure, although it does not expose the service. Use a non-sensitive hostname such as `stockhawk`; never put the owner's name, address, or purpose-sensitive data in it. [Tailscale HTTPS certificates](https://tailscale.com/docs/how-to/set-up-https-certificates)

Caddy remains the independent home-LAN recovery path and terminates `tls internal` at `https://<mac-mini-bonjour-name>:8443`; approved fallback devices install its root CA. Fastify allowlists the exact Tailscale and Caddy origins and issues host-only sessions, so the owner may need to log in once per hostname. The application—not Tailscale identity headers or Caddy Basic Auth—owns the one owner account using Argon2id, PostgreSQL-backed sessions, and `Secure`, `HttpOnly`, `SameSite=Strict` cookies. Mutations validate Origin/Fetch Metadata and CSRF tokens. [Caddy internal TLS](https://caddyserver.com/docs/caddyfile/directives/tls), [Argon2](https://www.rfc-editor.org/rfc/rfc9106.html), [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

Bind Fastify and PostgreSQL only to loopback/Unix sockets. Caddy binds only the chosen LAN interface; Tailscale is the only remote ingress. Enable the macOS firewall and FileVault, no router port forwarding/UPnP exposure, no PostgreSQL `trust`, and least-privilege runtime/migration/backup roles. Tailscale loss removes remote access but does not stop the API, worker, database, or local Caddy path. [macOS firewall](https://support.apple.com/guide/mac-help/block-connections-to-your-mac-with-a-firewall-mh34041/mac), [FileVault](https://support.apple.com/guide/mac-help/protect-data-on-your-mac-with-filevault-mh11785/mac)

Tailscale changes only inbound owner access. The collector never uses a Tailscale exit node: all retailer HTTP, browser, redirect, and image traffic still leaves from the home ISP and passes through the shared residential-IP Crawl Request Broker. The broker permits only audited public origins, validates redirects, and blocks loopback, link-local, and private-address destinations. Browser downloads and retailer credentials remain disabled. Retailer HTML is rendered as text/data, never injected into StockHawk's DOM.

## Acceptance gates

Implementation is not complete until it proves:

- 100,000-plus representative Search Documents meet the accepted search/filter/keyset budgets with query plans recorded;
- every UI mutation passes the optimistic boundary and rollback/reconciliation tests;
- database constraints reject duplicate source identities, stale transitions, duplicate events, illegal lifecycle states, and destructive deletes;
- killing the worker during HTTP and browser batches restarts and resumes without duplicate domain effects;
- rebooting with no logged-in user restores API, worker, database, and Caddy automatically, without weakening FileVault;
- after normal macOS login, persistent Tailscale Serve returns without another setup command;
- an approved non-LAN device reaches the Tailscale HTTPS URL, while an unapproved tailnet device and a public-internet client cannot;
- Tailscale Funnel, exit-node routing, subnet routing, and public router forwarding remain disabled;
- API and PostgreSQL are unreachable directly from both LAN and tailnet devices; both access origins reject unauthenticated mutations at the application boundary;
- disabling Tailscale removes remote access while local Caddy search and all background processing continue;
- adaptive HTTP/browser work always uses the shared residential-IP broker;
- an egress verification proves retailer traffic still uses the home residential IP rather than Tailscale routing;
- a daily dump is produced without stopping crawling and the weekly clean restore passes; and
- filling/denying the diagnostic-log directory degrades visibly without corrupting domain truth or stopping search.

## Revisit triggers

- Add PostgreSQL WAL archiving when the owner needs an RPO below 24 hours.
- Remove Caddy only if Tailscale officially supports unattended pre-login macOS operation or an independently supervised always-on tailnet gateway is deliberately added.
- If remote access must survive a Mac reboot before login, evaluate a separate always-on Tailscale gateway; never disable FileVault or enable automatic login as a shortcut.
- Reconsider containers only if StockHawk must run on multiple heterogeneous hosts.
- Reconsider Redis only if measured PostgreSQL queue contention remains after bounded-job and index tuning.
- Reconsider a separate search engine only if measured PostgreSQL search misses accepted latency at realistic scale and its dual-write/rebuild failure model is designed first.
- Split more processes only when fault or privilege isolation requires it. One Mac and one developer do not justify microservices.
