# V1 verification strategy research

Date: 2026-07-22

## Recommendation

Trust StockHawk through three independent proof planes:

1. **Deterministic code gates** run from versioned fixtures and a fresh real PostgreSQL database. They prove repeatability, invariants, failure handling, UI behavior, and architectural boundaries without contacting retailers.
2. **A release rehearsal on the actual Mac mini** proves representative-load latency, scheduling behavior, process recovery, private access, security boundaries, and backup restoration in the production topology.
3. **Live Storefront qualification** proves facts that fixtures cannot: exhaustive public catalog closure and shopper-visible stock semantics for each Storefront Integration. It runs during onboarding, explicit re-audit, or repair—not on every commit.

No one plane substitutes for another. A fixture cannot certify a live Storefront; one successful live crawl cannot prove replay safety; a passing unit suite cannot prove reboot recovery.

## Tooling baseline

- **Vitest** for TypeScript unit, component, state-machine, and integration orchestration.
- **fast-check** for generated invariants: cursor traversal, identity normalization, replay, event ordering, and scheduler state transitions.
- **A real migrated PostgreSQL 18 database** for persistence tests. Mocks may isolate pure code but cannot accept transaction, constraint, concurrency, migration, search, or restore behavior.
- **Fastify `inject()`** for deterministic route contracts; real loopback HTTP for browser, security, and latency tests.
- **Playwright** for Chromium and WebKit end-to-end flows, plus `@axe-core/playwright` for automated accessibility checks. Keyboard and screen-reader-oriented manual checks remain required because automated accessibility checks are incomplete.
- **Seeded virtual time** and recorded Connector fixtures for scheduler and Connector simulation. Tests report their seed and fixture version so failures reproduce.
- **PostgreSQL `EXPLAIN (ANALYZE, BUFFERS)`** for accepted production query shapes under representative data.
- **Native `pg_dump -Fc` and `pg_restore`** for backup evidence. Parsing an archive is not a restore test.

Coverage percentages are diagnostic, not an acceptance shortcut. Acceptance is the named behavior and invariant matrix below.

## Gate A — deterministic change verification

Every merge candidate must pass, with no retailer traffic:

1. install from the locked dependency graph;
2. formatting, lint, typecheck, production build, and migration validation;
3. architectural static checks;
4. unit, property, Connector contract, persistence integration, API, component, and browser end-to-end tests;
5. accessibility automation;
6. fixture and schema compatibility checks.

Deterministic tests receive no automatic retry. A fail-then-pass rerun is investigated and recorded as flaky rather than relabeled green. Live tests have typed inconclusive outcomes for external unavailability, but cannot turn an application defect into a pass.

### Architectural static checks

Fail the build when production code:

- calls TanStack Query `useMutation` outside the single optimistic command module;
- performs an owner mutation outside a registered command family;
- makes HTTP, browser, redirect, or image requests outside the Crawl Request Broker;
- writes domain state outside the Persistence Boundary;
- lets a Connector Adapter classify Jellycat products, issue Catalog Certification, or write current projections directly;
- runs a development schema push at application startup;
- imports browser execution into an Adapter without an audited Browser Access Grant path;
- introduces retailer-name branches outside a registered Bespoke Connector Adapter.

The optimistic command registry is also a completeness list: every command family must have immediate-intent, server-rejection rollback, authoritative-reconciliation, duplicate-submission, refresh, and overlapping-command tests. Optimism may show `Queued` or an edited owner-controlled value, never fabricated stock, health, discovery, or certification success.

## Connector Adapter and Catalog Certification contracts

Every Platform and Bespoke Connector Adapter runs the same conformance kit over sanitized, versioned fixtures captured from its audited public surfaces.

### Discovery fixtures must cover

- empty, one-page, and multi-page catalogs;
- exact parent and variant identity, including separate size variants and titles without `Jellycat`;
- reordered results, duplicate records, changed cursors, redirect chains, and harmless schema additions;
- pagination loops, missing pages, count disagreement, unstable boundaries, partial responses, cancellation, timeout, throttle, challenge, and malformed content;
- bounded batch commits, checkpoint resume, crash after commit, crash before commit, and restart-only replay;
- a newly appearing unknown Jellycat item, a legacy item, a renamed/reversed-title item, and non-Jellycat near-matches.

