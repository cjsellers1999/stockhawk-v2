# Research exhaustive catalog and stock surfaces

Type: research
Label: wayfinder:research
Status: resolved
Triage: ready-for-agent
Blocked by: 02

## Question

For the Connector families exposed by the cleaned Seed List, which public platform interfaces, feeds, sitemaps, collections, structured data, pagination mechanisms, browser network surfaces, and fallbacks can exhaustively enumerate product catalogs and efficiently observe stock? For each method, document primary-source evidence, proof-of-exhaustion signals, Jellycat-identification fields beyond title search, stock semantics, likely request cost, failure modes, and whether it can support Catalog Certification.

## Inputs

- [Seed List cleanup and representative audit plan](../research/seed-list-cleanup-and-audit-plan.md)
- [Deterministic 220-endpoint audit sampler](../../wayfinder-workbook/inspect-sites.mjs)

## Answer

The imported labels must route to a freshly detected capability set, not directly select a scraper. The strongest public catalog routes are documented anonymous count/cursor APIs such as WooCommerce Store API, Miva Runtime JSON, NetSuite Item Search, and common Adobe/Magento GraphQL deployments. Legitimate browser-safe storefront APIs such as BigCommerce GraphQL are next, but only inside their documented origin/token boundary. Shopify is strongly certifiable through its platform product sitemap plus every documented per-product variant payload. Other builders generally require recursive product-sitemap closure plus every PDP/variant; store-specific browser endpoints can certify only after their total/end behavior and schema are proven.

Search, a Jellycat brand/category/collection, retailer navigation, and JSON-LD on already-known pages are candidate-discovery aids, never completeness proof. Certification requires parent-page closure, exact variant closure, count/URL reconciliation, a consistent snapshot boundary, visibility caveats, stock provenance, and retained evidence. Missing or ambiguous stock remains `unknown`; exact public states normalize only to `in stock`, `out of stock`, `preorder`, or `unknown`.

Catalog Discovery and Stock Monitoring use different request shapes. Bulk interfaces can refresh many exact variants at once; sitemap/PDP families cheaply diff their complete parent index for new products, then monitor only known Jellycat parents, updating all variants from one parent payload where possible. Periodic full discovery is still required, so new Jellycat products become provisional candidates automatically rather than requiring a manual master list.

The local residential-IP observations confirmed the model. A WooCommerce Storefront exposed exactly 730 product sitemap URLs and an independent Store API total of 730. A Shopify `Sky Dragon` listing omitted Jellycat from its title but exposed vendor `Jellycat`, SKU `SKY2DD`, tags, variant availability, and quantity. The official Jellycat direct client received a challenge while a normal local browser could load its paginated catalog, proving a browser fallback is sometimes necessary but should not be the default high-frequency path. Legacy labels also drifted in practice, including a Magento-hinted site now running Squarespace.

Assets:

- [Primary-source platform matrix and residential-IP observations](../research/platform-catalog-and-stock-surfaces-primary-sources.md)
- [Reproducible low-request Storefront surface probe](../research/probe-storefront-surfaces.mjs)
