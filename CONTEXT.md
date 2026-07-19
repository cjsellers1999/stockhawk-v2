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
A live Storefront whose latest Catalog Discovery yielded useful observations but did not prove exhaustive coverage. Partial observations remain searchable, while missing prior listings are never reconciled as removals and any older certified snapshot remains historical rather than current completeness proof.
_Avoid_: Certified storefront, blocked storefront

**Blocked Storefront**:
A live Storefront where a specific, reproducible external barrier prevents exhaustive catalog access using StockHawk's allowed methods. Blocked requires evidence of the barrier, not unfinished research or failed verification alone.
_Avoid_: Partial storefront, broken connector

**Dormant Storefront**:
A live Storefront whose latest certified complete Catalog Snapshot contains no currently identified Jellycat Products or Offers. It remains known and receives infrequent discovery checks; an empty search, Partial run, or failed crawl cannot establish Dormant.
_Avoid_: Non-store, deleted site

**Non-Store Candidate**:
A Candidate Site that neither exposes a retail product catalog nor resolves to a retailer-controlled Storefront. It is excluded from the Seed List while the original workbook remains source evidence.
_Avoid_: Dormant storefront, dead storefront

**Dead Storefront**:
A previously identified retail Storefront that is no longer reachable or operating. It remains recorded on the dead list but is not part of normal crawling.
_Avoid_: Out-of-stock store, broken connector

**Connector**:
The common interface through which StockHawk runs Catalog Discovery and Stock Monitoring without knowing a Storefront's platform or extraction implementation. Concrete Connector Adapters satisfy it.
_Avoid_: Platform-specific caller, storefront configuration

**Connector Adapter**:
A registered implementation of the Connector interface responsible for both jobs for one Storefront Integration. It may be a shared Platform Connector Adapter or a one-off Bespoke Connector Adapter and may compose independent internal discovery and stock mechanisms.
_Avoid_: Storefront configuration, independent interface

**Platform Connector Adapter**:
A Connector implementation shared by multiple compatible Storefronts, such as stores exposing the same certifiable platform surface.
_Avoid_: Platform label, Storefront Integration

**Bespoke Connector Adapter**:
A Connector implementation containing independent extraction code for one genuinely exceptional Storefront while preserving the common Connector interface.
_Avoid_: Independent interface, configuration override

**Connector Registry**:
The explicit application-code registry of type-checked Platform and Bespoke Connector Adapters addressable by stable ID and compatible version. V1 never loads executable Connector behavior from Storefront configuration or arbitrary runtime plugins.
_Avoid_: Dynamic plugin folder, executable configuration

**Connector Checkpoint**:
An opaque, Adapter-owned bookmark for safely resuming a Connector job after interruption. StockHawk persists but never interprets it; a source that cannot resume declares restart-only behavior and replays idempotently.
_Avoid_: Shared page number, scheduler cursor

**Connector Failure**:
A typed report that a Connector job could not complete as intended, retaining its failure stage, stable code, evidence, checkpoint, and retry guidance. It is an input to Storefront Health, not permission for an Adapter to declare a Storefront Partial or Blocked.
_Avoid_: Unstructured error string, Storefront classification

**Connector Run Metrics**:
The request, browser, transfer, cache, timing, retry, throttle, challenge, item-count, and access-method measurements produced by a Connector job from work it already performed. They let the scheduler learn real Storefront cost and safe capacity without additional requests.
_Avoid_: Fixed global cost guess, extra measurement crawl

**Crawl Request Broker**:
The single governed path through which Connector Adapters obtain HTTP or browser access. It applies global and per-Storefront pacing, shared caching, and backoff while Adapters supply source constraints and server retry hints.
_Avoid_: Direct Connector request, Adapter-owned sleep

**Browser Access Grant**:
An audited Storefront Integration permission allowing a Connector Adapter to use the governed browser on specified public routes when normal HTTP access is insufficient. It does not authorize credentials, private catalogs, CAPTCHA interaction or bypass, or anti-bot evasion.
_Avoid_: Silent browser fallback, unrestricted browser session