The contract fails if the Adapter drops exact listing/variant identity, silently truncates, exceeds declared origins, bypasses the broker, emits an untyped terminal result, or cannot resume safely.

### Certification falsification

The central Catalog Certifier must reject:

- search-only enumeration;
- an unclosed cursor or page graph;
- source-count disagreement or unexplained suspicious count drop;
- missing variant enumeration;
- inconsistent observation boundaries;
- stale evidence or an Integration/Adapter/recipe version different from the run;
- any failed or incomplete branch.

Positive observations from a Partial run remain searchable. A Partial run never reconciles absence, marks a listing inactive, or replaces prior certification. Only one complete, internally consistent Catalog Snapshot may reconcile absence.

### Stock Monitoring and semantics

Contract tests require target accounting: every requested eligible Offer has exactly one conclusive observation or typed unknown/failure outcome. Failed checks preserve the prior trustworthy Stock Status and observation time.

Live onboarding then validates each Storefront Integration—not merely each platform—by comparing its machine signal with the exact selected variant's shopper-visible page across every currently observable availability condition. Contradiction rejects the signal. No trustworthy signal yields honest `unknown`; it never guesses. A rotating Stock Semantics Sentinel repeats a small sample during discovery and after surface drift. A later contradiction suspends new observations from that signal while preserving prior trustworthy current state.

## Master Catalog and matching verification

- Keep raw retailer titles and all evidence; normalize into derived fields only.
- Treat size variants as separate Products/Offers where the accepted model requires it.
- Use regression fixtures for punctuation, accents, translations, reordered words, retailer size suffixes, season codes, aliases, SKU/UPC, and legacy rare products.
- Prove evidence precedence, reversible promotion/correction, and idempotent duplicate handling.
- Prove local reclassification after Product/alias/rule changes performs zero retailer requests and preserves source observations.
- A title match may make the accepted best-effort Product, but one weak candidate cannot silently rewrite other listings or erase evidence.

## PostgreSQL and Change Event invariants

Run these against fresh databases created from checked-in migrations and against every supported upgrade path:

- foreign keys, uniqueness, check/exclusion constraints, restrictive deletes, and enum/state validity with explicit negative tests;
- one durable identity per declared key and one current projection per entity;
- atomic evidence + immutable observation + current projection + Search Document + Change Event + checkpoint commit;
- injected failure after every write step rolls back the whole batch;
- duplicate batch, job redelivery, process crash, and concurrent replay produce no duplicate effects;
- out-of-order observations cannot replace newer trustworthy current state;
- a real state transition emits exactly one causally keyed Change Event; unchanged replay emits none;
- certified-snapshot membership is immutable and Partial work cannot reconcile disappearance;
- concurrent worker and owner commands maintain one active Storefront job and coalesce duplicate intent;
- rebuilding Search Documents from authoritative tables yields semantically identical search results;
- 30-day compaction removes eligible bulky detail while preserving permanent truth, pins, hashes, causal envelopes, and referential integrity.

Queue behavior is tested as at-least-once. pg-boss delivery never substitutes for domain idempotency.

## Scheduler verification

### Deterministic simulation

Use a seeded virtual clock and generated workloads containing at least 100,000 independently monitored Offers. Scenarios vary Storefront count, bulk-vs-per-Offer surfaces, latency, Retry-After, throttle, challenge, browser cost, catalog size, cache hits, crashes, and available shared-IP capacity.

Prove:

- one Crawl Request Broker governs HTTP, browser, redirects, and images;
- one active Connector job per Storefront and coalesced overdue work;
- adaptive global, Storefront, and browser scopes react independently to local versus correlated pressure;
- server guidance and safe backoff always win;
- no artificial measurement traffic and no work before it is due;
- bounded catalog quanta yield and resume without starvation;
- out-of-stock and recoverable-unknown targets receive 15-minute priority, in-stock/preorder targets retain their 60-minute goal, and catalog work still makes bounded progress;
- browser contexts share the same residential-IP budget;
- sufficient modeled capacity meets goals; insufficient capacity preserves safety, prioritizes restock value, avoids unbounded duplicate backlog, and reports the goal as unreachable instead of lying;
- crash/restart, expired leases, redelivery, and checkpoint replay remain idempotent.

