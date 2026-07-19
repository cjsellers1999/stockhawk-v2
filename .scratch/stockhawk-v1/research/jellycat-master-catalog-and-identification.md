# Jellycat Master Catalog and Product Identification Research

Observed 2026-07-18 (America/Los_Angeles).

## Research question

Can StockHawk construct and maintain a useful Jellycat Master Catalog without the user manually supplying every Jellycat product, and how can retailer listings be associated with exact Jellycat products when retailers omit the word “Jellycat” or alter the title?

## Answer

**No, the user does not need to provide a list of every Jellycat product.** StockHawk can bootstrap a Master Catalog from official Jellycat catalog surfaces and historical official price lists, then keep extending it from both official releases and previously unseen retailer listings.

The defensible promise is narrower than “every Jellycat ever made”:

- StockHawk can aim to contain every **publicly observable product and exact variant it has discovered**, with provenance and unresolved candidates kept visible.
- Public sources do not prove a complete, permanent archive of every retired, regional, exclusive, personalized, or never-publicly-listed product.
- A retailer listing must not be rejected merely because it is absent from the current Master Catalog. An unfamiliar listing is a discovery candidate, not proof that it is not Jellycat.

In practical terms, human input becomes an exception-handling job—resolving ambiguous matches and optionally enriching obscure history—not a requirement to type the catalog by hand.

## Evidence labels

- **Observation** means the behavior or data was directly visible on a first-party source during this research.
- **Specification** means a first-party standards or platform document defines the behavior.
- **Recommendation** is an architectural conclusion drawn from those observations and specifications.

## 1. Official Jellycat discovery surfaces

### Regional catalog pages