**Storefront Integration**:
An immutable published version of the schema-validated configuration connecting one durable Storefront to a Platform or Bespoke Connector Adapter. It records approved origins and catalog roots, locale, Adapter options/version, expected surface, Certification Recipe, initial pacing constraints, and any Browser Access Grant, but never executable behavior, credentials, or unrestricted request headers. A Storefront has at most one active version, and every run, observation, snapshot, claim, and certification decision remains pinned to the exact version that produced it; a coverage-affecting replacement requires recertification.
_Avoid_: Connector, candidate site

**Integration Drift**:
A detected change between a Storefront Integration's audited Adapter expectations and the Storefront's current platform or public catalog surface. It invalidates current Catalog Certification and requires explicit repair rather than a silent Adapter switch, while retained catalog and stock data remain available.
_Avoid_: Automatic migration, ordinary crawl failure

**Needs Recertification**:
A Storefront Integration state entered when a coverage-affecting Adapter, identity, interpretation, configuration, or Certification Recipe change makes prior proof inapplicable. Existing data remains searchable, but fresh Catalog Discovery must succeed before certification becomes current again.
_Avoid_: Data deletion, ordinary stock staleness

**Catalog Certification**:
Evidence that a Storefront Integration exhaustively enumerated the complete public catalog visible to StockHawk during its latest successful Catalog Discovery. Certification is time-scoped and does not claim access to hidden or restricted merchandise.
_Avoid_: Successful request, permanent completeness guarantee

**Certification Claim**:
The versioned evidence a Connector Adapter submits after Catalog Discovery to request Catalog Certification, including route, count, pagination, parent and exact-variant closure, snapshot-boundary, visibility, and gap evidence. The central Catalog Certifier judges the claim; the Adapter never certifies itself.
_Avoid_: Certified boolean, Adapter verdict

**Certification Recipe**:
The versioned, method-specific proof requirements pinned by a Storefront Integration for its audited catalog surface. The central Catalog Certifier evaluates each Certification Claim against this recipe, and a recipe change requires fresh discovery before certification can become current.
_Avoid_: Adapter self-certification, generic success rule

**Catalog Snapshot**:
The complete, consistently bounded set of Retailer Listings observed during one certified Catalog Discovery. Its membership is immutable and uniqueness-constrained after certification, and its evidence records the observation boundary, counts, and fingerprints so successive certified snapshots can reveal catalog changes. A positive observation may establish presence immediately, but only absence from a newly certified snapshot may establish disappearance; current Jellycat classifications are derived separately and may change without altering snapshot membership.
_Avoid_: Stock refresh, search result page

**Master Catalog**:
The canonical reference of known Jellycat Products, identifiers, names, and aliases used to recognize retailer Offers. A Product may be established by official Jellycat evidence, independent retailer corroboration, one retailer's explicit Jellycat evidence, or a compatible known catalog name, with that evidence authority preserved; the catalog is never treated as permanently complete.
_Avoid_: Storefront catalog, retailer search results

**Master Catalog Discovery**:
The recurring observation of official Jellycat catalog surfaces and unmatched retailer evidence to add newly public Products and exact variants to the Master Catalog. Official regions contribute a union of source-specific evidence: a shared verified official identifier joins observations to one Product, while distinct verified identifiers remain separate Products.
_Avoid_: Manual master list, one-time catalog import

**Local Reclassification**:
A network-free rerun of current catalog and matching rules over persisted Retailer Listings whenever Products, aliases, evidence, or classifier rules change. It promotes newly compatible listings before targeted page refreshes consume residential-IP capacity; periodic complete Catalog Discovery remains the safety net.
_Avoid_: Retailer recrawl, stock refresh