### Live capacity rehearsal

On the Mac mini, use ordinary due work from qualified Storefronts—never synthetic retailer probes—to measure useful observations/second, source requests/second, browser work, latency distributions, retry/throttle/challenge rate, backlog slope, first-Partial time, certification time, and freshness attainment. Hardware utilization is observed for failure diagnosis only; CPU/RAM targets do not cap concurrency. The residential IP and Storefront responses remain the intended limit.

One benchmark cannot promise a permanent crawl duration. The accepted evidence records load, Storefront mix, safe learned limits, and whether current capacity meets each freshness goal.

## Search, UI, and Health verification

### Representative dataset

The release fixture contains at least 100,000 Offers/Search Documents, separate listings and size variants, duplicate Products across stores, confirmed and provisional matches, all four Stock Status values, stale and fresh results, Partial catalogs, missing images, long Unicode titles, Dead/Dormant/Blocked Storefronts, and enough history to exercise 30-day retention.

### Search and interaction assertions

- match-any chips search Product title, retailer name, and site URL;
- chip, stock, match-status, view, sort, and pagination state round-trip through the URL and survive refresh/back/forward;
- flat pagination operates on Offers; grouped pagination preserves Storefront boundaries without missing or duplicating rows;
- keyset pagination stays stable under concurrent inserts/updates;
- confirmed and Provisional Candidate visibility follows filters exactly;
- distinct listing and size variants remain distinct rows;
- fresh results rank before stale equivalents by default;
- missing images use the accepted fallback/placeholder and never alter visibility, health, certification, or stock;
- manual retailer handoff opens the exact listing/variant URL.

Against the representative dataset on the production Mac topology, the first home-network page is usable within 2 seconds and each search/filter/view/pagination update displays within 500 milliseconds. Record end-to-end distributions and server/query time separately, plus accepted query plans. Remote Tailscale latency is reported separately and cannot excuse a slow local path.

### End-to-end and accessibility

Playwright drives the real built UI, Fastify API, and PostgreSQL database for the morning purchase workflow, Health remediation, error/rollback, refresh, and history navigation in Chromium and WebKit. No test-only UI implementation may replace production state handling.

Target WCAG 2.2 AA. Run axe automatically, then manually verify keyboard-only operation, logical focus order, visible/unobscured focus, table and status semantics, labels/names, error announcements, zoom/reflow, light/dark contrast, and a screen-reader pass over Search and Health. Automation alone is not an accessibility sign-off.

### Health transition matrix

Inject representative success, ordinary failure, structural failure, Retry-After, challenge, stale success, partial discovery, count drop, unknown stock, semantics contradiction, collector gap, queue delay, worker crash, and recovery. Assert independent access, catalog coverage/freshness, monitoring coverage, status-specific freshness, lifecycle, and derived attention behavior.

Specifically prove that throttling changes capacity/freshness rather than access health; missing images change nothing; stale stock stays visible with its age; retry/re-audit commands coalesce and obey backoff; canonical health cannot be painted healthy by an owner action; Auto-Recovering and Repair Required are distinguishable; and throughput counters separate requests, conclusive Offer refreshes, and conclusive restock refreshes.

## Gate B — Mac-mini release rehearsal

Before production rollout and after material topology/migration changes, rehearse a release candidate on the target Mac:

1. provision from written instructions and locked versions;
2. migrate an empty PostgreSQL database and load the representative dataset;
3. pass search, query-plan, scheduler, and UI latency gates;
4. kill the worker before and after a bounded batch commit, then prove safe recovery;
5. stop PostgreSQL, break retailer connectivity, exhaust the browser lane, and interrupt Tailscale; local search remains available wherever its dependency permits and Health tells the truth;
6. reboot with no macOS login and prove PostgreSQL, Fastify, worker, Caddy, and local search recover through `launchd`;
7. after normal login, prove persistent Tailscale Serve returns without reconfiguration;
8. prove Fastify/PostgreSQL are loopback-only, public/Funnel/subnet/exit routing is absent, an approved Tailscale device succeeds, and unapproved/public clients fail;
9. prove retailer traffic exits through the home residential IP and broker, not a Tailscale route;
10. test CSRF/origin/session/login throttling, SSRF origin/redirect restrictions, private/link-local address blocking, and log redaction;
11. create the daily dump without stopping collection and complete the restore drill below.

