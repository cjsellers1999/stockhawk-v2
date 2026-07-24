# StockHawk V1 Rollout Runbook

## Operating rule

Rollout is agent-led and evidence-gated. The owner is interrupted only for new authority or an unresolved product/scope choice. Technical ambiguity, Connector selection, Storefront inspection, Adapter repair, retries, and terminal evidence are execution work.

Every Candidate Site owns one durable resumable Onboarding Case. Every distinct retailer-controlled commerce branch must close or link to the unique case owning shared Storefront work. Partial is never a terminal outcome.

## Stage 1 — first real Storefront

Run bounded preflight over plausible cleaned Seed List candidates and choose a normal high-leverage retailer that has:

- a common shared platform;
- credible complete public HTTP enumeration;
- exact variants and images;
- contemporaneously observable in-stock and out-of-stock examples;
- no CAPTCHA, credentials, private catalog, or exceptional bypass requirement.

Do not use the official Jellycat Storefront as this retailer canary. Record the selected Storefront, rejected alternatives, and evidence.

Take it through the complete production path: Seed provenance, Onboarding Case, Storefront Audit, Zod-validated Integration and Connector boundaries, Adapter, official Master Catalog input, Catalog Discovery, bounded persistence, local classification, Certification, Stock Semantics Validation, full monitoring target accounting, recurring-schedule publication, Search, Health, Change Events, and Evidence Bundle. Search and Health must use the [locked owner design](../stockhawk-v1/design/DESIGN.md) from the first slice; rollout never postpones visual conformance.

## Stage 2 — immediate representative-load gate

Before widening Connector coverage, load at least 100,000 representative Offers/Search Documents. Preserve measured first-Storefront distributions and add every required match, status, staleness, history, image, Storefront, Health, and failure shape.

Pass query, UI, scheduler, concurrency, retention, event, backup-size, database-growth, and media-growth checks. Fix architecture now. Set initial quota-bound media cache and disk high-water configuration from measurements; do not infer capacity from Candidate count alone.

## Stage 3 — capability pilot

Select the smallest real cohort that proves capabilities rather than an arbitrary store count:

1. reuse the first shared HTTP Adapter on a second distinct Storefront Integration;
2. qualify another common platform shape;
3. qualify one audited browser-required Integration;
4. qualify one Bespoke Connector Adapter;
5. complete live Dead, Non-Store, and certified zero-Jellycat Dormant outcomes;
6. generate and reconcile the pilot closeout view.

Each Integration supplies its own shopper-visible stock proof. Shared platform conformance cannot waive Storefront-specific validation.

## Stage 4 — actual-Mac release gate

Install the candidate release on the target Mac mini and pass the complete verification matrix: representative performance, process and network failures, no-login background-service reboot, post-login Tailscale return, Tailscale-only ingress and deny-by-default device authorization, residential egress, backup/restore, storage thresholds, locked-design comparison, and manual accessibility checks. Do not deploy Caddy or reintroduce application authentication.

Only after the capability pilot and this gate may full rollout open. At that point the owner may use pilot data daily; Search and Health must disclose incomplete rollout coverage and may never label V1 complete.

## Stage 5 — full rollout selection

Choose work by:

1. coalescing Candidate aliases and duplicate Storefront ownership already proven;
2. prioritizing the Connector capability that unlocks the largest remaining cohort;
3. ordering deterministically within that cohort;
4. continuously advancing a separately bounded fair lane for unknown-platform and likely Bespoke cases.

Do not follow spreadsheet order when it sacrifices Connector leverage. Never let leverage starve one-off Storefronts.

Already published Integrations continue normal Stock Monitoring and Catalog Discovery during rollout. The scheduler gives due restock work urgency while every onboarding/catalog lane retains bounded progress and all requests remain broker-safe.

## Stage 6 — widening waves

### Wave 25

Onboard 25 previously unhandled Candidate Sites selected by the rollout policy. Then reconcile all input rows and branches, inspect duplicate/alias rates, Partial and failure reasons, classification/certification anomalies, storage growth, and IP response. Repair systemic problems and replay affected facts before expanding.

### Wave 100

Continue to 100 cumulative Candidates. Repeat the same gate with special attention to shared-Adapter drift, review backlog growth, freshness capacity, and whether a single repair restores multiple suspended cases.

### Wave 500

Continue to 500 cumulative Candidates. Repeat the gate, validate capacity projections against observed workload, and confirm media/database high-water settings and backup/restore duration remain safe.

### Remainder

Release the remaining deterministic queue. Continue connector-leverage ordering and the fair bespoke lane until every Candidate and every branch is terminal.

Large waves execute as deterministic sub-batches small enough for one implementation context. Each sub-batch commits its manifest, evidence, case updates, Adapter/Integration changes, and reconciliation delta before the next begins.

## Repair and resume

- A transient or throttled case yields with checkpoint, evidence, retry guidance, and next eligible time; other cases continue.
- Shared Adapter defects coalesce behind one versioned repair and all dependent cases resume after conformance and representative live proof.
- Bespoke defects suspend only their Storefront branches.
- Integration Drift stops use of the affected behavior, retains data, publishes a versioned repair, and requires recertification where coverage changed.
- Invalid or unsupported-version Integration, Connector, evidence, or checkpoint data fails at its Zod Interface and enters visible Repair Required state; it never reaches trusted Modules by best effort.
- Stored observations are reclassified locally after matcher/catalog changes before targeted network refreshes.
- A systemic defect or unexplained broad anomaly stops expansion, not the already safe read experience.
- Disposable investigations are deleted or promoted into registered Adapter code, fixtures, and tests before a case closes.

## Wave evidence

Every sub-batch and wave records:

- immutable input manifest and deterministic selection order;
- Candidate-to-Storefront branches and ownership links;
- Adapters and Integrations added or changed;
- certification and stock-semantics outcomes;
- Dead, Non-Store, Dormant, Blocked, and remaining nonterminal reasons;
- alias/duplicate, Product/classification, review, Partial, and typed-failure distributions;
- request/useful-observation throughput, throttles/challenges, backlog/freshness, and browser share;
- database, diagnostics, evidence, media, backup, and restore growth;
- deterministic test and qualification references;
- canonical design hash and visual-regression references for UI-affecting releases;
- balanced reconciliation delta.

## Completion

Generate the Onboarding Closeout Report and exhaustive CSV ledgers from committed facts. Reconcile every original Seed Site Record through Candidate Site, every Storefront branch, every published Integration, every Adapter change, every rejected method, and every terminal classification. Regeneration from identical state must produce the same substantive result.

V1 is complete only when:

- every deterministic and actual-Mac gate passes for the release commit;
- every live Integration has current required qualification evidence;
- every Candidate and Storefront branch has an accepted terminal outcome;
- no hidden, unaccounted, unresolved, or Partial case remains;
- report and ledger counts balance to the immutable workbook.
