# Tickets: StockHawk V1 Implementation

These tracer-bullet tickets implement the behavior defined in [SPEC.md](SPEC.md), prove it through [VERIFICATION.md](VERIFICATION.md), and expand it using [ROLLOUT.md](ROLLOUT.md).

Frontend bootstrap follows the [primary-source stack snapshot](../stockhawk-v1/research/frontend-stack-primary-sources.md) and adapts the [pinned frontend tooling reference](../stockhawk-v1/research/frontend-tooling-reference.md).

Work the **frontier**: any ticket whose blockers are all complete. Each ticket must leave the application buildable, demonstrable, and represented in the commit-keyed Evidence Bundle.

## Boot the verified StockHawk skeleton

**What to build:** A production-shaped coarse pnpm workspace whose local Turborepo task graph starts the Fastify API, serves the built React application, connects to a migrated real PostgreSQL database, and runs the deterministic verification entry point.

**Blocked by:** None — can start immediately.

- [ ] Install from one pinned Node.js/pnpm dependency graph, add Turborepo as the local task orchestrator, and produce a repeatable production build.
- [ ] Define coarse workspace boundaries around deployable and genuinely shared Modules; do not create a package for every folder or feature.
- [ ] Configure dependency-aware/filterable tasks and local caching for deterministic work only; explicitly disable caching for migrations, real-database integration, Playwright/live-source checks, backup/restore, and release gates.
- [ ] Resolve requested npm tags at ticket start and exact-pin the results. The decision-date baseline is Table/core `9.0.0-beta.55`, Query `5.101.4`, shadcn `4.14.0`, Base UI `1.6.0`, and Tailwind CSS/Vite plugin `4.3.3`; record any newer resolved versions and never leave a tag or range in the dependency graph.
- [ ] Initialize Tailwind CSS v4 through `@tailwindcss/vite` and the pinned shadcn CLI's `base-nova` Base UI path for Vite/React with TypeScript, CSS variables, neutral metadata, Lucide, and local `apps/web` aliases; install no parallel Radix primitive set.
- [ ] Generate only the shadcn components needed by the locked shell and first tracer path, keep their source local, and map StockHawk's exact light/dark tokens into a CSS-first semantic theme without accepting shadcn defaults.
- [ ] Apply Base UI's required application-root isolation and body positioning, then exercise portaled popups/backdrops and focus behavior in both themes.
- [ ] Adapt the inspected type-aware Oxlint, TanStack Query, React Compiler, Tailwind ESLint, Prettier Tailwind-order, and editor configurations to StockHawk paths; keep every Tailwind correctness rule, zero-warning checks, no arbitrary utilities, and config unit tests.
- [ ] Keep strict pnpm peer checks. If the selected TypeScript/tooling combination requires a narrow exact-version exception, document only that package/version pair and prove lint, typecheck, config tests, and a production build; never disable peer checks workspace-wide.
- [ ] Establish shared Zod 4 runtime contracts and decode environment/startup configuration once before trusted application Modules receive it.
- [ ] Start the API and browser application against a checked-in PostgreSQL migration without runtime schema push.
- [ ] Build the locked responsive StockHawk shell, exact light/dark tokens, desktop sidebar/top bar, mobile top rail, Search/Health navigation, and truthful API/database/worker readiness from the canonical design artifact.
- [ ] Establish locked-install, formatting, zero-warning linting, type checking, unit/integration orchestration, and production-build gates; prove one-off exact design geometry lives in component CSS Modules/scoped properties rather than arbitrary Tailwind values or fake global tokens.
- [ ] Record runtime, schema, lockfile, canonical design SHA-256, command, and test metadata in an initial Evidence Bundle.

## Persist and search one synthetic Offer

**What to build:** One synthetic exact-variant Retailer Listing travels through the authoritative relational model and appears as a searchable Offer with Current Stock State and a Change Event.

**Blocked by:** Boot the verified StockHawk skeleton.