## Backup and restore acceptance

- Build `pg_dump -Fc` to a temporary path, parse its table of contents, checksum it, and publish atomically.
- Retain exactly the latest seven completed daily generations.
- Weekly, restore the newest generation into a clean disposable database; a parse/checksum alone is not sufficient.
- Verify schema version, extensions, constraints, current/history/event invariants, command idempotency, representative search, Search Document rebuild, and regenerated due work.
- Simulate a corrupt newest archive and prove the next valid generation is selected with visible degradation.
- Show external-copy age and absence explicitly; a same-disk copy is not disk-loss protection.
- Meet the accepted logical-loss RPO of at most 24 hours and representative database-restore RTO under four hours once the replacement PostgreSQL installation is ready.

## Gate C — live Storefront qualification and rollout acceptance

For each Storefront Integration, preserve a versioned Qualification Record containing:

- approved origins and redirect evidence;
- Adapter, configuration, recipe, and fixture versions;
- complete Catalog Discovery boundary, counts, pagination/variant closure, fingerprints, and Certification decision;
- rejected discovery routes and why;
- shopper-visible stock-semantics comparisons and selected/rejected signals;
- full initial Stock Monitoring target accounting;
- sentinel definition;
- broker metrics, typed failures, and any Browser Access Grant;
- timestamps and retained evidence hashes.

A Platform Adapter's contract suite does not waive per-Storefront qualification. A live success does not waive the deterministic suite. Recurring scheduling begins only after certification, Stock Semantics Validation, and initial target accounting. Strictly evidenced Dead, Non-Store, Dormant, or Blocked outcomes are valid terminal outcomes; Partial is not.

Final rollout acceptance deterministically regenerates the Onboarding Closeout Report and exhaustive CSV ledgers. Every immutable workbook row, Candidate Site, Storefront branch, Integration, Adapter change, rejected method, and terminal outcome must reconcile exactly. Hidden or unaccounted branches, nondeterministic totals, and any Partial case fail acceptance.

## Evidence bundle and ownership

Each gate emits machine-readable results plus a concise human report keyed to:

- git commit and lockfile, schema/migration hash, Connector Registry version, and fixture manifest;
- machine/OS/runtime/browser/PostgreSQL versions and representative-data manifest;
- test seed, commands, durations, failures, and artifacts;
- query plans and latency/throughput distributions rather than one best result;
- failure-injection, reboot, access-boundary, backup, and restore evidence;
- live Qualification Records and final reconciliation totals.

The repository owns deterministic fixtures, tests, migrations, scripts, and report schemas. The deployed Mac owns timestamped operational and live-qualification evidence. Secrets, cookies, authorization headers, unrestricted response bodies, and Tailscale node keys never enter artifacts.

## Implication for implementation sequencing

Build the verification harness with the first vertical slice, not after the application. Each later slice adds its contract fixtures, invariants, failure scenarios, and evidence generator. Before full Storefront rollout, pass the deterministic suite and Mac-mini rehearsal on representative load. During rollout, require Gate C per Storefront and continuously regenerate the closeout reconciliation.

The representative-load slice must also measure database, 30-day detail, and image-cache growth. Use that evidence to set the deployment's quota-bound rebuildable media cache and disk high-water thresholds before full rollout; do not invent a fixed capacity from the Seed List alone.

## Primary sources

- [Playwright test retries and flaky classification](https://playwright.dev/docs/test-retries)
- [Playwright accessibility testing and limits of automation](https://playwright.dev/docs/accessibility-testing)
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Fastify testing with `inject()`](https://fastify.dev/docs/latest/Guides/Testing/)
- [TanStack Query optimistic updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
- [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [PostgreSQL `EXPLAIN`](https://www.postgresql.org/docs/current/sql-explain.html)
- [PostgreSQL `pg_dump`](https://www.postgresql.org/docs/current/app-pgdump.html)
- [PostgreSQL `pg_restore`](https://www.postgresql.org/docs/current/app-pgrestore.html)
- [Drizzle transactions](https://orm.drizzle.team/docs/transactions)
- [pg-boss documentation](https://github.com/timgit/pg-boss/tree/master/docs)
- [fast-check documentation](https://fast-check.dev/)
