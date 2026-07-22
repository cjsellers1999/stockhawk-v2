# Chart StockHawk V1 for exhaustive Jellycat discovery

Label: wayfinder:map

## Destination

Reach a decision-complete V1 architecture and ordered implementation route for a new, private StockHawk application that runs on a Mac mini, audits every supplied site, certifies exhaustive public Jellycat catalog discovery per Storefront, refreshes Stock Status at the fastest safe residential-IP rate, and provides fast local search plus Storefront health visibility.

The map is complete when nothing material remains undecided before implementation and the full Seed List audit/Connector rollout can be handed off as ordered execution work.

## Notes

- This Wayfinder effort plans V1; production implementation and the full site-by-site rollout begin after the map is complete.
- Work only inside this repository, the explicitly supplied workbook at `/Users/justinsingh/Desktop/stockhawk-sites-2026-07-18.xlsx`, named skill instructions, and public Storefronts intentionally selected during research. Never inspect other projects on this computer.
- Use the canonical language in [`CONTEXT.md`](../../CONTEXT.md). Consult `/domain-modeling` whenever that language changes and `/codebase-design` when placing module seams.
- Consult `/spreadsheets` for workbook analysis, `/computer-use` for human-style Storefront audits, `/database-design-safety` for persistence decisions, `/prototype` for logic/UI prototypes, `/frontend-rules` for frontend work, and `/research` for primary-source platform investigation.
- The original workbook is immutable source evidence. Only a reviewed, normalized, deduplicated Seed List initializes StockHawk.
- Every imported `unsupported` label is untrusted. Every cleaned Candidate Site receives a fresh outcome.
- A one-time Storefront Audit occurs alongside onboarding. It checks whether the site is alive, resolves the actual commerce Storefront, determines the exhaustive catalog method, and classifies live/no-Jellycat, Non-Store Candidate, or Dead Storefront outcomes.
- Connectors are reusable by platform or extraction method. Storefront Integrations contain per-retailer configuration and exceptional overrides.
- Catalog Certification means exhaustive enumeration of the complete public catalog visible to the Mac mini during the latest successful discovery, with evidence. Partial results remain searchable but visibly incomplete.
- Catalog Discovery and Stock Monitoring are separate workloads. Search reads the local database and never waits on live Storefronts.
- The scheduler must maximize safe throughput on one residential IP with global and per-Storefront pacing, adaptive concurrency, caching, and backoff rather than proxy rotation or evasion.
- V1 is a private web application available to the owner's approved Tailscale devices at home or away, with an automatic Caddy LAN fallback after reboot. It is never publicly exposed. Purchasing is a manual handoff to the retailer.
- Search/UI decisions already validated are captured in [`Search prototype verdict`](../search-ui-prototype/NOTES.md): one URL-persistent chip input with match-any semantics; flat Offer pagination; optional Storefront-grouped pagination; Stock Status filters; retailer-page links.
- V1 stores Change Events for future alerts but sends no notifications.
- Never refer to this map's tickets by bare number in user-facing text; link their names.

## Decisions so far

<!-- Closed ticket decisions are appended here as one-line context pointers. -->

