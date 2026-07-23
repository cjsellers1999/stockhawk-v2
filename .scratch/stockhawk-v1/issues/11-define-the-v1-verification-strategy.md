# Define the V1 verification strategy

Type: research
Label: wayfinder:research
Status: resolved
Triage: ready-for-agent
Blocked by: 04, 05, 06, 07, 08, 09, 10

## Question

What automated, audit, and operational verification is required to trust V1? Define contract tests for Connector Adapters, Catalog Certification checks, snapshot reconciliation and anomaly detection, database and Change Event invariants, scheduler simulations and live benchmarks, search correctness and latency tests, UI accessibility, Health Page failure scenarios, backup/restore drills, and acceptance evidence for the implementation handoff.

## Upstream verification constraints

- Prove every true UI mutation crosses the optimistic command boundary; direct TanStack Query mutation use outside that boundary must fail static verification.
- Prove the exact-pinned shadcn/Base UI/Tailwind/Query/Table graph, Table v9 APIs, compiler-aware Tailwind rules, class formatting, semantic light/dark output, and strict peer compatibility; shadcn's v8 Data Table recipe cannot enter production.
- Prove the built Search and Health experience matches the [locked owner design](../design/DESIGN.md) at representative desktop, tablet, and mobile widths in light and dark modes; deliberate baseline changes require owner approval and a new artifact hash.
- For every mutation family, test immediate optimistic state, exact rollback after rejection, and reconciliation with authoritative data after settlement.
- Test the truth boundary explicitly: actions may optimistically show submitted intent such as `Queued`, but must not optimistically claim Storefront health, stock, crawl, or certification outcomes.
- Prove the dual private-access boundary: an approved off-LAN Tailscale device can use Serve, an unapproved tailnet device and public client cannot, Funnel/exit/subnet/public forwarding stay disabled, and neither API nor PostgreSQL is directly reachable.
- Reboot with no macOS login and prove PostgreSQL, API, worker, and Caddy restore local operation; then log in normally and prove persistent Tailscale Serve returns without reconfiguration. Tailscale failure must leave local search and collection intact.
- Verify retailer traffic still exits through the home residential IP and shared Crawl Request Broker rather than any Tailscale route.
- Verify resumable Onboarding Cases, unique shared-Storefront ownership, many-branch closure, nonblocking shared/Bespoke repair dependencies, and the first-time recurring-schedule publication gate.
- Require every Platform and Bespoke Connector Adapter to prove per-Storefront shopper-visible Stock Semantics Validation; test contradiction rejection, honest `unknown`, rotating sentinel drift detection, preservation of prior trustworthy status, and independence from Catalog Certification.
- Reproduce the generated Onboarding Closeout Report from committed facts, reconcile every Seed Site Record through terminal outcomes, and fail acceptance for hidden unaccounted or Partial branches or nondeterministic totals.

## Research asset

- [`V1 verification strategy research`](../research/11-v1-verification-strategy.md)

## Answer

V1 uses three non-substitutable proof planes: deterministic code verification, a representative release rehearsal on the actual Mac mini, and live qualification of every Storefront Integration. Deterministic tests never contact retailers; live calls occur through the Crawl Request Broker during onboarding, explicit re-audit, repair, sentinel work, and measured release rehearsal. Fixtures cannot certify a current Storefront, while a successful live crawl cannot prove replay, rollback, or failure safety.

### Deterministic gate

Every merge candidate passes locked install, format/lint/typecheck/build, checked-in migration validation, architectural static rules, unit/property tests, common Connector conformance, real-PostgreSQL integration tests, Fastify contracts, Playwright end-to-end tests, and automated accessibility checks. The frontend gate proves exact dependency pins, v9 Table integration, type-aware Oxlint, Query/React Compiler rules, compiler-aware Tailwind ESLint, Prettier class ordering, strict peer compatibility, and both semantic themes. Deterministic failures receive no retry-based waiver, and coverage percentage never substitutes for named invariants.

Static verification rejects direct UI mutations outside the optimistic command boundary, network access outside the Crawl Request Broker, domain writes outside the Persistence Boundary, Adapter-owned matching/certification/current-state writes, runtime schema push, unaudited browser use, and retailer-name branches outside registered Bespoke Adapters. Every mutation family proves immediate truthful intent, exact rollback, authoritative reconciliation, duplicate submission, refresh, and overlap behavior; no optimistic state may fabricate stock, health, crawl, or certification success.

Every shared and Bespoke Adapter runs one fixture-based contract kit covering complete pagination and variants, exact identities, duplicates/reordering, cursor loops, missing pages, redirects, malformed responses, timeout/throttle/challenge, bounded commits, checkpoint resume, cancellation, crash, and redelivery. The central Catalog Certifier is tested by falsification: any open traversal, count mismatch, variant gap, inconsistent boundary, stale/version-mismatched evidence, or incomplete branch must remain Partial. Partial observations are immediately searchable but can never reconcile absence or replace prior certification.