**Observation.** Jellycat operates separate regional storefronts. Its official [site map](https://jellycat.com/sitemap/) links regional shops for the UK, US/Canada/Mexico, EU/rest of world, Germany, France, and Korea. Its official [category site map](https://jellycat.com/sitemap/categories) exposes routes including New, Explore All, Coming Soon, collections, Early Access, and Retired.

**Observation.** The regional “shop all” pages are paginated and are not identical:

- [UK Shop All](https://jellycat.com/shop-all)
- [US Shop All](https://us.jellycat.com/shop-all)
- [EU Shop All](https://eu.jellycat.com/shop-all)

During this research, the regions exposed materially different page counts and mixes of current, out-of-stock, and retired items. For example, retired cards appeared deep in the [EU pagination](https://eu.jellycat.com/shop-all?page=61) and on the [UK pagination](https://jellycat.com/shop-all?page=7), while the [US pagination](https://us.jellycat.com/shop-all?page=30) had a different assortment. Page counts are a changing snapshot, not a stable contract.

**Conclusion.** No single region should be treated as the canonical complete catalog. The useful official seed is the union of all accessible regions, every pagination page, and every exact variant on each product page.

### New and coming-soon pages

**Observation.** Jellycat maintains an official [UK New page](https://jellycat.com/new) and [EU New page](https://eu.jellycat.com/new). The US site also had a distinct [Coming Soon collection](https://us.jellycat.com/collections/coming-soon), while an equivalent regional route did not behave identically in every region.

**Observation.** The official [site map](https://jellycat.com/sitemap/) says its newsletter includes new-character launches.

**Conclusion.** These are good low-latency release signals, but they are not enough for completeness. They should be diffed frequently and backed by periodic full regional catalog snapshots.

### Product and variant pages

**Observation.** Official product pages expose useful canonical facts such as display name, Jellycat SKU/product code, size or dimensions, materials, images, and availability. Examples include:

- [Zodihop Luxe Bunny Original](https://us.jellycat.com/zodihop-luxe-bunny-original/) — SKU `BAS3COS`.
- [Bartholomew Bear](https://us.jellycat.com/bartholomew-bear/) — a style-selecting family page whose default SKU is `BARM3BR`.
- [Bartholomew Bear with an explicit variant query](https://jellycat.com/bartholomew-bear/?sku=BARL2BR) — SKU `BARL2BR`.
- [Sky Dragon with an explicit variant query](https://us.jellycat.com/sky-dragon/?sku=SKY2DD) — SKU `SKY2DD`.
- [Personalised Sky Dragon Huge](https://eu.jellycat.com/personalised-sky-dragon-huge/) — a distinct product with SKU `PERSSKY1DD`.
- [Bartholomew Bear with Personalised Red Jumper](https://jellycat.com/bartholomew-bear-with-personalised-red-jumper/) — SKU `JUMPRBARM3BR`.
- [Bartholomew Bear Shoulder Bag](https://eu.jellycat.com/bartholomew-bear-shoulder-bag/) — SKU `BAR4BGBR`.

**Observation.** One official family page can contain multiple exact sizes or styles, and a query parameter can select the exact SKU. A page URL without its selected variant is therefore not necessarily one exact Product.

**Conclusion.** StockHawk must enumerate every selectable variant and store each exact size/color/style as its own Product. A family URL alone is insufficient.

### Retired products and historical coverage

**Observation.** Retired items can remain discoverable on official surfaces. For example, the official [Wee Pig page](https://jellycat.com/wee-pig/) still exposes SKU `WEE6PG`, and retired cards appeared in Shop All pagination during this research.

**Observation.** The category site map exposed a Retired route, but the main retired route redirected to Shop All when observed. No first-party statement was found guaranteeing that this route or Shop All is an all-time archive.

**Conclusion.** Preserved official pages and retired cards are valuable historical evidence, but they do not prove that all retired products remain online. StockHawk should retain every historical Product it has ever observed instead of mirroring deletions from Jellycat.

### Machine-readable sitemap

**Observation.** Jellycat’s official [robots.txt](https://us.jellycat.com/robots.txt) declares `/xmlsitemap.php`. Direct requests from this research environment encountered an anti-bot challenge, so it was not possible to verify the current sitemap contents here.

**Specification.** BigCommerce’s first-party [sitemap documentation](https://docs.bigcommerce.com/developer/docs/storefront/catalyst/content-management/sitemap) says its complete sitemap contains canonical URLs for platform-managed products, brands, and categories, and documents the legacy `/xmlsitemap.php` path. The shared pathname is useful supporting evidence, but it does not by itself prove Jellycat’s platform configuration or that the sitemap contains historical/deleted products.

**Conclusion.** Audit and consume the sitemap when accessible, but never make it the only catalog-discovery route. Keep the paginated HTML and variant enumeration as independent coverage paths.

## 2. Official historical catalog data

**Observation.** Jellycat’s own `catalogue.jellycat.com` domain exposes historical wholesale price-list PDFs with unusually strong identity data:

- [Autumn/Winter 2023 ROW price list](https://catalogue.jellycat.com/price-lists/autumn-winter-2023/rotw.pdf)
- [Spring/Summer 2024 ROW price list](https://catalogue.jellycat.com/price-lists/spring-summer-2024/row.pdf)
- [High Summer 2024 ROW price list](https://catalogue.jellycat.com/price-lists/high-summer-2024/row.pdf)

The PDFs include exact item code, official description, barcode, dimensions, pack information, category, and new-item markers. For example, the Autumn/Winter 2023 list associates `BARL2BR` with Bartholomew Bear Large and barcode `670983076363`.

**Observation.** Product codes can vary across editions. The 2024 list contains codes such as `BARH2BRN` and `BARM3BRN`, while other official pages/lists use closely related codes without the suffix. This may reflect revisions or reissues; the public evidence alone does not establish whether every near-identical code is the same exact trade item.

**Conclusion.** These PDFs are excellent historical seed evidence but are not a current, guaranteed-complete feed. Import every row with source URL and source date. Never silently merge similar codes; preserve aliases or suspected lineage separately until evidence resolves them.

## 3. Identity signals and their limits

### Strong identifiers

**Specification.** GS1 defines the [Global Trade Item Number](https://www.gs1.org/standards/id-keys/gtin) as the identifier for a trade item. Its [GTIN Management Standard](https://www.gs1.org/1/gtinrules/en/) is designed to keep distinct trade items uniquely identified. GS1 also says the [brand owner normally allocates the GTIN](https://support.gs1.org/support/solutions/articles/43000734283-what-is-a-global-trade-item-number-gtin-) and provides [Verified by GS1](https://support.gs1.org/support/solutions/articles/43000734115-how-can-i-know-which-company-assigned-a-gs1-gtin-to-a-product-) for checking the assigning company.

**Recommendation.** Matching strength, from strongest downward:

1. An exact GTIN/UPC already observed in an official Jellycat source, optionally corroborated through GS1.
2. An exact Jellycat manufacturer product code/SKU already observed in an official Jellycat source.
3. An exact official Jellycat variant URL or query state that resolves to that code.

These can support deterministic matching to an exact Product. Every match should retain the evidence source and observation date.

### Retailer fields are claims, not proof

**Specification.** Google’s first-party [product-variant structured-data documentation](https://developers.google.com/search/docs/appearance/structured-data/product-variants) recommends a unique `sku` or `gtin` for each variant and supports either query-selected variants or separate variant URLs. Its [product identifier guidance](https://developers.google.com/search/blog/2021/02/product-information) recommends brand plus manufacturer part number when a GTIN is unavailable.

**Recommendation.** Retailer JSON-LD, feeds, APIs, variant payloads, and page metadata are efficient ways to collect candidate brand, SKU, GTIN, size, color, price, and availability. They do not become true merely because they are machine-readable:

- A retailer field called `sku` may be the retailer’s internal inventory number rather than Jellycat’s manufacturer code.
- A retailer product URL identifies that store’s Offer, not the global Jellycat Product.
- A brand/category assertion is evidence that a listing may be Jellycat, but not proof of the exact size or edition.
- An image can corroborate a match, but the same official imagery may appear across variants or retailers.

### Authorized-stockist evidence

**Observation.** Jellycat provides an official [stockist locator](https://jellycat.com/stockist-locator). Its [brand-protection statement](https://jellycat.com/brand-protection-statement) says it can vouch only for products bought through authorized stockists and cannot authenticate suspected counterfeits. Its [retailer brand guidelines](https://jellycat.com/brand-guidelines) describe official branding and launch assets supplied to approved retailers.

**Conclusion.** Authorized-stockist status raises confidence in a retailer’s Jellycat brand assertion and official imagery, but it still does not identify an exact variant by itself.

## 4. Recommended matching policy

The policy should be **open-world**: absence from the Master Catalog means “not matched yet,” not “not Jellycat.”

### Deterministic match

Automatically match an Offer to an exact Product when there is one unique candidate supported by:

- an exact official GTIN/UPC; or
- an exact official Jellycat manufacturer code, after distinguishing it from a retailer-internal SKU.

Preserve the raw value, normalized value, source, and first/last observation timestamps. Do not rewrite historical product-code evidence when a newer code appears.

### High-confidence composite match

When no strong identifier is available, generate candidates from normalized official names and known aliases, then require multiple independent attributes to agree, such as:

- exact size or dimensions;
- color/style/edition or personalization state;
- product type, collection, or family;
- retailer brand/manufacturer assertion;
- known official image assets as corroboration;
- an authorized-retailer relationship.

Only auto-match when the surviving candidate is unique and the evidence distinguishes the exact variant. The title may generate candidates, but it must not be the sole classifier.

This handles titles such as `Sky Dragon | Large 20"`, season codes, punctuation differences, translations, and size suffixes without assuming that every retailer writes “Jellycat.”

### Candidate-only / human review

Keep a listing provisional when it depends only on one or more weak signals:

- fuzzy title or alias;
- translated character name;
- URL slug;
- Jellycat category/brand metadata without an exact variant identifier;
- image similarity alone;
- incomplete size/color data;
- a near-match to a historical code that may be a reissue.

The provisional record should remain visible in the database and retain its Offer and stock state. It must not be silently discarded from discovery results.

### Explicit non-matches

Only classify a plausible candidate as not Jellycat when there is affirmative evidence, such as a different manufacturer/brand, an unrelated product page, or a reviewed false positive. “No match in our current catalog” is never sufficient evidence.

## 5. Detecting new Jellycat releases

**Recommendation.** Use two complementary loops:

1. **Fast official loop:** frequently diff each regional New page, Coming Soon page, accessible sitemap, and changed product/variant pages. Diff by official SKU/GTIN/variant identity rather than title alone.
2. **Coverage loop:** periodically resnapshot all regional Shop All pagination and enumerate every variant, then crawl each retailer’s complete product-discovery surfaces. Any unmatched but plausible retailer listing becomes a provisional Master Catalog candidate immediately.

Store immutable source observations with `first_seen_at`, `last_seen_at`, source URL, region, raw identifiers, and content hash. Never delete a canonical Product because it disappears from a current official page; mark the latest observed lifecycle state instead.

The retailer loop is important because it can reveal an item that has not yet been incorporated from an official page, and it avoids making the current catalog a closed-world gate.

**Observation.** Jellycat’s [brand guidelines](https://jellycat.com/brand-guidelines) prohibit retailers from sharing new-launch material before the specified launch date. Therefore, no public crawler can promise discovery before an item becomes public. StockHawk can detect public changes quickly; it cannot see private or embargoed inventory.

## 6. What public evidence cannot prove

No reviewed first-party source promises a complete public archive of every Jellycat product ever made. The following therefore remain unprovable from public crawling alone:

- products removed before StockHawk observed them;
- obscure retired, regional, event, wholesale-only, or limited products with no surviving public source;
- private early-access or embargoed products before publication;
- exact lineage when closely related official product codes change across editions;
- the exact variant of a retailer listing that omits both identifiers and distinguishing attributes;
- authenticity of a product sold by an unknown or unauthorized seller.

Human review is appropriate for those ambiguous cases. The user can optionally supply old catalogs, receipts, packaging codes, or remembered products to improve historical depth, but none of that is required to start or maintain the operational catalog.

## 7. V1 recommendation

Build the Master Catalog as a growing evidence ledger, not as a prerequisite spreadsheet:

- Seed it from every accessible official Jellycat region, all exact variants, surviving retired pages, and official historical PDFs.
- Let retailer crawls add provisional Jellycat candidates instead of filtering only against the seed.
- Prefer exact official GTIN or manufacturer code; use normalized names only as candidate generation, then require variant-level corroboration.
- Keep every exact retailer variant as a separate Offer and every exact Jellycat size/color/style as a separate Product.
- Keep unmatched plausible candidates visible and in a resolution loop.
- Retain all historical observations so a disappearing/retired product is not lost.

For completeness reporting, distinguish two claims:

1. **Observed-catalog completeness:** every reachable product route and variant on the audited surfaces was enumerated and accounted for.
2. **All-time Jellycat completeness:** every Jellycat ever produced is known.

The first is measurable and can become green. The second is not provable from the public sources reviewed and should not be presented as a guarantee.
