# StockHawk V1 Implementation Spec

## Problem Statement

The owner has a supplied workbook containing thousands of possible retailer sites and wants to find and manually purchase as many Jellycat products as possible. Visiting each site, discovering the real shop, finding products whose titles often omit “Jellycat,” distinguishing exact variants, and repeatedly checking stock is too slow to do by hand. Existing site labels cannot be trusted, retailer platforms and stock signals vary, and one residential IP limits safe collection throughput.

StockHawk must turn that uncertain input into a dependable private application. It must account for every Candidate Site, discover every publicly observable Jellycat listing it can, keep distinct retailer listings and size variants separate, expose useful Partial results without pretending they are complete, refresh restock-relevant availability as quickly as retailer and residential-IP limits safely allow, and make failures understandable. It must run locally on a Mac mini, remain private, recover after failure, preserve evidence, and hand purchasing back to the owner.

## Solution

Build a single-owner local web application backed by PostgreSQL in a coarse pnpm workspace orchestrated locally by Turborepo. A worker audits and onboards each Candidate Site into a versioned Storefront Integration, then runs two independent Connector jobs: exhaustive Catalog Discovery and efficient Stock Monitoring. Shared Platform Connector Adapters and exceptional Bespoke Connector Adapters obey one contract and obtain all HTTP, browser, redirect, and image access through one adaptive Crawl Request Broker. Shared Zod schemas decode untrusted values at application boundaries before trusted Modules use them.

StockHawk bootstraps and refreshes an open-world Master Catalog from official Jellycat sources, then strengthens it with evidence from retailers. It stores every enumerated Retailer Listing, classifies locally without depending on a “Jellycat” title keyword, preserves exact source variants and duplicate-looking listings, and keeps uncertain positive evidence searchable as Provisional Candidates. A central Catalog Certifier—not an Adapter—decides whether a complete public Storefront catalog was exhaustively enumerated.

The owner searches a compact table using one URL-persistent, match-any chip input over Product title, retailer name, and site URL. Flat and Storefront-grouped views support Stock Status and Match Status filters, images, freshness, Partial warnings, and exact retailer Purchase Handoff. A separate Health Page shows independent access, catalog, monitoring, freshness, lifecycle, throughput, backlog, and repair facts.

Implementation proceeds through one real end-to-end Storefront, an immediate 100,000-Offer pressure test, a capability-diverse pilot, the actual-Mac release rehearsal, then widening 25/100/500/remainder rollout waves. Each Storefront begins recurring work only after its own Catalog Certification, shopper-visible Stock Semantics Validation, and complete initial monitoring target accounting. Useful verified data is available before final rollout completion; V1 is accepted only after exhaustive input reconciliation contains no hidden or Partial case.

## User Stories