- [ ] Create the first normalized identities, observation/evidence, Product, Catalog Match, stock, event, and Search Document relations with database constraints.
- [ ] Commit the entire synthetic Observation Batch through one typed idempotent Persistence Boundary operation.
- [ ] Read the resulting Offer through the Fastify search API and the locked TanStack Table v9 Search composition, using v9 `useTable`/feature APIs and the official shadcn Base UI v9 example rather than shadcn's v8 Data Table recipe; include thumbnail fallback, raw/canonical title hierarchy, Storefront, Stock, Match, Last checked, and exact handoff columns.
- [ ] Prove rollback, replay, stale/out-of-order observation handling, one active match, and causal Change Event uniqueness against real PostgreSQL.
- [ ] Rebuild Search Documents from authoritative state without any source request and obtain equivalent results.

## Secure one optimistic owner command

**What to build:** The single owner can log in and issue one safe command that updates the UI immediately, queues idempotent intent, rolls back rejection, and reconciles authoritative state.

**Blocked by:** Persist and search one synthetic Offer.

- [ ] Implement the admin login, server session, secure cookie, login throttling, exact-origin, Fetch-Metadata, and CSRF boundary.
- [ ] Register one owner command with an idempotency key, durable receipt, domain intent, and atomic pg-boss wakeup.
- [ ] Share Zod command/query schemas across browser and API boundaries, reject malformed input at the Interface, and retain exact optimistic rollback for authoritative rejection.
- [ ] Implement the shared optimistic command boundary with immediate truthful intent, exact rollback, and authoritative reconciliation.
- [ ] Use TanStack Query v5 query-key factories and cache APIs inside that boundary; feature code never owns ad hoc mutation state, cache keys, cancellation, rollback, or invalidation.
- [ ] Fail static verification for direct feature `useMutation`, direct mutation endpoint calls, or unregistered mutation families.
- [ ] Test refresh, duplicate clicks, overlapping commands, server rejection, and the rule that external outcomes may show only `Queued` until proven.

## Import Seed provenance and resume one Onboarding Case

**What to build:** The immutable workbook becomes a reviewed Seed List whose source rows reconcile to Candidate Sites, and one durable Onboarding Case can pause and resume without losing work.

**Blocked by:** Persist and search one synthetic Offer; Secure one optimistic owner command.

- [ ] Verify the source workbook hash and preserve every Seed Site Record unchanged as provenance.
- [ ] Apply the approved endpoint-equivalence normalization while retaining audit-gated ambiguity.
- [ ] Create deterministic Candidate Site identities and exact source-to-Candidate reconciliation totals.
- [ ] Persist one Onboarding Case with stage, evidence, attempts, dependencies, next action, and terminal/nonterminal state.
- [ ] Expose truthful onboarding progress and one idempotent resume/re-audit command without inventing a Storefront outcome.

## Govern source access through the Broker and Connector contract

**What to build:** One fixture-backed Connector Adapter performs bounded Catalog Discovery and Stock Monitoring only through the Crawl Request Broker and produces common evidence, checkpoints, metrics, and typed outcomes.

**Blocked by:** Persist and search one synthetic Offer.

- [ ] Establish the two-job Connector contract, typed registry, versioned Zod Integration/Adapter/Certification schemas, and cancellation model.
- [ ] Route HTTP, browser, redirects, and images through the Broker with global/Storefront permits, cache, backoff, allowed origins, and private-address rejection.
- [ ] Persist bounded batches and opaque checkpoints safely, including restart-only replay.
- [ ] Emit exact parent/variant identities, raw retailer facts, source evidence, target accounting, typed failures, and Connector Run Metrics without classification or certification.
- [ ] Decode raw source envelopes at each Adapter seam, tolerating unrelated additive retailer fields, and strictly validate common Connector output/versioned JSON once before authoritative commands consume it.
- [ ] Run the common conformance fixtures for pagination, duplicates, cancellation, replay, malformed data, throttle/challenge, and forbidden direct access.

## Bootstrap the Master Catalog and Local Reclassification

**What to build:** Official Jellycat evidence populates an open-world exact-variant Master Catalog, while stored retailer listings can be classified and reclassified locally without retailer requests.

**Blocked by:** Govern source access through the Broker and Connector contract.

