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
- V1 is a private web application available on the home network. Purchasing is a manual handoff to the retailer.
- Search/UI decisions already validated are captured in [`Search prototype verdict`](../search-ui-prototype/NOTES.md): one URL-persistent chip input with match-any semantics; flat Offer pagination; optional Storefront-grouped pagination; Stock Status filters; retailer-page links.
- V1 stores Change Events for future alerts but sends no notifications.
- Never refer to this map's tickets by bare number in user-facing text; link their names.

## Decisions so far

<!-- Closed ticket decisions are appended here as one-line context pointers. -->

- [Define the V1 completion contract](issues/01-define-v1-completion-contract.md) — V1 has an all-or-nothing acceptance contract for site outcomes, evidence-scoped completeness, open-world product discovery, safe freshness, fast local search, diagnostics, private operation, manual purchasing, and alert-ready history.
- [Clean and characterize the Seed List](issues/02-clean-and-characterize-the-seed-list.md) — Only endpoint-equivalent records merge automatically (2,489 safe pre-audit); location review yields an expected 2,247 candidates, with all remaining ambiguity handled by a deterministic 220-endpoint research audit and later full onboarding.
- [Research exhaustive catalog and stock surfaces](issues/03-research-exhaustive-catalog-surfaces.md) — Route by freshly detected public capabilities: prefer documented count/cursor APIs, otherwise close platform product sitemaps plus every exact variant, keep search-only results Partial, and reserve measured browser access for stores whose shopper catalog needs it.

## Not yet specified

- Browser fallback is demonstrably necessary for some shopper-visible Storefronts, but the Connector and scheduler designs must still decide which affected stores may use it recurrently, at what cadence, and with what repair trigger.
- Concrete discovery and monitoring cadences remain fog until representative Connector costs and residential-IP throughput are measured.
- Media caching, long-term observation retention, and database-volume limits remain fog until the cleaned Seed List and representative catalog sizes are known.
- Storefront-specific repair playbooks remain fog until the health model identifies actionable failure classes and diagnostic evidence.

## Out of scope

- Automated carts, checkout, purchasing, credentials, or payment handling.
- Shipping, pickup, delivery, or purchase-eligibility checks.
- Email, SMS, push, or other alert delivery in V1; only alert-ready Change Events are in scope.
- Proxy farms, IP rotation, CAPTCHA bypass, anti-bot evasion, or access to login-restricted/private catalogs.
- Public cloud hosting, public internet exposure, and native mobile applications.
- Cataloging brands other than Jellycat.
- Broad discovery of retailers unrelated to the supplied Seed Site Records or Storefronts clearly linked from them.
- Reading or reusing code, databases, or configuration from other projects on this computer.
- Production implementation and the complete site-by-site audit/Connector rollout; these follow this planning map.