1. As the owner, I want every source workbook row preserved, so that I can trace any result back to the supplied list.
2. As the owner, I want endpoint-equivalent duplicates removed before seeding, so that StockHawk does not repeat identical work.
3. As the owner, I want ambiguous domains and location pages audited rather than merged by guess, so that distinct Storefronts are not lost.
4. As the owner, I want an untrusted legacy connector label treated only as a clue, so that old `unsupported` labels do not exclude working stores.
5. As the owner, I want each Candidate Site followed to its real retailer-controlled shop, so that a landing page or linked commerce host does not hide products.
6. As the owner, I want every discovered Storefront branch accounted for, so that one successful branch cannot hide an unfinished sibling.
7. As the owner, I want duplicate Candidate Sites linked to one Storefront without duplicate crawling, so that the same catalog is handled once.
8. As the owner, I want ambiguous Storefront identities kept separate, so that similar branding cannot erase regional or inventory differences.
9. As the owner, I want Dead, Non-Store, Dormant, Blocked, active, and unfinished outcomes distinguished, so that each means something actionable.
10. As the owner, I want no Candidate Site silently discarded, so that the final report balances to the immutable workbook.
11. As the owner, I want official Jellycat sources scanned before the large retailer crawl, so that known Products are recognizable early.
12. As the owner, I want official regional catalogs combined by verified identity, so that regional names and images enrich rather than overwrite each other.
13. As the owner, I want New and Coming Soon official surfaces refreshed, so that newly released Jellycats enter the Master Catalog automatically.
14. As the owner, I want historical and legacy Products retained, so that rare retired Jellycats remain recognizable and searchable when listed.
15. As the owner, I want retailer discoveries to extend the Master Catalog, so that official-source gaps do not cause missed products.
16. As the owner, I want a listing recognized without requiring “Jellycat” in its title, so that retailer naming habits do not hide it.
17. As the owner, I want identifiers, brand/category evidence, aliases, normalized names, and variant facts considered together, so that matching is evidence-backed.
18. As the owner, I want harmless punctuation, accent, measurement, and word-order differences normalized, so that equivalent names can resolve.
19. As the owner, I want size, color, style, and edition differences preserved, so that distinct sellable Products never collapse.
20. As the owner, I want separate retailer source identities displayed as separate Offers, so that duplicate-looking listings remain independently purchasable.
21. As the owner, I want a reliably Jellycat listing with missing variant facts represented as variant-unknown, so that useful products appear without a dangerous guess.
22. As the owner, I want positive but insufficient Jellycat evidence shown as Provisional, so that uncertainty does not become invisibility.
23. As the owner, I want no-signal listings retained as Unclassified without polluting search, so that future local reclassification can find them.
24. As the owner, I want affirmatively unrelated listings excluded but preserved, so that decisions remain correctable after source changes.
25. As the owner, I want stronger later evidence to correct a match without deleting history, so that early best-effort decisions remain safe.
26. As the owner, I want optional review limited to genuine exceptions, so that daily use does not become a huge approval backlog.
27. As the owner, I want a large or growing Review Queue treated as a system problem, so that bad architecture is not disguised as manual work.
28. As the owner, I want raw retailer titles shown first and canonical names shown secondarily, so that I can recognize what the retailer actually sells.
29. As the owner, I want every catalog listing and exact variant discovered through complete public enumeration, so that retailer search omissions do not matter.
30. As the owner, I want incomplete discovery stored and searchable as Partial, so that useful products appear before a long crawl finishes.
31. As the owner, I want Partial clearly labeled, so that I know additional products may still be missing.
32. As the owner, I want only certified complete snapshots to infer disappearance, so that an interrupted crawl cannot remove valid listings.
33. As the owner, I want a zero-Jellycat Storefront called Dormant only after complete certification, so that empty search results do not misclassify it.
34. As the owner, I want new listings detected during future catalog scans, so that retailers adding Jellycats are picked up automatically.
35. As the owner, I want active Storefronts checked for catalog change frequently and completely rediscovered daily, so that new products appear promptly.
36. As the owner, I want Dormant Storefronts checked cheaply daily and completely weekly, so that a retailer beginning to carry Jellycat is detected.
37. As the owner, I want each Offer’s Stock Status limited to in stock, out of stock, preorder, or unknown, so that availability is simple and honest.
38. As the owner, I want the latest trustworthy Stock Status retained after a failed check, so that failure is not misreported as product availability.
39. As the owner, I want every result to show Last checked and staleness, so that I can judge whether opening it is worthwhile.
40. As the owner, I want out-of-stock Offers prioritized for 15-minute restock detection, so that short restocks are less likely to be missed.
41. As the owner, I want new unknown Offers targeted for 15-minute recovery, so that StockHawk resolves them quickly when the Storefront supports stock.
42. As the owner, I want in-stock and preorder Offers targeted for 60-minute verification, so that restock work receives more constrained capacity.
43. As the owner, I want shopper-visible pages compared with machine stock signals during onboarding, so that misleading platform booleans are rejected.
44. As the owner, I want every Storefront Integration validated independently, so that one platform proof cannot hide a retailer-specific theme or inventory rule.
45. As the owner, I want a rotating stock-semantics sentinel, so that later retailer changes are detected without browser-checking every stock request.
46. As the owner, I want exact target accounting for every monitoring run, so that omitted Offers cannot be mistaken for checked Offers.
47. As the owner, I want all requests paced through one home residential IP, so that StockHawk uses the environment I actually have.
48. As the owner, I want collection as fast as safe Storefront and IP feedback permits, so that CPU or RAM does not become an artificial limit.
49. As the owner, I want HTTP preferred where reliable and browser work used only where proven necessary, so that checks remain efficient.
50. As the owner, I want multiple Storefronts processed concurrently when safe, so that one slow retailer does not block the whole catalog.
51. As the owner, I want one active job per Storefront and coalesced overdue work, so that retries do not create duplicate request storms.
52. As the owner, I want server rate guidance and backoff obeyed, so that freshness goals never justify unsafe traffic.
53. As the owner, I want browser contexts governed by the same IP budget, so that more contexts do not pretend to create more IP addresses.
54. As the owner, I want stock monitoring and catalog work both make progress, so that restock priority cannot starve new-product discovery forever.
55. As the owner, I want to search multiple names at once with chips, so that one search can find several desired Jellycats.
56. As the owner, I want search chips to match any Product title, retailer name, or site URL, so that I can search by product or store.
57. As the owner, I want search state encoded in the URL, so that refresh, back, forward, and shared bookmarks preserve it.
58. As the owner, I want a compact flat table, so that I can scan many Offers quickly without card clutter.
59. As the owner, I want an optional Storefront-grouped table, so that I can browse every Jellycat at one retailer together.
60. As the owner, I want server-side filtering, sorting, and keyset pagination, so that 100,000 Offers remain responsive.
61. As the owner, I want confirmed and Provisional results visible by default with filters for each, so that recall stays high without hiding uncertainty.
62. As the owner, I want Stock Status filters, so that I can quickly show every in-stock Sky Dragon listing.
63. As the owner, I want fresh results ranked before equivalent stale results, so that likely purchasing opportunities appear first.
64. As the owner, I want retailer images where available and safe fallbacks otherwise, so that I can recognize products visually.
65. As the owner, I want a missing image to use a neutral placeholder, so that optional media never hides or degrades a valid result.
66. As the owner, I want one-click Purchase Handoff to the exact listing, so that I can buy manually on the retailer’s site.
67. As the owner, I want the first local page usable within two seconds and interactions within 500 milliseconds, so that daily shopping feels immediate.
68. As the owner, I want light and dark modes, so that StockHawk is comfortable at different times of day.
69. As the owner, I want every command to update optimistically, so that the interface responds immediately.
70. As the owner, I want failed optimistic commands rolled back exactly, so that the interface never keeps an action the server rejected.
71. As the owner, I want external work shown as Queued rather than falsely completed, so that optimistic UI never fabricates retailer truth.
72. As the owner, I want a Health Page covering every Storefront, so that broken collection cannot remain hidden.
73. As the owner, I want access, catalog coverage, monitoring coverage, freshness, and lifecycle shown separately, so that one green label cannot conceal a problem.
74. As the owner, I want Health ordered by buying impact and repair leverage, so that the most valuable fixes appear first.
75. As the owner, I want exact freshness compliance split by prior Stock Status, so that many in-stock rows cannot hide overdue restock checks.
76. As the owner, I want request, Offer-refresh, and restock-refresh throughput shown separately, so that I can see IP pressure versus useful work.
77. As the owner, I want backlog growth and honest catch-up information, so that impossible freshness is reported rather than promised.
78. As the owner, I want collection gaps attributed to StockHawk downtime rather than retailers, so that Storefront health remains truthful.
79. As the owner, I want Auto-Recovering separated from Repair Required, so that I know whether intervention is necessary.
80. As the owner, I want Retry, Run discovery, and Re-audit actions to coalesce safely, so that repeated clicks cannot bypass pacing.
81. As the owner, I want stale results remain searchable during failures, so that outages do not erase previously useful data.
82. As the owner, I want a concise Search warning only during material collection degradation, so that normal shopping stays uncluttered.
83. As the owner, I want one private admin login, so that Health controls and data are not publicly accessible.
84. As the owner, I want approved Tailscale devices to reach StockHawk from home or away, so that I can use it while traveling.
85. As the owner, I want Caddy provide LAN recovery before macOS login, so that local access returns automatically after reboot.
86. As the owner, I want retailer traffic continue through my home ISP rather than Tailscale routing, so that collection uses the expected residential IP.
87. As the owner, I want PostgreSQL, the API, worker, and Caddy supervised at boot, so that the application recovers without manual repair.
88. As the owner, I want unfinished jobs resume idempotently after a crash, so that progress is not lost or duplicated.
89. As the owner, I want daily validated backups retained for seven generations, so that recent logical loss is recoverable.
90. As the owner, I want weekly clean restore verification, so that an unreadable backup is not mistaken for protection.
91. As the owner, I want permanent Change Events for discovery, disappearance, reappearance, and stock transitions, so that future alerts have trustworthy history.
92. As the owner, I want detailed repetitive evidence compacted after 30 days while important truth remains, so that storage is useful rather than wasteful.
93. As the owner, I want image and diagnostic caches quota-bound, so that rebuildable files cannot fill the Mac.
94. As the owner, I want to use pilot results before every site is onboarded, so that the application becomes valuable early.
95. As the owner, I want the Health Page disclose rollout coverage, so that early usefulness is never confused with finished V1.
96. As the owner, I want rollout prioritize reusable connectors while still advancing one-offs, so that coverage grows quickly without starving rare stores.
97. As the owner, I want rollout expand through 25, 100, 500, then remaining Candidate waves, so that systematic mistakes are caught before multiplying.
98. As the owner, I want isolated difficult stores suspend without blocking the queue, so that one problem cannot stop the entire audit.
99. As the owner, I want a generated final report and exhaustive ledgers, so that every input, Adapter, Integration, proof, and terminal outcome is reviewable.
100. As the owner, I want V1 accepted only with no hidden or Partial case, so that “finished” has one unambiguous meaning.