- [ ] Account for every configured official regional, exact-variant, New/Coming Soon, and accessible historical source as complete or explicitly Partial/Blocked with evidence.
- [ ] Join official observations only through verified identifiers and retain regional names, measurements, images, aliases, lifecycle evidence, and source authority.
- [ ] Implement Product Authority, exact and variant-unknown Products, deterministic Normalized Titles, reversible Catalog Matches, listing classifications, and Decision Receipts.
- [ ] Preserve every Retailer Listing and keep Product variants and source listings separate.
- [ ] Trigger Local Reclassification after catalog/rule changes with zero retailer traffic and correct Search Document updates.
- [ ] Cover legacy, punctuation, accent, measurement, reordered-name, retailer-decoration, translated, conflict, false-positive, and exact-variant regression cases.

## Select and audit the first real Storefront

**What to build:** A bounded preflight and browser/network Storefront Audit select one normal high-leverage retailer and publish a proposed versioned Storefront Integration with retained evidence.

**Blocked by:** Import Seed provenance and resume one Onboarding Case; Govern source access through the Broker and Connector contract; Bootstrap the Master Catalog and Local Reclassification.

- [ ] Select from the cleaned Seed List using the approved public-HTTP, common-platform, variant, image, and observable-stock criteria.
- [ ] Record rejected alternatives and why the official Jellycat Storefront is not the retailer canary.
- [ ] Use Computer Use plus a sanitized network trace to resolve Candidate, redirect, ownership, origin, platform, catalog, and stock surfaces.
- [ ] Follow every distinct retailer-controlled Storefront branch and coalesce only identities proven equivalent.
- [ ] Publish declarative approved origins, catalog roots, Adapter/configuration version, expected surface, Certification Recipe, pacing hints, and any audited Browser Access Grant.

## Discover the first Storefront into searchable Partial results

**What to build:** The first real Platform Connector Adapter exhaustively walks its catalog in bounded batches; every valid observation is immediately classified and searchable even before completion.

**Blocked by:** Select and audit the first real Storefront.

- [ ] Implement only the real reusable Adapter capabilities required by the audited Storefront.
- [ ] Enumerate every parent and exact sellable variant through the governed Broker with stable identities and resumable checkpoints.
- [ ] Commit observations, evidence, local classifications, Current State Projections, Search Documents, and discovery Change Events atomically.
- [ ] Show confirmed Offers and Provisional Candidates in the locked Search design with match-any URL chips, Match/Stock/Freshness filters, images, freshness, Partial state, exact handoff, and the accepted degradation strip.
- [ ] Support flat and Storefront-grouped server-side keyset traversal without deduplicating listings.
- [ ] Preserve all valid results and prior truth when discovery is interrupted or fails.

## Certify and reconcile the first complete catalog

**What to build:** The central Catalog Certifier accepts only complete, consistent first-Storefront proof and publishes an immutable Catalog Snapshot without unsafe absence inference.

**Blocked by:** Discover the first Storefront into searchable Partial results.

- [ ] Submit a versioned Certification Claim with route, count, pagination/end, parent/variant, boundary, fingerprint, visibility, gap, and Integration evidence.
- [ ] Evaluate common invariants plus the pinned Certification Recipe outside the Adapter.
- [ ] Seal unique immutable snapshot membership and activate certification in one authoritative transaction.
- [ ] Falsify certification for open traversal, missing variant/page, count disagreement, unstable boundary, stale/version-mismatched evidence, or incomplete branches.
- [ ] Prove Partial cannot reconcile absence and that Listing Presence needs two certified absences plus direct disappearance evidence.
- [ ] Derive Dormant only from a certified complete zero-Jellycat snapshot.

## Validate stock and publish initial monitoring

**What to build:** The first Storefront’s machine stock evidence is compared to exact shopper-visible variants, then every eligible Offer receives one accounted initial monitoring outcome.

**Blocked by:** Certify and reconcile the first complete catalog.

- [ ] Compare candidate machine signals with contemporaneous rendered pages across every currently observable availability condition.
- [ ] Reject contradictions and retain honest `unknown` when no shopper-equivalent signal exists.
- [ ] Normalize only in stock, out of stock, preorder, and unknown while preserving raw evidence.
- [ ] Account for every eligible monitoring target as observed, disappeared with direct evidence, or not observed without overwriting prior truth.
- [ ] Create the rotating Stock Semantics Sentinel and prove contradiction suspends new signal use while preserving prior trustworthy state.
- [ ] Cross the recurring-schedule publication gate only after certification, semantics validation, and initial target accounting all pass.

## Schedule recurring work and expose truthful Health

