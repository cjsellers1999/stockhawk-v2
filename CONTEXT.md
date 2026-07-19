# StockHawk Catalog

Shared language for discovering Jellycat merchandise and retailer availability from the supplied site inventory.

## Language

**Seed Site Record**:
A row imported from the supplied workbook. It is a starting claim about a retail URL and may duplicate or disagree with other records.
_Avoid_: Store, unique site

**Candidate Site**:
A cleaned web entry point that remains in scope for fresh catalog-access assessment, regardless of its imported connector label. It may point or redirect to a different Storefront.
_Avoid_: Unsupported site, excluded site

**Legacy Connector Label**:
The connector type recorded in the supplied workbook, including `unsupported`. It is an investigative clue, not trusted evidence of current capability.
_Avoid_: Support status, final classification

**Seed List**:
The reviewed, deduplicated set of Candidate Sites used to initialize StockHawk. The original workbook remains source evidence and is not seeded directly.
_Avoid_: Raw workbook, seed records

**Storefront**:
A retailer-controlled commerce destination that exposes its product catalog. A Storefront may use a different host or platform from its Candidate Site, and multiple Candidate Sites may resolve to the same Storefront.
_Avoid_: Landing page, physical location page, candidate URL

**Storefront Audit**:
The one-time human-style review of a Candidate Site that resolves its actual Storefront, determines whether Jellycat merchandise is present, and records whether the destination is live, dead, or unresolved.
_Avoid_: Catalog monitoring, recurring crawl

**Storefront Health**:
The reliability of StockHawk's current access to a Storefront, independent of every Offer's Stock Status. Unhealthy access means catalog or availability data may be incomplete or stale.
_Avoid_: Product availability, stock status

**Partial Storefront**:
A live Storefront where StockHawk has discovered some Offers but has not yet earned Catalog Certification. It remains in investigation and reverification rather than becoming Blocked merely because certification is difficult.
_Avoid_: Certified storefront, blocked storefront

**Blocked Storefront**:
A live Storefront where a specific, reproducible external barrier prevents exhaustive catalog access using StockHawk's allowed methods. Blocked requires evidence of the barrier, not unfinished research or failed verification alone.
_Avoid_: Partial storefront, broken connector

**Dormant Storefront**:
A live retail Storefront where no Jellycat Products were found during the latest Catalog Discovery. It remains known and receives infrequent discovery checks.
_Avoid_: Non-store, deleted site

**Non-Store Candidate**:
A Candidate Site that neither exposes a retail product catalog nor resolves to a retailer-controlled Storefront. It is excluded from the Seed List while the original workbook remains source evidence.
_Avoid_: Dormant storefront, dead storefront

**Dead Storefront**:
A previously identified retail Storefront that is no longer reachable or operating. It remains recorded on the dead list but is not part of normal crawling.
_Avoid_: Out-of-stock store, broken connector

**Connector**:
A reusable catalog-discovery and stock-monitoring strategy for a commerce platform or extraction method. It is shared across Storefronts rather than implemented once per retailer.
_Avoid_: Store-specific scraper, storefront configuration

**Storefront Integration**:
The audited configuration that connects one Storefront to a Connector, including any retailer-specific settings or overrides.
_Avoid_: Connector, candidate site

**Catalog Certification**:
Evidence that a Storefront Integration exhaustively enumerated the complete public catalog visible to StockHawk during its latest successful Catalog Discovery. Certification is time-scoped and does not claim access to hidden or restricted merchandise.
_Avoid_: Successful request, permanent completeness guarantee

**Catalog Snapshot**:
The complete set of Products and Offers observed during one certified Catalog Discovery. Comparing successive snapshots reveals newly added, changed, and removed catalog entries.
_Avoid_: Stock refresh, search result page

**Master Catalog**:
The canonical reference of known Jellycat Products, identifiers, official names, and aliases used to recognize retailer Offers. It supports Catalog Matching but must not be treated as permanently complete because Jellycat can release new Products.
_Avoid_: Storefront catalog, retailer search results

**Master Catalog Discovery**:
The recurring observation of official Jellycat catalog surfaces and unmatched retailer evidence to add newly public Products and exact variants to the Master Catalog.
_Avoid_: Manual master list, one-time catalog import

**Catalog Match**:
An evidence-backed association between a retailer Offer and a Product using independently validated signals. No individual signal, including the presence or absence of `Jellycat` in a title, is assumed sufficient before research and verification.
_Avoid_: Title match, brand-keyword match

**Provisional Candidate**:
A retailer listing that may represent a Jellycat Product but lacks enough verified evidence for an exact Catalog Match. It remains visible and in a resolution loop rather than being discarded or teaching the Master Catalog an unverified answer.
_Avoid_: Confirmed product, non-Jellycat listing

**Retailer Listing**:
A raw catalog entry collected from a Storefront before its relationship to Jellycat or an exact Product is resolved. Its source data and Stock Observation remain preserved throughout classification.
_Avoid_: Product, confirmed offer

**Change Event**:
A durable record that a Product or Retailer Listing was first discovered, disappeared, or reappeared, or that a listing's Stock Status changed. It preserves the previous and new values, observation time, and source crawl. V1 records Change Events for future consumers but does not send alerts.
_Avoid_: Notification, current state

**Purchase Handoff**:
The one-click transition from a StockHawk result to that exact listing on the retailer's Storefront so the owner can complete the purchase manually. StockHawk does not add items to carts, authenticate with retailers, or perform checkout.
_Avoid_: Automated purchase, cart integration

**Product**:
A canonical Jellycat sellable identity at the exact size, color, or other variation level. Two variations in the same design family are different Products.
_Avoid_: Variant, product family

**Product Family**:
A grouping for Products that share a Jellycat design or character but differ in size, color, or another sellable characteristic.
_Avoid_: Product, purchasable item

**Offer**:
A Retailer Listing confirmed by a Catalog Match to one exact Product. Multiple Offers from the same Storefront remain distinct even when their displayed details appear duplicative.
_Avoid_: Variant, deduplicated store listing

**Stock Status**:
The availability state displayed by the retailer for an Offer: `in stock`, `out of stock`, `preorder`, or `unknown`. It does not assert that the Offer can be shipped or delivered to the buyer.
_Avoid_: Purchase eligibility, shipping eligibility, deliverability

**Stock Observation**:
The most recently observed Stock Status for an Offer together with when it was checked. Its age is disclosed separately and does not rewrite the observed status.
_Avoid_: Freshness guarantee, current checkout availability

**Catalog Discovery**:
The exhaustive enumeration and classification of a Storefront's public catalog to find previously unknown Products and Offers. Its purpose is coverage, not stock freshness.
_Avoid_: Retailer keyword search, stock refresh, monitoring

**Stock Monitoring**:
The repeated observation of known Offers to update their Stock Status and observation time. It does not prove that no undiscovered Offer exists.
_Avoid_: Catalog discovery, complete recrawl