## Implementation Decisions

- **Completion boundary:** V1 completion requires every Candidate Site and every discovered Storefront branch to have a certified active or certified zero-Jellycat Dormant Integration, or a strictly evidenced Dead, Non-Store, or Blocked outcome. Partial is useful but never terminal.
- **Execution order:** Establish the runnable production seams, take one real representative Storefront end to end, pressure-test 100,000 Offers immediately, prove the capability-diverse pilot, pass the actual-Mac release gate, open daily owner use, then execute 25/100/500/remainder rollout waves and final reconciliation.
- **First Storefront:** Select it during bounded preflight from the cleaned Seed List. Prefer a normal high-leverage shared platform with complete public HTTP enumeration, exact variants, images, and observable in-stock/out-of-stock states. Do not use the official Jellycat Storefront as the retailer canary.
- **Runtime topology:** Use one pinned Node.js 24 LTS/TypeScript/pnpm workspace with a React/Vite SPA, Fastify API, separate collection worker, PostgreSQL 18, Drizzle plus reviewed SQL, pg-boss, Playwright, Pino, native `launchd`, Tailscale Serve, and Caddy LAN fallback. Do not add Docker Desktop, Redis, or a separate search service.
- **Workspace orchestration:** Use Turborepo for dependency-aware local development, build, and verification tasks. Enable only local cache in V1 and only for deterministic tasks with declared inputs, environment, and outputs. Never cache migrations, real-database integration, Playwright/live-Storefront checks, backup/restore, or actual-Mac gates. `launchd` invokes built entrypoints directly. Keep packages coarse and aligned to deployable or genuinely shared Module seams.
- **Runtime validation:** Use centralized Zod 4 schemas to decode environment/deployment configuration, URL/search state, API inputs, immutable Integration/Adapter/Certification configuration, Connector output, and versioned JSON evidence/checkpoints at their owning Interfaces. Parse once and pass typed values inward; infer types instead of duplicating contracts. App-owned commands and versioned configuration are strict; raw retailer decoders require consumed fields while tolerating unrelated additive fields. Zod does not replace PostgreSQL constraints, migrations, matching, certification, or Stock Semantics Validation.
- **Data authority:** PostgreSQL normalized relations are authoritative. Current State Projections serve reads; immutable observations, decisions, lifecycle transitions, certification evidence, and Change Events explain them. Search Documents are transactional, rebuildable denormalization.
- **Persistence seam:** Every state-changing module submits typed idempotent commands to one Persistence Boundary. Evidence, observations, current state, Search Documents, checkpoints, and required Change Events commit atomically. Direct domain writes are forbidden.
- **Identity:** Every durable record has an opaque StockHawk Identity. Storefront-scoped Source Listing Identities preserve distinct parent and exact-variant entries. Titles, URLs, and retailer identifiers never become unscoped internal identity.
- **Master Catalog:** Bootstrap accessible official regional, variant, New/Coming Soon, and historical sources before large retailer discovery. Continue official discovery independently afterward. Retailer evidence may create Products at retained lower authority; official absence never suppresses discovery.
- **Classification:** Persist every Retailer Listing. Classify it as Offer, Provisional Candidate, Excluded Listing, or Unclassified Listing using retained evidence. Matching is recall-first, deterministic, reversible, variant-safe, and explained by Decision Receipts. Local Reclassification makes rule/catalog changes network-free.
- **Product and Offer model:** Known sizes, colors, styles, editions, and distinct verified official identifiers are separate Products. Variant-unknown Products preserve useful ambiguity. Offer is the role of a matched Retailer Listing; distinct source identities always remain separate Offers.
- **Connector seam:** One Connector interface exposes only Catalog Discovery and Stock Monitoring. Shared Platform and one-off Bespoke Connector Adapters satisfy identical contracts. Adapters translate sources and emit evidence; they cannot classify, certify, write persistence, own Health, or pace themselves.
- **Storefront Integration:** Publish immutable, Zod-schema-validated versions containing approved origins, Adapter/configuration version, catalog roots, locale, expected surface, Certification Recipe, initial pacing, and optional Browser Access Grant. No executable configuration, credentials, unrestricted headers, or silent Adapter switching.
- **Catalog Certification:** A central Catalog Certifier evaluates versioned Certification Claims against common invariants and the Integration recipe. Search, brand/category pages, and keyword results cannot prove completeness. A complete snapshot requires route/count/page/variant closure and a consistent boundary.
- **Partial and absence:** Commit and expose valid observations immediately. Partial never replaces certified snapshot membership, reconciles absence, changes Listing Presence from omission, or infers stock. Inactive listing presence requires two certified absences plus direct disappearance evidence.
- **Stock semantics:** Every Integration compares candidate machine signals with contemporaneous exact-variant shopper-visible pages across observable availability states. Contradictions disqualify signals. Intrinsic uncertainty is `unknown`. A rotating sentinel detects drift without browser-checking every stock refresh.
- **Scheduling:** One Crawl Request Broker governs all HTTP, browser, redirect, and image requests. The scheduler learns safe global, Storefront, and browser concurrency from real due work, obeys server guidance, coalesces work, allows one active Storefront job, and maximizes committed useful observations rather than attempts.
- **Freshness policy:** Out-of-stock and recoverable-unknown Offers target 15 minutes; in-stock and preorder Offers target 60 minutes. Safe access wins. Missed goals remain visible and never redefine freshness. Active catalog change checks target hourly with complete discovery daily; Dormant checks target daily signal and weekly complete discovery.
- **Search:** Query server-side Search Documents with URL-bound keyset cursors. Support match-any chips over Product/title aliases, retailer, and URL; Stock and Match filters; flat and Storefront-grouped modes; raw retailer title; canonical secondary name; freshness; Partial evidence; images; and exact Purchase Handoff.
- **UI:** Use the Compact ledger behavior in light and dark modes with TanStack Router, Query, and Table. Visual styling remains replaceable when the owner supplies a future design. Missing images never affect visibility or Health.
- **Optimistic commands:** Every true UI mutation crosses one shared optimistic command boundary, immediately applies only truthful owner intent, sends an idempotency key, rolls back exactly, and reconciles authoritative state. Direct mutation use and direct mutation endpoints from features fail static checks.
- **Health:** Store independent access, certification/coverage, catalog freshness, monitoring coverage, status-specific freshness, lifecycle, and collection-gap facts. Derive Attention Severity, Healthy, Auto-Recovering, and Repair Required for presentation without turning them into authoritative shortcuts.
- **Onboarding:** One durable Onboarding Case owns each Candidate and all branches. Bounded preflight precedes universal Computer Use plus sanitized network inspection. Shared repair work coalesces; bespoke repair remains local. Recurring schedules publish only after certification, Stock Semantics Validation, and initial target accounting.
- **Security:** Bind Fastify and PostgreSQL to loopback; use Tailscale Serve only as private inbound access and Caddy as LAN fallback. Retain application login/session, exact-origin/CSRF controls, login throttling, SSRF redirect/address restrictions, log redaction, FileVault, firewall, and no public forwarding.
- **Operations:** `launchd` supervises database, web, worker, Caddy, and backup jobs. Worker/browser/Tailscale/internet failures must not destroy local search truth. Daily validated custom-format dumps retain seven generations; weekly clean restores prove recovery.
- **Retention:** Keep identities, decisions, current state, Change Events, and compact causal evidence permanently. Default unpinned bulky detail to 30 days. Store only rebuildable media and temporary downloads in a content-addressed, measured, quota-bound filesystem cache.
- **Evidence:** Every deterministic, actual-Mac, and live-Storefront gate emits a commit-keyed Evidence Bundle. Qualification Records pin exact Adapter/Integration/recipe versions and proof. Secrets and unrestricted retailer bodies never enter retained artifacts.
- **Rollout:** After the capability pilot and actual-Mac gate, the owner may use the app while onboarding continues. Prioritize Connector leverage, preserve a fair one-off lane, and expand via 25/100/500/remainder waves. Systemic anomalies stop expansion; isolated cases suspend locally. Final generated ledgers must reconcile deterministically to the workbook.

