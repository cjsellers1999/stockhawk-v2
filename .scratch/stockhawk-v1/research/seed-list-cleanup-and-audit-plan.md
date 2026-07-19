# Seed List cleanup and representative audit plan

## Scope and evidence

This report answers how the supplied workbook should become a reviewed Seed List without altering the workbook or treating imported connector and health fields as current truth.

- Source: `/Users/justinsingh/Desktop/stockhawk-sites-2026-07-18.xlsx`
- Source SHA-256: `fc20368155f662b1c0dfc2580119320a470dacd075c186a5b6cc3cdff654bc60`
- Inspected range: `Sites!A4:W2716`
- Seed Site Records: 2,712 across 23 columns
- Reproducible analysis: [`inspect-sites.mjs`](../../wayfinder-workbook/inspect-sites.mjs)
- Method: read-only import through `@oai/artifact-tool`; no workbook export or write was performed

The workbook is evidence about prior StockHawk state, not evidence that a current Storefront is live, dead, supported, complete, or still located at the supplied URL.

## Answer

Only syntactically equivalent public endpoints may be merged automatically. Physical-location pages, different paths on one hostname, identical retailer names on different hosts, redirects, social pages, and imported `unsupported` outcomes require Storefront Audit before they can be merged or excluded.

This yields two useful planning counts:

- **2,489 automatic-safe pre-audit Candidate Sites** after removing only 223 syntactically equivalent endpoint duplicates.
- **2,247 expected Candidate Sites after physical-location review** if the 34 detected location-host families behave as their URLs indicate. This is a planning estimate, not permission to remove those pages without review.

The final Seed List count remains intentionally unknown until the Storefront Audit resolves redirects, outbound shop links, same-host ambiguities, Dead Storefronts, Non-Store Candidates, and any location pages that actually lead to distinct commerce destinations.

## Reproducible cleanup rules

Apply these rules in order. Every output record retains the IDs, raw names, raw URLs, and imported metadata of all contributing Seed Site Records plus the cleanup decision and reason.

### 1. Validate without repairing silently

Trim surrounding whitespace and require an absolute `http` or `https` URL. Preserve invalid values for review rather than guessing a host or scheme. All 2,712 supplied rows pass this check.

### 2. Build a comparison endpoint key

For duplicate comparison only:

1. lowercase the hostname and remove a terminal dot;
2. remove a leading `www.`;
3. remove default ports (`80` for HTTP and `443` for HTTPS);
4. normalize repeated path separators and remove a trailing slash except at the root;
5. discard fragments;
6. remove only known tracking parameters (`utm_*`, `gclid`, `dclid`, `fbclid`, `msclkid`, common Mailchimp and HubSpot tracking keys);
7. sort and preserve every remaining query parameter; and
8. treat HTTP and HTTPS forms of that same host, port, path, and retained query as one comparison endpoint.

Do not lowercase or otherwise rewrite meaningful paths. Do not discard arbitrary query parameters. Do not collapse subdomains, country domains, different hostnames, or different paths. The comparison key is not the final Storefront URL; the Storefront Audit chooses the actual current commerce destination.

### 3. Merge only identical comparison endpoints automatically

The workbook contains 2,712 distinct raw URL strings but only 2,489 comparison endpoint keys. The 223 duplicate groups contain 446 rows, exactly two rows per group. They are mostly `www`/non-`www` and trailing-slash variants; one group also differs by HTTP versus HTTPS.

Merge each group into one Candidate Site while preserving all source records. Do not inherit one row's connector, coverage, or certification state as truth: 167 of the 223 groups disagree in at least one imported name, connector, classification, coverage, or certification field.

### 4. Gate physical-location collapse on Storefront Audit

Flag paths that visibly represent store details or location directories, including `store-details`, `store(s)`, `location(s)`, `store-locator`, and equivalent nested path forms. The analysis found 256 unique location-related endpoints across 34 hostname families.

For each family, audit at least one location page and the retailer's actual commerce destination:

- If the location pages all lead to one shared online catalog, retain one Candidate Site/Storefront relationship and preserve the discarded location URLs as source aliases.
- If a location page leads to a genuinely distinct retailer-controlled commerce destination, retain that destination separately.
- If the workbook has only location pages for a hostname, retain one representative for audit; never synthesize a root URL and assume it is a store.
- A physical location is not a separate Storefront merely because local inventory differs; shipping, pickup, and purchase eligibility are outside V1.

The largest families are Nordstrom (86 location endpoints), Bloomingdale's US (56), Crate & Barrel US (30), Paper Source (24 location endpoints plus one non-location endpoint), Elder's Hardware (13), Kowalski's (9 plus one non-location endpoint), and Henry Bear's Park (5 plus one non-location endpoint).

If review confirms the location heuristic, 242 location endpoints disappear from the Candidate Site set while 14 location-only host families retain one representative each: `2,489 - 242 = 2,247`.

### 5. Never merge different same-host paths without evidence

After the expected location collapse, 74 hostname groups still contain 163 Candidate Sites, or 89 entries beyond one per host. These include root/contact/category/brand pages, different named shops, platform conflicts, and social profiles. Audit their redirect chains, retailer ownership, catalog destinations, and outbound shop links. Shared hostname alone is not identity proof.

### 6. Never merge by normalized retailer name

Name normalization is an ambiguity detector only: Unicode-normalize, lowercase, normalize `&` to `and`, remove punctuation, and collapse whitespace. Fourteen normalized names span 28 Candidate Sites on different hosts. Some are likely aliases or migrations; others are unrelated retailers with generic names such as `The Toy Chest`, `Whimsy`, or `The Front Porch`. Require redirect, ownership, or destination evidence before merging.