**Catalog Match**:
A current, evidence-backed, reversible association between a Retailer Listing and one Product. A listing has at most one active Catalog Match, while many listings may match the same Product. It may be confirmed by a verified exact official identifier, independent retailer corroboration, or one retailer's exact Normalized Title and compatible variant facts when they uniquely identify an existing Product. If a base title cannot distinguish known variants, StockHawk creates a separate variant-unknown Product rather than guessing or activating several competing matches; affirmative conflicting brand or variant evidence blocks the match. Stronger later evidence may supersede the current association while its prior match and Decision Receipts remain preserved.
_Avoid_: Unqualified title-only guess, brand-keyword match

**Normalized Title**:
A deterministic comparison form derived from a Retailer Listing's preserved raw title. It may normalize capitalization, whitespace, punctuation, quotation marks, common accent drift, equivalent size-unit formatting, and reordered identical name tokens, and may recognize a known name embedded intact in retailer decoration or translated text. It never removes or equates conflicting variant-defining or other meaningful words; translation or semantic similarity alone cannot merge Products.
_Avoid_: Replacement title, fuzzy semantic guess

**Canonical Product Name**:
The best-supported Product-level Jellycat name used as a secondary label when it differs from a retailer's preserved raw title. Search indexes both names and trusted aliases; the canonical name never overwrites the retailer title shown as an Offer's primary title.
_Avoid_: Retailer listing title, destructive rename

**Provisional Candidate**:
A Retailer Listing with affirmative evidence that it may be Jellycat but not enough evidence for even a best-effort Product and Offer decision. It remains visible and in a resolution loop rather than being discarded or teaching the Master Catalog an unsupported answer.
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

**Source Evidence Artifact**:
Source response, browser, or extraction evidence submitted by a Connector Adapter with its origin, observation time, stable identity, and content hash. Central persistence owns its storage and retention; Adapters and Decision Receipts only emit or reference it.
_Avoid_: Adapter-owned file, unexplained scrape result

**Retailer Listing**:
A raw catalog entry collected from a Storefront before its relationship to Jellycat or an exact Product is resolved. Every enumerated listing is persisted so its source data, classification evidence, and any collected Stock Observation remain available for local reclassification and catalog comparison.
_Avoid_: Product, confirmed offer

**Retailer Listing Observation**:
The source-specific facts emitted by a Connector Adapter for one Retailer Listing at one observation time, preserving retailer values while translating platform structure and availability into StockHawk's common forms. It contains no Jellycat classification or Product decision.
_Avoid_: Catalog Match, Product classification

**Source Listing Identity**:
A Storefront-scoped stable identity supplied or deterministically derived by a Connector Adapter for a parent catalog entry and each exact sellable variant. It makes repeat observations idempotent while preserving distinct retailer entries; a derived identity retains its rule version and never relies on title alone.
_Avoid_: Product identity, title deduplication

**Change Event**:
An immutable, schema-versioned entry in StockHawk's permanent ordered event stream recording that a Product or Retailer Listing was first discovered, disappeared, or reappeared, or that a listing's Stock Status changed. It is appended atomically with current state and preserves durable subject IDs, previous and new values, effective and recorded times, and causal source references; a causal idempotency key makes replay safe. Future consumers keep independent stream-position bookmarks rather than editing or deleting events. V1 records Change Events but sends no alerts.
_Avoid_: Notification, current state, shared processed flag

**Purchase Handoff**:
The one-click transition from a StockHawk result to that exact listing on the retailer's Storefront so the owner can complete the purchase manually. StockHawk does not add items to carts, authenticate with retailers, or perform checkout.
_Avoid_: Automated purchase, cart integration

**Product**:
A canonical Jellycat sellable identity at the exact size, color, style, or edition level when the source exposes those facts. Best-effort discovery may create a separate variant-unknown Product rather than guessing among known variants. A verified official identifier belongs to only one Product; distinct codes remain separate by default, identifier aliases require authoritative evidence of exact equivalence, and title aliases follow the Normalized Title policy.
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
The retained provenance level explaining why a Product belongs in the Master Catalog: `official-confirmed` from verified official Jellycat evidence; `retailer-corroborated` from compatible evidence across independent retailers; `retailer-observed` from one retailer's explicit Jellycat surface or compatible known catalog name; or `review-confirmed` from human resolution of a Retailer Listing StockHawk discovered. Stronger evidence may upgrade authority without erasing prior evidence or decisions; authority alone never confirms an incompatible variant match.
_Avoid_: Confidence score, title-match strength