**What to build:** The first published Storefront runs durable adaptive Catalog Discovery and Stock Monitoring, while Search and Health show honest capacity, coverage, freshness, failures, and remediation.

**Blocked by:** Secure one optimistic owner command; Validate stock and publish initial monitoring.

- [ ] Plan due work through PostgreSQL/pg-boss with one active Storefront job, coalesced targets, bounded catalog quanta, leases, checkpoints, and idempotent recovery.
- [ ] Learn shared-IP, Storefront, and browser capacity independently from real due work while obeying Retry-After, backoff, and challenge evidence.
- [ ] Implement 15-minute restock/unknown goals, 60-minute in-stock/preorder goals, active hourly change/daily discovery, and Dormant daily-signal/weekly discovery policies.
- [ ] Keep catalog and stock work fair, prefer HTTP, and allow adaptive browser contexts only behind audited grants and one shared IP budget.
- [ ] Expose independent access, certification/coverage, catalog freshness, monitoring coverage, status-specific freshness, lifecycle, Collection Gap, throughput, backlog, Attention Severity, and timeline facts.
- [ ] Render the locked Health composition: four summary cards, owner-impact filter/order, linear Storefront fact rows, applicable actions/progress, and rollout/status/throughput side panels without card-per-Storefront drift.
- [ ] Make Retry, Run discovery, and Re-audit optimistic/idempotent without bypassing pacing or painting canonical Health healthy.

## Prove 100,000-Offer performance and storage

**What to build:** A representative 100,000-Offer dataset proves that the first complete production path remains fast, safe, rebuildable, and storage-bounded before more Adapters are added.

**Blocked by:** Schedule recurring work and expose truthful Health.

- [ ] Generate deterministic representative Offers, listings, variants, matches, statuses, histories, Storefront states, failures, images, and Search Documents using measured first-Storefront distributions.
- [ ] Prove first home-network page readiness within two seconds and every search/filter/view/page update within 500 milliseconds; retain distributions and query plans.
- [ ] Pass visual regression against the locked artifact at representative desktop, tablet, and mobile widths in light and dark modes for Search and Health, including long, empty, loading, missing-image, overflow, and focus states.
- [ ] Simulate sufficient and insufficient IP capacity, fair scheduling, coalescing, backoff, browser accounting, crashes, and truthful unreachable freshness.
- [ ] Verify PostgreSQL constraints, concurrency, Search Document rebuild, Change Event causality, retention compaction, and backup-size behavior at load.
- [ ] Measure database, 30-day detail, diagnostics, and media growth; set initial cache quota and disk high-water values with safe headroom.
- [ ] Record any architecture/index changes and rerun the full deterministic gate before Connector expansion.

## Reuse the shared HTTP Adapter on a second Storefront

**What to build:** A second distinct retailer uses the first shared Adapter through declarative Integration configuration, proving that reusable behavior is not a retailer-name special case.

**Blocked by:** Prove 100,000-Offer performance and storage.

- [ ] Audit and publish the second Storefront Integration without executable configuration or retailer branches.
- [ ] Pass shared conformance plus independent live catalog closure, stock-semantics, and target-accounting qualification.
- [ ] Demonstrate differing theme/configuration facts remain Integration data or justify an evidence-backed shared capability extension.
- [ ] Keep both Storefront schedules isolated, broker-governed, searchable, and visible in Health.

## Add another common platform

**What to build:** A second high-leverage platform Adapter widens real catalog and stock coverage without weakening the common Connector or certification seams.

**Blocked by:** Prove 100,000-Offer performance and storage.

- [ ] Select an audited pilot Storefront whose public capability differs materially from the first platform.
- [ ] Implement the smallest reusable Adapter capability supported by retained evidence.
- [ ] Pass common conformance, method-specific certification falsification, shopper-visible stock validation, and initial monitoring accounting.
- [ ] Prove scheduler, persistence, matching, Search, and Health require no platform branch.

## Qualify a browser-required Storefront

**What to build:** One Storefront whose shopper-visible catalog truly needs browser execution qualifies through a narrow Browser Access Grant and the same Connector contract.

**Blocked by:** Prove 100,000-Offer performance and storage.