### 7. Resolve redirects and linked storefronts during the one-pass audit

The connector configuration cells all parse as JSON, expose no keyed configuration data, and expose no alternate absolute hosts. That does not mean alternate storefronts are absent. Every audit must follow HTTP redirects and retailer-controlled `Shop`, `Buy`, or equivalent outbound links and record the full chain, final Storefront URL, and relationship to the Candidate Site.

### 8. Treat imported outcomes as sampling hints only

The workbook contains 38 Legacy Connector Labels. The largest expected post-location-review strata are Shopify (1,013), `unsupported` (518), Lightspeed (131), WooCommerce (123), Square (114), Wix (100), and Squarespace (80).

All 550 raw `unsupported` rows are inactive, 380 contain a failure/error signal, and they span 502 hostnames. None may be excluded or marked Blocked/Dead from that label. Fresh audit evidence decides the outcome.

## Ambiguity report

| Stratum | Population | Required treatment |
|---|---:|---|
| Invalid or non-HTTP(S) URLs | 0 rows | Preserve and review if future imports add any |
| Syntactically equivalent endpoint groups | 223 groups / 446 rows | Safe to merge; preserve every source record |
| Equivalent endpoints with imported metadata conflicts | 167 groups | Merge endpoint identity but distrust imported metadata |
| Physical-location heuristic | 34 hosts / 256 endpoints | Review every host family before collapsing; expected removal is 242 |
| Remaining same-host ambiguity | 74 hosts / 163 candidates | Do not merge without redirect/ownership/catalog evidence |
| Same normalized name across hosts | 14 names / 28 candidates | Do not merge by name; audit aliases versus unrelated retailers |
| Social/directory entry points | 7 candidates: four Facebook, three Instagram | Follow retailer-controlled shop link; otherwise Non-Store Candidate |
| HTTP entry points | 26 rows | Test HTTPS/redirect behavior; preserve evidence |
| Meaningful retained query | 1 row | Preserve query and include it in audit |
| Connector config pointing to another host | 0 rows | Still inspect live page links and redirects |
| Raw `unsupported` label | 550 rows / 502 hosts | Reassess from scratch; never bulk exclude |

Imported error text supplies useful audit strata but not outcomes. Notable populations are: 301 `no authoritative commerce surface`, 156 platform capability/drift, 93 endpoint-not-found, 68 unresolved legacy connector, 37 zero-product, 17 private/unauthorized, 8 suspicious catalog drop, 5 browser-blocked, 4 access-denied, 4 timeout/abort, 3 DNS, and 2 TLS. A fresh residential-IP audit must distinguish Dead Storefront, Non-Store Candidate, Blocked Storefront, platform drift, and an incorrect historical extraction method.

## Deterministic representative audit plan

The representative research audit contains **220 unique endpoints**. It is for validating cleanup rules and discovering Connector families; it never bulk-classifies unsampled Candidate Sites. Full V1 onboarding still audits every Candidate Site.

The analysis script uses the fixed seed `stockhawk-v1-seed-audit-v1`, hashes each namespace plus endpoint/record identity with SHA-256, takes the lexicographically smallest hashes for each quota, unions the selections, and deduplicates by comparison endpoint key while preserving every selection reason.

### Base platform coverage

First select distinct hostnames within each of the 38 Legacy Connector Label strata so chains with dozens of physical locations do not dominate:

- `unsupported`: 20;
- labels with at least 100 distinct hosts: 6 each;
- labels with 25–99 distinct hosts: 4 each;
- labels with 6–24 distinct hosts: 2 each; and
- labels with five or fewer distinct hosts: 1 each.

This covers all 38 labels while treating them only as sampling hints. The audit records the actual current platform and extraction surfaces independently.

### Risk overlays

Union the following deterministic overlays with the platform sample:

- one representative from all 34 physical-location host families;
- both endpoints from 12 sampled same-host ambiguity groups;
- both hosts from six sampled cross-host normalized-name collisions;
- eight normalized duplicate groups to validate the safe merge rule;
- all seven Facebook/Instagram entry points;
- six HTTP endpoints;
- the single retained-query endpoint;
- up to two endpoints from every nonempty imported failure-signal category; and
- ten clean HTTPS root endpoints with no imported failure signal as a control group.

Overlaps coalesce to the final 220 endpoints. Running the script with the `samplePlan.manifest` section reproduces the exact IDs, URLs, connector hints, and selection reasons.

### What each audit records

For every selected endpoint:

1. original source IDs and URLs;
2. HTTP redirect chain and final URL;
3. retailer identity and evidence that an outbound shop is retailer-controlled;
4. actual current platform and public catalog surfaces;
5. whether the page is a commerce Storefront, physical-location page, social/directory page, or neither;
6. live, dead, Non-Store, Partial, or reproducibly Blocked evidence using the accepted domain rules;
7. catalog-enumeration and Stock Monitoring surface candidates, pagination/variant signals, and approximate request cost; and
8. whether the audit confirms, splits, or merges the proposed Candidate Site identity.

If the representative audit finds a new URL/platform/failure stratum or disproves a cleanup rule, add that entire new stratum to review, revise the rule, and rerun the full reconciliation before creating the Seed List.

## Expected handoff

The next catalog-surface research can use the deterministic 220-endpoint manifest to investigate platform families without over-weighting duplicate location pages or trusting legacy labels. The later one-pass Storefront onboarding workflow performs the final audit of every Candidate Site and produces the exact Seed List; it must not extrapolate sample outcomes to unaudited sites.