**Product Lifecycle**:
A Product's catalog state: `coming-soon`, `current`, `not-currently-observed`, `retired`, or `unknown`. Official disappearance alone means not currently observed; retirement requires affirmative evidence. Lifecycle is independent of Offer Stock Status and never deletes a Product. Any real retailer listing remains searchable regardless of lifecycle, but a Master Catalog-only Product does not create a search row without a retailer page.
_Avoid_: Stock status, deletion state

**Product Family**:
A grouping for Products that share a Jellycat design or character but differ in size, color, or another sellable characteristic.
_Avoid_: Product, purchasable item

**Offer**:
A Retailer Listing confirmed by an active Catalog Match to one Product, which is exact when the evidence exposes the variant and explicitly variant-unknown otherwise. Offer is a role of the durable Retailer Listing rather than a second persisted identity: retailer facts, Stock Status, and Purchase Handoff remain attached to that listing. Different Source Listing Identities remain separate Offers, including at the same Storefront when displayed details appear duplicative.
_Avoid_: Separate offer copy, variant, deduplicated store listing

**Stock Status**:
The availability state displayed by the retailer for an Offer: `in stock`, `out of stock`, `preorder`, or `unknown`. It does not assert that the Offer can be shipped or delivered to the buyer.
_Avoid_: Purchase eligibility, shipping eligibility, deliverability

**Listing Presence**:
Whether a Retailer Listing is currently observed in its Storefront's public catalog rather than certified as disappeared. Positive evidence may mark a listing discovered or reappeared immediately; only absence from a newly certified complete Catalog Snapshot may mark it disappeared. Presence is independent of Stock Status.
_Avoid_: Availability, partial-crawl absence, deletion

**Lifecycle Transition**:
An explicit, timestamped, reasoned state change that retires, disappears, kills, excludes, corrects, merges, or supersedes a durable record without deleting its identity or history. Merges choose one canonical survivor and retain acyclic redirects from superseded identities; only retention-governed payload detail and uncommitted temporary data may be physically removed.
_Avoid_: Hard delete, cascade delete, silent overwrite

**Query-Shaped Index**:
A secondary or full-text index justified by a named production query, its equality, range, ordering, and cursor predicates, and a measured query plan under representative load. Its read benefit must exceed its write and storage cost; redundant or unused indexes are removed rather than accumulated speculatively.
_Avoid_: Index every column, unmeasured optimization, permanent unused index

**Persistence Boundary**:
The single authoritative module through which every Connector, matcher, certifier, scheduler, retention job, and review action submits typed, idempotent commands that change StockHawk's relational domain. Its transactions jointly maintain immutable evidence, current state, Search Documents, checkpoints, lifecycle history, and Change Events while read paths remain independently queryable.
_Avoid_: Direct worker table update, duplicated transaction logic, repository-per-table writes

**Raw Observation Payload**:
An immutable, schema-versioned attachment to a Retailer Listing Observation or Source Evidence Artifact that preserves Connector-specific source fields and a content hash beside StockHawk's typed relational facts. Important shared facts are deliberately promoted into the core schema; retention may prune the bulky payload while preserving its permanent envelope, hash, and extracted decision evidence.
_Avoid_: Entire domain model in JSON, retailer-specific core column, unversioned blob

**Stock Observation**:
An immutable, conclusive source observation of a Retailer Listing's Stock Status together with its observation order, observation time, source run, and evidence. The newest eligible observation advances Current Stock State; failed, omitted, or unobservable attempts remain run and Health facts rather than Stock Observations.
_Avoid_: Failed check attempt, current-state row, freshness guarantee