## Testing Decisions

- Test the highest stable seams: Connector conformance, Persistence Boundary commands, central matching/certification, scheduler state transitions, Fastify API contracts, built UI behavior, actual-Mac topology, and live Storefront qualification.
- Deterministic gates never call retailers. Use sanitized versioned fixtures, seeded virtual time, generated property cases, a real migrated PostgreSQL database, and real production UI/API modules.
- Require locked install, formatting, linting, type checking, production build, migration validation, architectural static checks, unit/property tests, real-database integration, API contracts, Playwright end-to-end, and automated accessibility checks on every change.
- Verify Turborepo's task graph, filtering, declared inputs/outputs/environment, and local cache behavior. Prove stateful, external, operational, and release gates cannot report success from cache.
- Contract-test every Zod ingress schema with valid, malformed, missing, additive, and unsupported-version values according to its declared closed or retailer-extensible policy. Prove parsing happens at the owning Interface, shared inferred types stay aligned, and database negative tests still enforce storage invariants independently.
- Reject deterministic retry waivers. Record any fail-then-pass result as flaky and repair it. Coverage percentage is diagnostic; named behaviors and invariants are acceptance.
- Run every Platform and Bespoke Adapter through the same fixtures for identities, variants, pagination, closure, batching, checkpoints, cancellation, replay, target accounting, typed failures, and broker-only access.
- Falsify certification deliberately with missing pages, open cursors, count disagreements, variant gaps, changing boundaries, stale/version-mismatched evidence, and incomplete branches.
- Use fresh and upgraded PostgreSQL databases to test constraints, rollback at every write stage, out-of-order concurrency, redelivery, causal Change Event uniqueness, snapshot immutability, Search Document rebuild equivalence, and retention compaction.
- Use a seeded 100,000-Offer scheduler model to verify adaptive scopes, fairness, coalescing, no early/artificial requests, status priority, safe degradation, truthful unreachable goals, browser shared-IP accounting, and crash recovery.
- Run representative 100,000-Offer search and UI performance on the actual production topology. Require the first home-network page within two seconds and search/filter/view/page updates within 500 milliseconds; record distributions and query plans.
- Test URL state, flat/grouped keyset pagination, concurrent changes, variants, provisional filters, stale ranking, image fallback, manual handoff, every optimistic mutation lifecycle, and truth boundaries using the built application against the real API/database.
- Target WCAG 2.2 AA with automated axe checks plus manual keyboard, focus, zoom/reflow, contrast, status announcement, semantics, and screen-reader verification.
- Inject Health failures for transient/structural errors, throttling, challenges, stale and Partial work, count drops, semantics drift, collection gaps, queue delay, process death, and recovery. Assert independent facts and idempotent remediation.
- Rehearse on the actual Mac: clean provision, migration, load, worker/database/browser/network/Tailscale failures, no-login reboot, post-login Serve recovery, access isolation, residential egress, CSRF/SSRF/session controls, log redaction, backup, and restore.
- Live qualification is mandatory per Storefront Integration. Fixtures and another Storefront on the same platform cannot substitute for current shopper-visible catalog and stock proof.
- Final acceptance regenerates the Onboarding Closeout Report and CSV ledgers from committed facts and fails for any unaccounted or Partial branch or nondeterministic total.
- Existing prototype tests are interaction prior art only. Production acceptance must exercise production modules and styling-independent behavior; prototype code is not the application.

