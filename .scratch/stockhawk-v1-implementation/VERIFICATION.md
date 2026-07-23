# StockHawk V1 Verification Matrix

This matrix maps V1 promises to three proof planes. Deterministic tests never contact retailers. Actual-Mac evidence cannot replace live Storefront qualification, and live success cannot replace deterministic replay/failure tests.

## Gate A — deterministic change gate

Every change must pass locked install, format, lint, typecheck, production build, checked-in migration validation, architectural static checks, unit/property tests, Connector contracts, real-PostgreSQL integration, Fastify contracts, Playwright end-to-end, and axe automation through the checked-in local Turborepo task graph.

| Promise | Deterministic proof |
| --- | --- |
| Workspace task integrity | Dependency/filter graph and declared input/output/environment tests; deterministic local cache hits are reproducible; migrations, real-database, browser/live-source, backup/restore, and release tasks prove cache-disabled |
| Runtime contract integrity | Shared Zod schemas enforce each owning Interface: closed app contracts reject unknown structure, retailer payloads tolerate unrelated additive fields, malformed/missing consumed fields and unknown versions fail, inferred types compile from the same source, and independent PostgreSQL negative tests still fail invalid storage |
| Frontend dependency contract | Exact resolved Table v9 beta/core, Query v5, shadcn, Base UI, and Tailwind v4 versions are pinned and recorded; v9 APIs compile without the shadcn v8 recipe; shadcn uses `base-nova` with Base UI and local source; required Base UI portal layout rules work; no Radix duplicate or alternative styling runtime enters the graph |
| Frontend policy | Type-aware Oxlint and TanStack Query/React Compiler rules pass; Tailwind ESLint rejects arbitrary, unknown, contradictory, obsolete, and unsorted classes with zero warnings; Prettier and IntelliSense share the real stylesheet/class helpers; config tests prove accepted exceptions; peer checks remain strict and any narrow exact exception has compatibility proof |
| Locked visual design | Canonical HTML hash is pinned; visual regression covers Search flat/grouped/degraded and Health healthy/attention plus empty/loading/long/missing-image/overflow/focus states at desktop, tablet, and mobile widths in both themes; baseline changes require owner approval |
| All mutations are optimistic | Static ban outside the shared command boundary; immediate intent, rejection rollback, authoritative reconciliation, duplicate, refresh, and overlap tests for every command family |
| Optimism stays truthful | External work may show `Queued`; tests forbid optimistic stock, health, discovery, or certification success |
| Broker-only network | Static dependency rule plus runtime traps for HTTP, browser, redirects, and images outside the Crawl Request Broker |
| Persistence authority | Static direct-write ban; real-database commands prove atomic evidence/current/search/event/checkpoint updates |
| Connector neutrality | Shared and Bespoke Adapters pass one conformance kit; Adapter attempts to classify, certify, persist, or own pacing fail |
| Exact listing identity | Parent/variant, duplicate/reordered, derived-ID-version, and idempotent replay fixtures preserve every distinct source identity |
| Exhaustive certification | Missing page/cursor/count/variant/boundary/version fixtures must remain Partial; search-only evidence can never certify |
| Safe Partial behavior | Partial observations become searchable but cannot reconcile absence, activate a complete snapshot, or infer stock |
| Matching recall and safety | Regression/property corpus covers identifiers, aliases, word order, accents, measurement forms, retailer decoration, translations, legacy items, conflicts, and separate variants |
| Reversible decisions | Stronger evidence remaps affected Offers only; Decision Receipts and prior identity/history remain immutable |
| Stock truth | Exact target accounting, four statuses, out-of-order results, failures preserving prior state, and no-op refresh without duplicate Change Events |
| Change Events | One causal transition emits one permanent event; identical replay emits none; stream ordering and consumer bookmarks remain valid |
| Snapshot disappearance | Only certified snapshots participate; two certified absences plus direct page evidence are required for inactive presence |
| Scheduler safety | Seeded 100,000-Offer simulation proves adaptive scopes, safe server guidance, one Storefront job, coalescing, fairness, checkpoint recovery, and no artificial traffic |
| Scheduler priority | Out-of-stock/unknown 15-minute urgency outranks separable in-stock/preorder 60-minute work without starving catalog discovery |
| Honest capacity failure | Insufficient modeled capacity preserves safety and reports unreachable goals rather than weakening them or growing duplicate backlog |
| Search correctness | TanStack Table v9 beta with manual server state; locked Search hierarchy and columns; URL match-any chips; Stock/Match/Freshness filters; flat/grouped keyset cursors; concurrent changes; variants; provisional visibility; stale ranking; images; degradation strip; exact handoff |
| Search performance | Representative query plans and load tests; production topology repeats the final latency gate |
| Health truth | Failure-injection state matrix proves independent dimensions, thresholds, recovery, collection gaps, throughput meanings, and idempotent remediation |
| Retention | Thirty-day compaction preserves permanent identities, pins, hashes, causal envelopes, references, events, and rebuildability |
| Accessibility | axe plus component/E2E assertions; manual checks remain in Gate B |
| Closeout | Same committed state regenerates identical substantive report and balanced exhaustive ledgers |