- [ ] Retain evidence that allowed HTTP methods cannot supply dependable catalog or stock facts.
- [ ] Scope browser routes, origins, downloads, credentials, and navigation through the audited Integration and Broker.
- [ ] Pass browser-context isolation, shared-IP accounting, cleanup, cancellation, backoff, and challenge failure tests.
- [ ] Earn independent Catalog Certification and Stock Semantics Validation without CAPTCHA interaction, evasion, or fingerprint impersonation.
- [ ] Demonstrate HTTP-capable work remains HTTP-first and browser pressure cannot starve other work.

## Qualify a Bespoke Connector

**What to build:** One genuinely exceptional Storefront receives independent extraction code behind the unchanged two-job Connector interface.

**Blocked by:** Prove 100,000-Offer performance and storage.

- [ ] Retain the bounded proof that no existing registered Platform Adapter/configuration can satisfy the audited public surface.
- [ ] Register a stable versioned Bespoke Adapter with no new caller-facing interface.
- [ ] Pass the full common conformance kit, method-specific certification falsification, stock validation, target accounting, and failure isolation.
- [ ] Prove its code/configuration and repair scope affect only the owning Storefront branches unless a reusable capability is deliberately extracted.

## Prove terminal outcomes and closeout generation

**What to build:** Real onboarding cases demonstrate Dead, Non-Store, certified zero-Jellycat Dormant, and nonterminal Partial behavior, and a deterministic report reconciles all pilot input.

**Blocked by:** Import Seed provenance and resume one Onboarding Case; Certify and reconcile the first complete catalog; Prove 100,000-Offer performance and storage.

- [ ] Complete live evidence-backed Dead, Non-Store, and Dormant pilot outcomes using their accepted thresholds.
- [ ] Prove Blocked requires a reproducible external barrier after all allowed methods and that ordinary failure/Partial cannot promote itself.
- [ ] Suspend nonterminal cases with exact stage, evidence, checkpoint, wait reason, dependency, and next action while unrelated cases proceed.
- [ ] Generate a human-readable report and exhaustive Candidate, Storefront, Integration, Adapter, method, and outcome ledgers from committed facts.
- [ ] Balance source rows and branches, reject hidden Partial/unaccounted work, and reproduce identical substantive totals.

## Pass the actual-Mac release gate

**What to build:** The complete capability pilot runs safely and recoverably on the target Mac mini under the production topology and representative load.

**Blocked by:** Reuse the shared HTTP Adapter on a second Storefront; Add another common platform; Qualify a browser-required Storefront; Qualify a Bespoke Connector; Prove terminal outcomes and closeout generation.

- [ ] Provision pinned Node/PostgreSQL/application/Caddy/Tailscale/backup configuration and migrate/load the representative database.
- [ ] Prove `launchd` starts built API and worker entrypoints directly with no Turborepo or development-server runtime dependency.
- [ ] Repeat latency, query-plan, scheduler, storage, accessibility, and deterministic release gates on the actual Mac.
- [ ] Manually compare both themes and responsive Search/Health layouts to the locked artifact on the actual Mac; reject unexplained or unapproved baseline drift.
- [ ] Kill worker/database/browser/network/Tailscale paths and prove truthful surviving behavior plus idempotent recovery.
- [ ] Reboot without login and recover PostgreSQL, API, worker, Caddy, and LAN search; after normal login recover persistent Tailscale Serve.
- [ ] Prove approved-private versus unapproved/public access, loopback-only API/database, security controls, and home-ISP retailer egress.
- [ ] Produce, validate, retain, corrupt/fallback, and clean-restore backups within the accepted RPO/RTO; finalize disk high-water and media quota settings.

## Open the pilot for daily use

**What to build:** The owner can use qualified pilot data every day while Search and Health clearly disclose that full onboarding remains underway.

**Blocked by:** Pass the actual-Mac release gate.

- [ ] Publish only individually qualified Integrations into recurring work and retain safe historical/Partial data from all pilot cases.
- [ ] Show rollout coverage, remaining Candidate/branch counts, Partial cases, and Search Health Warnings without calling V1 complete.
- [ ] Exercise the morning flow from multi-chip in-stock search through exact retailer Purchase Handoff on an approved remote and LAN device.
- [ ] Confirm the approved remote and LAN presentations preserve the locked visual hierarchy, density, responsive behavior, and all required facts without card-per-result fallback.
- [ ] Regenerate and retain the pilot Evidence Bundle and reconciled closeout view for the release commit.