## Out of Scope

- Automated carts, checkout, retailer authentication, payments, or purchasing.
- Shipping, pickup, delivery, or purchase-eligibility checks.
- Email, SMS, push, or other alert delivery; V1 stores Change Events only.
- Price history, comparison, or extra source requests solely to obtain missing prices.
- Proxy farms, IP rotation, CAPTCHA interaction/bypass, anti-bot evasion, fingerprint impersonation, or private/login-restricted catalogs.
- Public cloud hosting, hosted/remote task caching, public exposure, Tailscale Funnel, subnet routing, exit-node crawling, multi-user accounts, native mobile apps, or a public API.
- Brands other than Jellycat or broad retailer discovery unrelated to supplied Candidate Sites and clearly retailer-controlled destinations.
- Free-form owner creation of Products, Offers, Storefronts, or stock answers.
- A manual Storefront pause control or manual command that paints canonical Health healthy.
- Guaranteed discovery of merchandise not publicly observable from the home residential IP.
- Final visual design; the accepted compact interaction is implemented with replaceable styling until the owner supplies a design.

## Further Notes

- The root domain catalog remains the canonical vocabulary. This Spec defines implementation behavior and must not redefine those terms.
- The Wayfinder map and its resolved decisions remain the source for rationale and edge-case detail. The verification matrix and rollout runbook provide execution gates beside this Spec.
- The original workbook remains immutable at its recorded SHA-256. Generated Seed List and reconciliation artifacts retain every source row.
- The expected post-location-review Candidate count is approximately 2,247, but only completed audits determine the final count.
- Exact media quota and disk high-water values are evidence-derived during the first 100,000-Offer slice and confirmed on the target Mac before full rollout.
- Work the implementation ticket frontier one ticket at a time. Each ticket must leave the application buildable, demonstrable, and covered by its portion of the Evidence Bundle.
