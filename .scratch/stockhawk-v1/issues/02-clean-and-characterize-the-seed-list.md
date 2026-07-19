# Clean and characterize the Seed List

Type: research
Label: wayfinder:research
Status: resolved
Triage: ready-for-agent
Blocked by:

## Question

How should the 2,712 supplied Seed Site Records be normalized and deduplicated into Candidate Sites without merging genuinely distinct Storefronts, and what platform, URL, redirect, physical-location, duplicate, dead, and Non-Store strata must a representative audit cover? Produce reproducible cleanup rules, an ambiguity report, a sampling plan, and an expected clean-count reconciliation without altering the source workbook.

## Answer

Automatically merge only syntactically equivalent HTTP(S) endpoints: normalize hostname case and terminal dot, leading `www`, default ports, repeated/trailing path separators, fragments, known tracking parameters, retained-query ordering, and HTTP/HTTPS equivalence while preserving meaningful paths, queries, subdomains, country domains, different hosts, and all source provenance. This safely reconciles 2,712 Seed Site Records to **2,489 pre-audit Candidate Sites** by removing 223 equivalent endpoint duplicates.

Physical-location paths are audit-gated rather than automatically deleted. The workbook contains 256 such endpoints across 34 host families. If review confirms each family shares one online catalog, 242 location endpoints collapse while 14 location-only families retain one audit representative, producing an **expected 2,247 Candidate Sites after location review**. The final Seed List count remains unknown until audits resolve redirects and linked shops, 74 remaining same-host ambiguity groups, 14 cross-host normalized-name collisions, seven social/directory entry points, Dead Storefronts, Non-Store Candidates, and any genuinely distinct commerce destinations.

The deterministic representative audit contains **220 unique endpoints**, covers all 38 Legacy Connector Labels plus every required URL, location, duplicate, redirect-proxy, dead/failure, and Non-Store risk stratum, and may not be used to bulk-classify unsampled sites. The original workbook remained unchanged at SHA-256 `fc20368155f662b1c0dfc2580119320a470dacd075c186a5b6cc3cdff654bc60`.

Assets:

- [Seed List cleanup and representative audit plan](../research/seed-list-cleanup-and-audit-plan.md)
- [Reproducible workbook analysis and audit sampler](../../wayfinder-workbook/inspect-sites.mjs)
