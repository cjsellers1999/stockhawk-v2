# StockHawk Catalog

Shared language for discovering Jellycat merchandise and retailer availability from the supplied site inventory.

## Language

**Seed Site Record**:
A row imported from the supplied workbook. It is a starting claim about a retail URL and may duplicate or disagree with other records.
_Avoid_: Store, unique site

**Candidate Site**:
A distinct public web entry point derived from one or more Seed Site Records and awaiting fresh Storefront Audit. A shared hostname, similar name, or Legacy Connector Label does not by itself prove that two Candidate Sites are the same, and their source records remain traceable.
_Avoid_: Unsupported site, excluded site

**Legacy Connector Label**:
The connector type recorded in the supplied workbook, including `unsupported`. It is an investigative clue, not trusted evidence of current capability.
_Avoid_: Support status, final classification

**Seed List**:
The reviewed set of verified, distinct Candidate Sites approved to initialize StockHawk. It preserves Seed Site Record provenance while the original workbook remains immutable source evidence.
_Avoid_: Raw workbook, seed records

**Storefront**:
A retailer-controlled commerce destination that exposes its product catalog. A Storefront may use a different host or platform from its Candidate Site, and multiple Candidate Sites may resolve to the same Storefront.
_Avoid_: Landing page, physical location page, candidate URL

**Storefront Audit**:
The one-time human-style review of a Candidate Site that follows redirects and retailer-controlled shop links to its actual Storefront, distinguishes location pages from commerce destinations, determines whether public Jellycat merchandise is present, and records whether the destination is live, dead, or unresolved.
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
The canonical reference of known Jellycat Products, identifiers, names, and aliases used to recognize retailer Offers. A Product may be established by official Jellycat evidence, independent retailer corroboration, or one retailer's explicit Jellycat evidence, with that evidence authority preserved; the catalog is never treated as permanently complete.
_Avoid_: Storefront catalog, retailer search results

**Master Catalog Discovery**:
The recurring observation of official Jellycat catalog surfaces and unmatched retailer evidence to add newly public Products and exact variants to the Master Catalog.
_Avoid_: Manual master list, one-time catalog import

**Catalog Match**:
An evidence-backed, reversible association between a Retailer Listing and one Product. It may be confirmed by a verified exact official identifier or by independent corroboration that uniquely distinguishes the exact size, color, style, or edition. One source's title, image, URL, or category alone is insufficient, but compatible normalized titles across independent retailer organizations may corroborate a Product when all known variant facts agree. Stronger later evidence may supersede the match while its history remains preserved.
_Avoid_: Title match, brand-keyword match

**Normalized Title**:
A deterministic comparison form derived from a Retailer Listing's preserved raw title. It may normalize capitalization, whitespace, punctuation, quotation marks, common accent drift, equivalent size-unit formatting, and reordered identical name tokens, and may recognize a known name embedded intact in retailer decoration or translated text. It never removes or equates conflicting variant-defining or other meaningful words; translation or semantic similarity alone cannot merge Products.
_Avoid_: Replacement title, fuzzy semantic guess

**Provisional Candidate**:
A retailer listing that may represent a Jellycat Product but lacks enough verified evidence for an exact Catalog Match. It remains visible and in a resolution loop rather than being discarded or teaching the Master Catalog an unverified answer.
_Avoid_: Confirmed product, non-Jellycat listing

**Excluded Listing**:
A Retailer Listing affirmatively shown by retained evidence not to be Jellycat. It is hidden from normal potential-Jellycat search but is never deleted; absence from the Master Catalog is not exclusion evidence, and a material source change reopens classification.
_Avoid_: Deleted listing, catalog miss

**Unclassified Listing**:
A persistently stored Retailer Listing with no current affirmative evidence that it is or is not Jellycat. It is not a Product, search result, Stock Monitoring target, or review task, but is re-evaluated locally whenever its source content, the Master Catalog, aliases, or classification rules change.
_Avoid_: Provisional Candidate, discarded listing

**Review Group**:
A temporary grouping of Provisional Candidates suspected to represent the same Product. It reduces duplicate review work but neither merges Retailer Listings nor establishes a Catalog Match.
_Avoid_: Deduplicated listing, Product