Deterministic failures receive no retry waiver. Record seeds, fixture versions, commands, environment, timing, and artifacts in the commit-keyed Evidence Bundle.

## Gate B — actual-Mac release gate

Run before the capability pilot opens full rollout and after material topology or migration changes.

- Provision locked runtime, PostgreSQL, built application services, Caddy, Tailscale Serve, and backup jobs from documented automation; prove `launchd` has no Turborepo or development-server runtime dependency.
- Migrate an empty database and load at least 100,000 representative Offers/Search Documents plus required history and failure shapes.
- Prove first home-network page usable within two seconds and every search/filter/view/page update within 500 milliseconds; record end-to-end distributions and query plans.
- Run representative due work to record requests/second, conclusive Offer and restock refreshes/second, backlog slope, latency, throttles, challenges, and freshness attainment.
- Kill the worker before and after a committed Observation Batch; prove checkpoint recovery, redelivery idempotency, and no duplicate events.
- Stop PostgreSQL, browser work, retailer internet access, and Tailscale separately; prove surviving local search and truthful Health behavior.
- Reboot with no login; prove PostgreSQL, Fastify, worker, Caddy, and LAN search recover under `launchd`. After normal login, prove persistent Tailscale Serve returns.
- Prove approved Tailscale access succeeds while unapproved tailnet and public access fail. Keep API/database loopback-only and Funnel/subnet/exit/router forwarding disabled.
- Prove retailer traffic exits through the home ISP and Crawl Request Broker, never a Tailscale route.
- Exercise login throttling, session/cookie settings, Origin/Fetch-Metadata/CSRF checks, SSRF origin/redirect/private-address rejection, and log redaction.
- Create `pg_dump -Fc` without stopping collection, parse/checksum/atomically publish it, retain seven completed generations, and restore the newest valid archive into a clean database.
- Verify restored schema, extensions, constraints, current/history/events, idempotency, representative search, Search Document rebuild, and regenerated due work.
- Corrupt the newest archive and prove visible fallback to the next valid generation. Show external-copy absence or staleness honestly.
- Meet at most 24-hour logical-loss RPO and under four-hour representative database-restore RTO once PostgreSQL is ready.
- Measure database, 30-day detail, diagnostics, and media growth; set quota and high-water values while reserving safe disk headroom.
- Complete manual WCAG 2.2 AA-oriented keyboard, focus, zoom/reflow, contrast, status-announcement, semantic-table, and screen-reader checks in light and dark modes.
- Compare the actual-Mac Search and Health rendering to the locked artifact at representative desktop, tablet, and mobile widths; record visual diffs and reject unapproved baseline changes.

## Gate C — live Storefront qualification

Every Storefront Integration receives its own versioned Qualification Record:

- Candidate and approved-origin resolution evidence;
- Adapter, configuration, Integration, Certification Recipe, matcher, and fixture versions;
- complete route/count/pagination/parent/variant/boundary evidence and Certification decision;
- rejected methods and gaps;
- contemporaneous exact-variant shopper-page comparisons for every observable stock condition;
- accepted/rejected machine signal and honest unknown reasoning;
- every eligible initial Stock Monitoring target accounted for;
- rotating Stock Semantics Sentinel definition;
- broker metrics, failures, checkpoints, and any Browser Access Grant;
- timestamps and retained evidence hashes without secrets.

Recurring scheduling publishes only after Catalog Certification, Stock Semantics Validation, and initial target accounting. Dead, Non-Store, certified zero-Jellycat Dormant, and strictly evidenced Blocked may terminate a branch. Partial may not.

## Release and final acceptance

- **Pilot release:** Gate A passes; first Storefront and capability matrix qualify; Gate B passes; generated pilot reconciliation balances. The owner may begin daily use with visible rollout coverage.
- **Wave expansion:** At 25, 100, and 500 Candidates, rerun affected deterministic contracts and review reconciliation, duplicate/alias rates, Partial/failure distributions, classification/certification anomalies, disk/media growth, and IP behavior.
- **V1 acceptance:** Gate A and Gate B pass for the release commit; every input and branch has an accepted terminal outcome; every live Integration has Gate C evidence; no Partial remains; generated report and CSV ledgers reconcile deterministically to the immutable workbook.