- [Define the V1 completion contract](issues/01-define-v1-completion-contract.md) — V1 has an all-or-nothing acceptance contract for site outcomes, evidence-scoped completeness, open-world product discovery, safe freshness, fast local search, diagnostics, private operation, manual purchasing, and alert-ready history.
- [Clean and characterize the Seed List](issues/02-clean-and-characterize-the-seed-list.md) — Only endpoint-equivalent records merge automatically (2,489 safe pre-audit); location review yields an expected 2,247 candidates, with all remaining ambiguity handled by a deterministic 220-endpoint research audit and later full onboarding.
- [Research exhaustive catalog and stock surfaces](issues/03-research-exhaustive-catalog-surfaces.md) — Route by freshly detected public capabilities: prefer documented count/cursor APIs, otherwise close platform product sitemaps plus every exact variant, keep search-only results Partial, and reserve measured browser access for stores whose shopper catalog needs it.
- [Design the open-world Master Catalog and Catalog Match policy](issues/13-design-master-catalog-and-match-policy.md) — Use a recall-first, provenance-preserving catalog that promotes strong best-effort retailer evidence, keeps every listing and variant separate, corrects matches reversibly, and confines manual review to genuine exceptions.
- [Design the Connector and Catalog Certification seam](issues/04-design-the-connector-and-certification-seam.md) — Use one two-job Connector interface for shared and bespoke Adapters, with centrally governed access, evidence-judged certification, immediate Partial value, isolated failures, and measured costs.
- [Design catalog persistence and Change Event history](issues/05-design-catalog-persistence-and-change-history.md) — Use normalized durable identities with atomic current/history transitions, certified absence reconciliation, permanent ordered Change Events, 30-day detailed retention, and rebuildable live Search Documents.
- [Prototype the residential-IP crawl scheduler](issues/06-prototype-the-residential-ip-scheduler.md) — Use an HTTP-first hybrid Network-Limited Scheduler with adaptive shared-IP and Storefront pacing, fair resumable work, and an isolated browser-context pool that expands only for proven browser-required backlog.
- [Define Storefront Health and remediation](issues/07-define-storefront-health-and-remediation.md) — Keep access, catalog coverage/freshness, stock-answer coverage/freshness, and lifecycle truth independent; preserve useful stale data while prioritizing restock impact, safe automatic recovery, and actionable diagnostics.
- [Prototype the search and Health Page experience](issues/08-prototype-search-and-health-experience.md) — Use the dense Compact-ledger interaction for Search and Health while treating the prototype's visual styling as disposable pending the owner's future design.
- [Choose the local stack and deployment topology](issues/09-choose-the-local-stack-and-deployment-topology.md) — Run native launchd-supervised Node/React/Fastify and collection processes over PostgreSQL, Drizzle, and pg-boss, with Tailscale Serve for private remote access, Caddy for pre-login LAN recovery, enforced optimistic commands, and restore-tested daily backups.
- [Design the one-pass Storefront onboarding workflow](issues/10-design-the-storefront-onboarding-workflow.md) — Use agent-led resumable cases with brokered preflight, browser/network audit, proof-gated shared or bespoke Integrations, shopper-validated stock semantics, isolated recovery, and generated full-input reconciliation.
- [Define the V1 verification strategy](issues/11-define-the-v1-verification-strategy.md) — Trust V1 through deterministic contracts, a representative actual-Mac rehearsal, and per-Storefront live qualification, joined by commit-keyed evidence and exhaustive closeout reconciliation.

## Not yet specified

- The remaining frontier is the tracer-bullet implementation order, proof-gate placement, full-rollout start, and execution handoff in [Decide the V1 implementation sequence and handoff](issues/12-decide-the-v1-implementation-sequence.md). Media-cache quota and disk high-water values are deliberately measured and set by its first 100,000-Offer representative-load slice rather than guessed from the Seed List.

## Out of scope

- Automated carts, checkout, purchasing, credentials, or payment handling.
- Shipping, pickup, delivery, or purchase-eligibility checks.
- Email, SMS, push, or other alert delivery in V1; only alert-ready Change Events are in scope.
- Proxy farms, IP rotation, CAPTCHA bypass, anti-bot evasion, or access to login-restricted/private catalogs.
- Public cloud hosting, Tailscale Funnel or other public internet exposure, and native mobile applications.
- Cataloging brands other than Jellycat.
- Broad discovery of retailers unrelated to the supplied Seed Site Records or Storefronts clearly linked from them.
- Reading or reusing code, databases, or configuration from other projects on this computer.
- Production implementation and the complete site-by-site audit/Connector rollout; these follow this planning map.
- Storefront-specific repair playbooks, which are generated during that rollout from concrete Integration evidence and typed failures rather than guessed during architecture planning.