**Review Queue**:
The optional exception queue containing only Provisional Candidates with affirmative Jellycat evidence, Identity Conflicts, and suspected duplicate Products that evidence cannot safely merge. It never includes ordinary Unclassified, Excluded, retailer-observed, or conflict-free variant-unknown records, and never blocks crawling, stock checks, or search. A large or steadily growing queue is an operational health failure to diagnose by Storefront and reason, not a normal manual ingestion workflow.
_Avoid_: Required approval gate, routine data-entry backlog

**Review Decision**:
One of five owner actions on a Review Queue item: link its listing to an existing Product, confirm a new Product from the discovered listing, merge duplicate Products while preserving separate Offers, mark it not Jellycat, or decide later. The decision never deletes source evidence or prior decisions.
_Avoid_: Free-form product creation, listing deletion

**Decision Receipt**:
An immutable explanation of an automated or human classification decision, including its source and observation, raw and normalized evidence, candidates considered, rule or matcher version, authority, reasons, conflicts, actor, and links to previous or superseding decisions. Current state changes without erasing these receipts.
_Avoid_: Mutable confidence field, unexplained match

**Retailer Listing**:
A raw catalog entry collected from a Storefront before its relationship to Jellycat or an exact Product is resolved. Every enumerated listing is persisted so its source data, classification evidence, and any collected Stock Observation remain available for local reclassification and catalog comparison.
_Avoid_: Product, confirmed offer

**Change Event**:
A durable record that a Product or Retailer Listing was first discovered, disappeared, or reappeared, or that a listing's Stock Status changed. It preserves the previous and new values, observation time, and source crawl. V1 records Change Events for future consumers but does not send alerts.
_Avoid_: Notification, current state

**Purchase Handoff**:
The one-click transition from a StockHawk result to that exact listing on the retailer's Storefront so the owner can complete the purchase manually. StockHawk does not add items to carts, authenticate with retailers, or perform checkout.
_Avoid_: Automated purchase, cart integration

**Product**:
A canonical Jellycat sellable identity at the exact size, color, style, or edition level when the source exposes those facts. Best-effort discovery may create a separate variant-unknown Product rather than guessing among known variants. A verified official identifier belongs to only one Product; distinct codes remain separate by default, and aliases require authoritative evidence of exact equivalence.
_Avoid_: Variant, product family

**Variant-unknown Product**:
A best-effort Product created when a retailer reliably identifies a Jellycat item but omits the facts needed to select among known exact variants. Its Offer is searchable normally, but the Product remains distinct from every known size, color, style, or edition instead of being guessed into one. Later exact evidence remaps only the compatible Offer; an unknown Product left with no Offers becomes Superseded.
_Avoid_: Provisional Candidate, guessed variant

**Identity Conflict**:
A visible warning that equally authoritative evidence for one Retailer Listing points to incompatible exact Product identities. The listing remains searchable under a variant-unknown Product until stronger evidence or review resolves it; no conflicting variant is guessed.
_Avoid_: Hidden listing, arbitrary match

**Superseded Product**:
A historical Product replaced when stronger evidence resolves all of its Offers to more exact Products. It is omitted from current results but retained with its evidence, decisions, mapping history, and Change Events.
_Avoid_: Deleted product, retired product

**Product Authority**:
The retained provenance level explaining why a Product belongs in the Master Catalog: `official-confirmed` from verified official Jellycat evidence; `retailer-corroborated` from compatible evidence across independent retailers; `retailer-observed` from one retailer that explicitly identifies the listing as Jellycat or places it on a verified Jellycat brand surface; or `review-confirmed` from human resolution of a Retailer Listing StockHawk discovered. Stronger evidence may upgrade authority without erasing prior evidence or decisions; authority alone never confirms an incompatible variant match.
_Avoid_: Confidence score, title-match strength

**Product Lifecycle**:
A Product's catalog state: `coming-soon`, `current`, `not-currently-observed`, `retired`, or `unknown`. Official disappearance alone means not currently observed; retirement requires affirmative evidence. Lifecycle is independent of Offer Stock Status and never deletes a Product. Any real retailer listing remains searchable regardless of lifecycle, but a Master Catalog-only Product does not create a search row without a retailer page.
_Avoid_: Stock status, deletion state

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