Stock Monitoring accounts exactly for every eligible target and preserves prior trustworthy status on failure. Each Storefront Integration still needs live shopper-visible Stock Semantics Validation; a platform-level fixture cannot prove one retailer's theme or inventory configuration. Contradictory machine signals are rejected, intrinsic uncertainty stays `unknown`, and sentinel contradiction stops new use of that signal while preserving prior truth.

Persistence acceptance uses fresh and upgraded real PostgreSQL databases. Negative constraint tests, injected failure after every batch step, concurrent/out-of-order observations, job replay, duplicate commands, event causality, certified-snapshot immutability, Search Document equivalence, and 30-day compaction prove the atomic boundary. One causal transition emits one permanent Change Event; identical replay emits none.

The seeded scheduler simulation contains at least 100,000 independently monitored Offers and varies latency, rate limits, browser cost, crashes, bulk surfaces, and shared-IP capacity. It proves one broker, independent adaptive scopes, per-Storefront ownership, coalescing, fairness, no premature/artificial requests, safe backoff, checkpoint recovery, and status-specific priority. With sufficient modeled capacity it meets the accepted goals; with insufficient capacity it remains safe, prioritizes restock detection, prevents duplicate-backlog growth, preserves bounded catalog progress, and truthfully reports unreachable freshness rather than redefining it.

Search/UI verification uses at least 100,000 representative Offers and covers match-any URL chips, stock/match/freshness filters, flat and Storefront-grouped keyset pagination, refresh/back/forward, concurrent changes, variants as separate rows, stale ordering, provisional visibility, images, and exact retailer handoff. Visual regression compares the real built UI to the locked artifact across both themes and representative responsive widths for Search flat/grouped/degraded and Health healthy/attention states, including long and empty content. On the production Mac topology, the home-network first page must be usable within two seconds and every search/filter/view/page update within 500 milliseconds. Playwright exercises the real built UI/API/database in Chromium and WebKit. V1 targets WCAG 2.2 AA using axe plus manual keyboard, focus, reflow/zoom, contrast, semantics, announcement, and screen-reader checks; missing images never affect health or visibility.

Health verification injects ordinary and structural failures, Retry-After, challenge, stale/Partial work, suspicious drops, unknown stock, semantics drift, collector gaps, queue delay, worker crash, and recovery. It proves independent health dimensions, exact status-specific freshness, safe idempotent remediation, truthful Auto-Recovering versus Repair Required, visible degradation, and separate request/Offer/restock throughput. Throttling changes capacity/freshness rather than falsely degrading access, and an owner action cannot paint canonical health green.

### Mac-mini release gate

Before full rollout and after material topology or migration changes, the target Mac runs a representative rehearsal: clean provision/migration, 100,000-Offer search and scheduler load, accepted query plans and latency distributions, process and network failure injection, worker kill before/after commit, no-login reboot recovery through `launchd`, Caddy local access, Tailscale Serve recovery after normal login, loopback-only API/database, approved-versus-unapproved/public access, SSRF/CSRF/session/log-redaction tests, and proof that retailer traffic still uses the home residential IP and broker.

Daily `pg_dump -Fc` output is parsed, checksummed, atomically published, and retained for seven completed generations. Weekly acceptance restores the newest dump into a clean database and verifies schema, constraints, invariants, search, Search Document rebuild, idempotency, and regenerated due work. A corrupt-newest fallback and missing/stale external-copy state are tested visibly. The accepted targets remain at most 24 hours logical-loss RPO and under four hours representative database-restore RTO once PostgreSQL is ready.

### Live Storefront and final acceptance gate

Every Integration produces a versioned Qualification Record containing approved origins, Adapter/configuration/recipe versions, catalog boundary and closure, counts and variants, fingerprints, rejected methods, shopper-visible stock comparisons, initial monitoring target accounting, sentinel, broker metrics, failures, timestamps, and evidence hashes. Recurring scheduling begins only after Catalog Certification, per-Storefront Stock Semantics Validation, and one complete monitoring accounting pass. Strict Dead, Non-Store, Dormant, or Blocked evidence may close a branch; Partial may not.

V1 is accepted only when all deterministic and Mac gates pass and the generated Onboarding Closeout Report reconciles every immutable workbook row, Candidate, Storefront branch, Integration, Adapter change, rejected method, and terminal outcome. Its exhaustive ledgers must balance and regenerate deterministically, with no hidden, unaccounted, or Partial work.

Each gate emits a commit-keyed Evidence Bundle with environment/schema/fixture versions, the canonical design hash and visual diffs, seeds, commands, distributions and query plans, failures, recovery/security/restore proof, Qualification Records, and final totals. Secrets and unrestricted retailer bodies are excluded. Representative-load measurement sets the quota-bound image cache and disk high-water configuration before full rollout instead of guessing storage limits from the Seed List.