## Generate deterministic rollout sub-batches

**What to build:** The remaining Candidate queue becomes reproducible, connector-leverage-ordered execution tickets small enough for one fresh context each.

**Blocked by:** Open the pilot for daily use.

- [ ] Coalesce only proven Candidate aliases/shared Storefront ownership and preserve every source/branch link.
- [ ] Rank the largest reusable Connector cohort first while reserving a bounded fair lane for unknown and likely Bespoke cases.
- [ ] Commit deterministic sub-batch manifests and reconciliation baselines for the first 25-Candidate wave.
- [ ] Generate local sub-batch tickets by one manageable shared-Adapter cohort or one exceptional/repair case, each with explicit blockers and evidence criteria.
- [ ] Require every sub-batch to commit Adapter/Integration changes, case progress, evidence, and reconciliation delta before successors run.

## Complete and gate Wave 25

**What to build:** Twenty-five previously unhandled Candidate Sites reach accepted terminal outcomes or durable nonterminal suspension, and the first expansion gate proves no systematic defect.

**Blocked by:** Generate deterministic rollout sub-batches; every generated Wave 25 sub-batch ticket.

- [ ] Execute all Wave 25 sub-batches through the full onboarding and per-Integration qualification workflow.
- [ ] Reconcile all source rows, Candidate branches, ownership links, Adapter changes, and outcomes with no hidden work.
- [ ] Inspect alias/duplicate rates, Partial/failure reasons, classification/certification anomalies, review growth, disk/media growth, and IP behavior.
- [ ] Repair and replay systemic faults before expansion; preserve isolated cases without blocking unrelated completion.
- [ ] Generate deterministic Wave 100 manifests/tickets only after this gate passes.

## Complete and gate Wave 100

**What to build:** The rollout reaches 100 cumulative handled Candidates while proving shared repairs, fairness, freshness, and storage remain healthy.

**Blocked by:** Complete and gate Wave 25; every generated Wave 100 sub-batch ticket.

- [ ] Execute the generated sub-batches and preserve one-context scope per ticket.
- [ ] Repeat full reconciliation and anomaly checks at 100 cumulative Candidates.
- [ ] Verify shared Adapter repairs wake every dependent case and Bespoke repairs remain isolated.
- [ ] Verify review inflow/backlog, freshness capacity, one-off progress, and Health explanations remain within the accepted design.
- [ ] Generate deterministic Wave 500 manifests/tickets only after this gate passes.

## Complete and gate Wave 500

**What to build:** The rollout reaches 500 cumulative handled Candidates and validates production-scale capacity projections, recovery, and storage thresholds.

**Blocked by:** Complete and gate Wave 100; every generated Wave 500 sub-batch ticket.

- [ ] Execute the generated sub-batches and retain complete per-Integration Qualification Records.
- [ ] Repeat reconciliation, anomaly, connector-leverage, fair-lane, review, Partial/failure, and IP-pressure checks.
- [ ] Compare observed workload with the 100,000-Offer model and expose any unreachable freshness without unsafe tuning.
- [ ] Verify database/media/log growth, backup duration, and clean-restore time remain within measured limits.
- [ ] Generate deterministic remainder manifests/tickets only after this gate passes.

## Complete the remainder and final V1 closeout

**What to build:** Every remaining Candidate Site and Storefront branch reaches an accepted outcome, all V1 gates pass, and the exhaustive closeout proves completion.

**Blocked by:** Complete and gate Wave 500; every generated remainder sub-batch and repair ticket.

- [ ] Drain the connector-leverage queue and fair one-off lane without leaving an unaccounted Candidate or branch.
- [ ] Resolve every Partial case through certification or a strictly evidenced allowed terminal outcome.
- [ ] Ensure every live Integration has current Catalog Certification, Stock Semantics Validation, target accounting, sentinel, and recurring schedule evidence.
- [ ] Pass deterministic and actual-Mac gates for the final release commit and verify daily operation remains available.
- [ ] Generate the final report and exhaustive CSV ledgers; balance them to the immutable workbook and reproduce substantive results.
- [ ] Declare V1 complete only when no hidden, unresolved, unaccounted, or Partial work remains.