**Current Stock State**:
The query-optimized latest trustworthy Stock Status and its `Last checked` time for one Retailer Listing. It starts `unknown`; a newer conclusive observation atomically updates it and emits a Change Event only when the status changes. Failed checks and older delayed observations never erase or overwrite the latest trustworthy answer, whose age remains visible separately.
_Avoid_: Check-attempt time, health state, checkout guarantee

**Catalog Discovery**:
The exhaustive enumeration and classification of a Storefront's public catalog to find previously unknown Products and Offers. Its purpose is coverage, not stock freshness.
_Avoid_: Retailer keyword search, stock refresh, monitoring

**Stock Monitoring**:
The repeated observation of known Offers to update their Stock Status and observation time. An Adapter may use mechanisms independent from Catalog Discovery and coalesce targets efficiently, but must account for every target; failed, omitted, or unobservable evidence retains the previous status or remains `unknown` when never observed. Monitoring may discover additional listings but never proves complete catalog coverage.
_Avoid_: Catalog discovery, complete recrawl

**Current State Projection**:
The query-optimized relational records representing StockHawk's latest accepted Storefront, Product, Retailer Listing, Catalog Match, classification, certification, health, and Stock Status facts. A state-changing transaction updates these records atomically with the immutable observation, decision, or Change Event that justifies the change; normal search reads this projection rather than replaying history.
_Avoid_: Sole historical record, pure event-sourced search

**StockHawk Identity**:
An opaque, immutable internal identifier assigned to every durable domain record independently of retailer-controlled names, titles, URLs, SKUs, and Connector formats. Scoped source identifiers locate or constrain that record, while rekeying, aliasing, merging, and supersession preserve the internal identity and its history or occur through an explicit history-preserving transition.
_Avoid_: Title primary key, URL primary key, silent identity replacement

**Observation Batch**:
A bounded, run-scoped, replay-safe unit of Connector output. Its transaction atomically saves referenced evidence and immutable observations, applies any synchronous current-state transitions, appends required deterministic Change Events, and advances the Connector Checkpoint; a unique batch identity prevents replay from duplicating effects. Committed partial batches are usable immediately but never prove complete catalog coverage.
_Avoid_: Crawl-wide transaction, checkpoint-before-data, completeness claim

**Retention Class**:
The declared storage lifetime of a persisted StockHawk record or payload: permanent structured truth, temporarily pinned proof, or rolling operational detail. V1 keeps durable identities, decisions, Change Events, current state, and compact causal envelopes permanently; keeps proof pinned while it is operationally required; and defaults unpinned bulky or repetitive detail to a 30-day window before observable compaction or payload pruning that preserves hashes and referential integrity.
_Avoid_: One retention rule for all data, silent hard delete, dangling evidence reference

**Search Document**:
A versioned, rebuildable, query-optimized index-card record uniquely keyed to one Retailer Listing. It copies the listing's raw title, matched Product name and trusted aliases, retailer name and URL, current classification, match, Stock Status, Listing Presence, visibility, and navigation identities so local search and filters stay fast while distinct listings remain distinct. Authoritative normalized state updates it transactionally, and StockHawk can deterministically rebuild it without retailer requests.
_Avoid_: Source of truth, Product-level deduplication, external recrawl

**Persistence Invariant**:
A critical identity, relationship, state, idempotency, retention, or lifecycle rule that StockHawk's relational database enforces in addition to application validation. Foreign keys, allowed-value and non-null checks, uniqueness, restrictive deletion, and authoritative transactions prevent impossible current state and preserve durable history even when calling code is wrong.
_Avoid_: Application convention, best-effort validation, cascade deletion of history

**Search Cursor**:
An opaque, versioned, URL-safe bookmark for continuing a flat or Storefront-grouped Search Document query by stable ordering values and StockHawk Identity tie-breakers. It is bound to the search chips, filters, view, and sort signature, enabling fast traversal without deep offset scans or a server-side search session. It navigates the latest committed live results rather than freezing them, so restarting from the beginning is the authoritative fresh pass.
_Avoid_: Page-number offset, unbound row ID, frozen or mutable server session
