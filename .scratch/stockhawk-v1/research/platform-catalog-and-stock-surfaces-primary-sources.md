# Public catalog and stock surfaces by Storefront platform

Date researched: 2026-07-18

## Question and decision

For each Connector family represented by the cleaned Seed List, what public surface can enumerate every shopper-visible product and exact variant, what proves the enumeration ended, what fields help identify Jellycat products without relying on the word “Jellycat,” what stock signal is available, and can the evidence support Catalog Certification?

There is no safe universal answer such as “search every site for Jellycat.” The platform families divide into four implementation classes:

1. **Documented anonymous catalog interfaces:** WooCommerce Store API, Miva Runtime JSON API, NetSuite SuiteCommerce Item Search API, and the common Adobe Commerce/Magento storefront GraphQL deployment. These are the best certification surfaces because they expose an end condition such as a total, total pages, or a cursor.
2. **Documented public-client storefront interfaces:** BigCommerce storefront GraphQL and, in some deployments, Solidus GraphQL. These can be excellent, but StockHawk must use only a token intentionally exposed to shoppers and within its documented browser/origin boundary. A public-client token is not the same as an unauthenticated server API.
3. **Complete parent-URL sitemaps plus product pages:** Shopify is unusually strong because its public product endpoint exposes variants. Wix, Squarespace, Webflow, Ecwid, and some other builders expose useful product sitemaps, but exact variant closure usually depends on each live product page or its browser data.
4. **Store-specific browser/HTML work:** Square Online, GoDaddy Websites + Marketing, IndieCommerce, Bookmanager, and highly customized/open-source deployments do not have one documented, anonymous, platform-wide interface that proves every public listing and variant. They require a representative Storefront Audit and may remain Partial.

The imported `unsupported` value remains untrusted. Likewise, an imported platform label is only a routing hint until the actual commerce host and live surface are verified.

## Scope and evidence rules

This report uses platform-owner documentation, standards documents, and first-party storefront artifacts. It deliberately distinguishes:

- **Documented anonymous** — the platform owner documents a shopper-callable interface with no merchant secret.
- **Documented public-client** — the platform owner documents a browser-safe token or extension, but the surface still has installation, origin, or token constraints.
- **Documented merchant-only** — the interface requires a site owner to install an app, grant OAuth scopes, create an API key, or disclose a secret. This is not a V1 crawling surface.
- **Observed storefront surface** — a first-party store bundle or browser request reveals a useful interface, but the platform does not promise its stability or completeness. It must be versioned, monitored, and re-audited.
- **Inference to test** — a likely route, such as embedded product JSON, that documentation does not guarantee. It is not evidence for certification until a live audit proves it.

“Complete” in this report always means the complete **public catalog visible to the Mac mini during the certified discovery run**, not private, login-only, unpublished, or merchant-admin inventory. A platform can also intentionally hide out-of-stock items from shoppers; where that occurs, StockHawk cannot prove those hidden records exist and the evidence scope must say so.

Exact size/color/style combinations are separate StockHawk Product listings. Parent products are useful discovery containers, not substitutes for variant closure.

## Executive matrix

| Family | Best public route | Best exhaustion signal | Exact variants | Stock signal | Platform-wide certification potential |
|---|---|---|---|---|---|
| Shopify | Product sitemap → each `/products/{handle}.js` | All sitemap shards consumed; every handle resolved | Yes, up to the documented 250-variant Ajax limit | `available` at product/variant level | **Strong, conditional**; over-250 variants and market-specific stores need fallback |
| WooCommerce | Store API product and variation queries | `X-WP-TotalPages` / `X-WP-Total`, unique-ID reconciliation | Yes, variations can be queried as records | `stock_status`, plus purchase/stock booleans | **Strong, conditional** on accessible Store API and consistent totals |
| Ecwid / Lightspeed eCom E-Series | Instant Site sitemap; public REST only when an app token is legitimately available | Sitemap closure, or REST `total` + `offset` | REST combinations are exact; sitemap alone is not | Product/combination `inStock`, quantity, preorder behavior | **Conditional**; do not assume an arbitrary store has granted an app token |
| Lightspeed X-Series / C-Series | Storefront page/theme data; merchant APIs are secured | Store-specific page/network proof | Possible in rendered/browser data | Variant availability/inventory in some themes | **Store-specific**; no generic anonymous admin API |
| Square Online / Weebly | Sitemap + category/PDP/browser audit | Store-specific reconciliation only | Page/network dependent | Visible Available/Sold out/preorder UI | **Not platform-wide**; documented direct-link-only items defeat search/category proof |
| Wix Stores | Store product sitemap → every PDP | All product sitemap URLs resolved | PDP/browser dependent; external API is merchant-authenticated | Default Product structured data can expose availability | **Conditional**; parent catalog is stronger than variant closure |
| Squarespace Commerce | Sitemap → every product page | All product URLs resolved and reconciled to store pages | PDP/browser dependent; Commerce API is merchant-authenticated | Variant sold-out state on storefront | **Conditional** |
| BigCommerce | Same-origin storefront GraphQL, with sitemap fallback | Every `hasNextPage=false`; nested connections exhausted | Yes | `isInStock`; quantity may be hidden | **Strong, conditional** on legitimate public-client browser access and OOS visibility settings |
| Adobe Commerce / Magento | Storefront GraphQL | `total_count` + page closure, or Catalog Service cursor `null` | Yes | `stock_status` / `inStock` | **Strong, conditional** after deployment/schema identification |
| GoDaddy W+M | Category/store/PDP + live browser requests | No documented universal signal | Browser dependent | Storefront availability; admin supports variant quantity/backorder | **Not platform-wide** |
| NetSuite SuiteCommerce | Anonymous `/api/items` Item Search API | Offset/count reconciliation within stable partitions | Matrix children/options can be exposed | Field-set-dependent quantity/availability | **Strong but conditional**; partition deep catalogs and disclose hidden-OOS behavior |
| Miva | `Runtime_ProductList_Load_Query` | `total_count` + stable `count`/`offset` | Attributes/options; variant-specific follow-up where required | `inv_level`, counts, runtime variant inventory | **Strongest long-tail route** |
| Volusion | Optional All Products XML feed + current PDP checks | Feed closure and unique product-code reconciliation | Child products/options may carry distinct codes | Feed stock/availability is daily; PDP for current state | **Strong only if feed is enabled and variant-complete** |
| Webflow Ecommerce | Sitemap → every product page | All sitemap product URLs resolved | PDP/browser dependent; Data API returns all SKUs but needs merchant token | PDP out-of-stock state; Data API inventory is private | **Conditional** |
| nopCommerce | Sitemap + categories/manufacturers + grouped PDPs | Cross-surface URL/count reconciliation | Grouped children and attribute combinations | Merchant-configurable availability/backorder display | **Conditional, store-specific** |
| Solidus | Optional public `solidus_graphql_api`; otherwise custom storefront | GraphQL cursor closure, including nested variants | Yes when extension/schema exposes them | Highly customizable; validate actual schema | **Strong if public extension exists; otherwise store-specific** |
| IndieCommerce | Merchandise browse/search and PDPs | No documented exhaustive merchandise total/export | Unique custom SKUs for variations | Website Stock differs from POS Stock | **Not platform-wide** |
| Bookmanager | Observed Webstore browse customer API | Observed `row_count` / `max_offset` | Item records, identifiers, store availability | On-hand/availability in observed rows | **Strong for filtered current in-store inventory; Partial for full historical/OOS offers** |

## What must be true before Catalog Certification

A Connector does not earn certification merely because it returned Jellycat results. For a particular Storefront Integration, a certification run must retain evidence for all of the following:

1. **Surface identity:** resolved commerce origin, detected platform/version or extraction family, locale/market, and the exact public route used.
2. **Parent closure:** all pages, offsets, sitemap shards, categories, or cursors were consumed to the documented end signal.
3. **Variant closure:** every parent capable of variants was expanded, and every nested variant connection or page was independently exhausted. Each exact variant received a stable retailer identity where the surface offers one.
4. **Count reconciliation:** returned unique IDs/URLs equal the advertised total when one exists. Where multiple surfaces exist, their public product URL sets are compared and unexplained differences block certification.
5. **Snapshot consistency:** totals or high-water marks are checked at the start and end. If the catalog changed while offset pagination was running, retry or record a bounded, internally consistent snapshot.
6. **Visibility caveats:** document settings that omit shopper-visible direct-link items, hidden out-of-stock products, noindex products, market-specific products, or customer-role products. A known unexplained omission keeps the result Partial.
7. **Stock provenance:** record the exact field/UI state and observation time. Never convert an absent field into “out of stock.”
8. **Evidence artifact:** retain request route, status, counts/cursors, response schema fingerprint, error samples, and discovery timestamp so a later break can become an actionable health failure.

The strongest exhaustion evidence, in descending order, is:

- documented total/cursor/page metadata plus unique-ID reconciliation;
- a platform-documented product sitemap plus successful resolution of every product URL and variant closure;
- complete category traversal with stable advertised counts plus an independent sitemap/PDP reconciliation;
- browser network pagination whose end/count behavior was proven in the representative audit;
- HTML navigation alone.

Site search, a brand search, a collection named “Jellycat,” and JSON-LD on already-known pages are discovery aids, not exhaustion proofs.

## Shared public fallbacks

### XML sitemaps

The [Sitemaps protocol](https://www.sitemaps.org/protocol.html) defines URL sets and sitemap indexes. A file contains at most 50,000 URLs and 50 MB uncompressed; larger sites must use multiple sitemaps referenced by an index. `<lastmod>` is optional and is a publisher-supplied page modification time, not an inventory freshness guarantee.

StockHawk must recursively consume every sitemap index and shard, canonicalize only after retaining the original evidence, and distinguish product URLs by platform pattern or page classification. A generic sitemap says only “these are the URLs the publisher chose to list.” It does not promise that unlisted direct-link/noindex products do not exist. A platform-specific statement that the product sitemap contains all published product pages is materially stronger.

Sitemap `lastmod` can prioritize discovery refreshes, but must not suppress periodic full enumeration: merchants and platforms can omit, round, or delay it. It must not drive stock monitoring unless the platform explicitly ties it to inventory changes.

### Product structured data

[Schema.org Product](https://schema.org/Product), [Offer](https://schema.org/Offer), [ProductGroup](https://schema.org/ProductGroup), and [ItemAvailability](https://schema.org/ItemAvailability) define useful fields such as brand, SKU, GTIN, MPN, offers, variant relationships, and availability. `ProductGroup` can relate exact variants through `hasVariant` / `isVariantOf` and describe what varies.

Structured data is valuable for corroborating identity and visible stock, but it cannot enumerate pages StockHawk has not found. Merchants can customize it, omit variants, publish only the default selection, or leave stale values. Treat it as page-level evidence and compare it to the selectable options and purchase UI. A single parent-level `InStock` must not be copied to every variant unless the page/platform semantics guarantee that.

### HTML and browser network surfaces

When documented public data is absent, the audit should load the same public pages a shopper can load and inspect:

- category pagination and advertised counts;
- canonical URLs and product identifiers;
- page-embedded state used to render option selectors;
- same-origin XHR/fetch calls and their cursor/offset/count fields;
- every selectable variant and its visible availability;
- direct-linked products found in sitemaps but absent from navigation.

Observed interfaces are allowed as Storefront-specific integrations, but their schema fingerprint and expected end signal must become health checks. Do not take, replay, or persist admin cookies, merchant secrets, checkout tokens, or credentials. Do not turn CAPTCHA or access controls into an evasion task.

### Conditional HTTP requests

Where a public endpoint supplies validators, standard HTTP conditional requests can reduce bytes and parsing work. [RFC 9110 conditional requests](https://www.rfc-editor.org/rfc/rfc9110.html#name-conditional-requests) defines validators such as ETag/`If-None-Match` and modification dates/`If-Modified-Since`. A `304 Not Modified` still costs a request and must not be assumed available. Cache semantics belong to each observed route, not the platform name alone.

## StockHawk’s four-state normalization

The source value and explanation should be retained alongside the normalized value:

| Public evidence | V1 normalized Stock Status |
|---|---|
| Explicit purchasable/available/in-stock state for the exact variant | `in stock` |
| Explicit sold-out/out-of-stock/unavailable state for the exact variant | `out of stock` |
| Explicit retailer/platform “preorder” or “pre-order” state for the exact variant | `preorder` |
| Missing, contradictory, parent-only, access-blocked, or ambiguous state | `unknown` |

“Backorder allowed” is not automatically `preorder`; retailers use backorder for replenishment of existing items as well as future releases. Unless the public listing explicitly describes the item as a preorder, normalize a bare backorder signal to `unknown` and retain the source signal. Likewise, `is_purchasable=false` can have causes outside stock, so it is not by itself proof of `out of stock`.

Purchase eligibility, shipping, pickup, delivery, cart simulation, and checkout are out of scope. StockHawk needs the retailer’s public listing status, followed by a manual retailer-page handoff.

## Platform findings

### Shopify

**Surface classification:** documented anonymous sitemap and product JSON; optional public-client Storefront API.

Shopify [automatically creates `/sitemap.xml`](https://help.shopify.com/en/manual/promoting-marketing/seo/find-site-map), links separate product/collection/page/blog sitemaps, updates them when content changes, and states that the sitemap contains links to all products and their primary images. International domains have separate sitemap files, so the Storefront Integration must retain its market/host rather than silently collapsing all domains.

For each product handle, the documented [Ajax Product API](https://shopify.dev/docs/api/ajax/reference/product) exposes `GET /{locale}/products/{handle}.js`. It includes the product ID, handle, vendor, product type, tags, images, product availability, and variant objects. Each variant can expose its own ID, title/options, price, availability, inventory-management indicator, SKU, and barcode. The response has a documented maximum of **250 variants**.

Shopify’s [Storefront API product query](https://shopify.dev/docs/api/storefront/latest/queries/products) and [ProductVariant object](https://shopify.dev/docs/api/storefront/latest/objects/ProductVariant) support cursor-paginated products/variants and richer fields such as `availableForSale`, barcode, SKU, and selected options. However, [Storefront API authentication](https://shopify.dev/docs/api/usage/authentication) requires a token for the relevant access model. StockHawk must not assume it can create or obtain one for an arbitrary retailer. Use this route only when the live storefront intentionally exposes a browser-safe token and its documented boundary permits the request.

**Enumeration and proof of exhaustion**

1. Recursively fetch the sitemap index and every product sitemap shard for the exact host/market.
2. Retain every unique canonical product handle/URL.
3. Resolve every handle through the locale-aware `.js` route.
4. Emit one StockHawk listing per returned variant; a single-variant product still yields one exact listing.
5. If `variants.length === 250`, do not certify until the audit proves there are exactly 250 or obtains the remaining variant pages through a legitimate Storefront/browser surface.
6. Re-fetch the product sitemap metadata/count after a long run and retry if it changed materially.

**Identification fields:** product/variant IDs, handle and URL, vendor, product type, tags, SKU, barcode, variant options, normalized product title, images, and description. Brand/vendor and product-type evidence are far more useful than requiring the title to contain “Jellycat.”

**Stock:** use the exact variant `available` signal for `in stock` versus `out of stock`; retain parent availability only as a summary. Shopify does not make “preorder” a universal Ajax status. Selling-plan data, theme/app labels, or explicit page copy can prove `preorder`; otherwise an ambiguous available/backorder configuration stays `unknown`.

**Likely request cost:** one sitemap index, its product sitemap shards, then approximately one product JSON request per parent. A later stock check can refresh all variants of a parent in that one JSON request when the product has at most 250 variants. This is efficient for the 1,224 seed rows labelled Shopify, but per-store pacing still matters.

**Failure modes:** password-protected stores, geolocation/market redirects, alternate locale paths, products intentionally unavailable to the Online Store sales channel, sitemap mutation during the crawl, 250-variant truncation, theme/app-specific preorder behavior, and access controls. A `404` from the guessed `.js` path is a surface failure to diagnose, not evidence that the product is gone until the canonical page is also checked.

**Certification verdict:** **strong and preferred**, scoped to all products published in the audited public Online Store market, after sitemap closure, successful product resolution, and variant-limit handling.

### WooCommerce

**Surface classification:** documented anonymous Store API when the site exposes the WooCommerce Blocks/Store API routes.

WooCommerce documents the [Store API](https://developer.woocommerce.com/docs/category/store-api) as an unauthenticated, customer-facing interface. List endpoints use `page` and `per_page`; the documented maximum page size is 100, and responses expose `X-WP-Total`, `X-WP-TotalPages`, and pagination links. A 2026 platform change explicitly [removed the old `per_page=0` shortcut](https://developer.woocommerce.com/2026/02/23/restricting-per_page-for-product-and-productreview-store-api-requests-in-woocommerce-10-6/), so complete clients must paginate.

The [Store API products endpoint](https://developer.woocommerce.com/docs/apis/store-api/resources-endpoints/products/) exposes published shopper-facing product data including ID, name, permalink, SKU, descriptions, images, brands/categories/tags where configured, option/attribute data, `is_purchasable`, `is_in_stock`, and low-stock information. Variations are excluded from the default parent response and can be requested as product records with variation type/parent filters. The endpoint also accepts stock-status filters for `instock`, `outofstock`, and `onbackorder`.

**Enumeration and proof of exhaustion**

1. Fetch all published product pages at `per_page=100` until `X-WP-TotalPages` is consumed.
2. Fetch all variation records, globally or per parent, and independently exhaust their page headers.
3. Reconcile unique record IDs against each response’s `X-WP-Total`.
4. Retain parent IDs and each variation’s own ID/SKU/options/permalink relationship.
5. Repeat totals at the end or use a stable ID ordering where supported; page/offset traversal can otherwise duplicate or skip records during concurrent catalog edits.
6. Compare API product URLs with WordPress/product sitemaps when available. An unexplained public product URL outside the API set blocks certification.

**Identification fields:** record ID, parent ID, permalink/slug, SKU, brand extension data, category/tag IDs and names, descriptions, attributes and option labels, images, and normalized names. Store API schema extensions are allowed, so retain unknown brand/catalog fields for later matching.

**Stock:** `is_in_stock` is useful, but WooCommerce core’s stock semantics can treat an on-backorder item as “in stock.” To avoid conflation, build and reconcile the exact-ID sets returned by the three documented `stock_status` filters or obtain an equally explicit exact-variation signal. `outofstock` maps to `out of stock`; `instock` maps to `in stock`; bare `onbackorder` maps to `unknown` unless the retailer explicitly calls the offer a preorder.

**Likely request cost:** approximately `ceil(parents/100) + ceil(variations/100)` for discovery, plus stock-bucket pages if the generic response does not distinguish backorder. Per-parent variation calls can cost more but simplify closure and repair. Stock monitoring should prefer the smallest route that returns exact variation IDs and explicit status on the audited store.

**Failure modes:** old WooCommerce versions, disabled Store API/Blocks routes, security plugins or WAFs, custom product types, store-specific schema extensions, password-protected products, market/currency plugins, and catalog mutation during page-number pagination. A WordPress site is not necessarily a WooCommerce store, and an imported `woocommerce` label must be re-detected.

**Certification verdict:** **strong**, if the public Store API is accessible, parents and variations both close against stable totals, and shopper-visible sitemap/PDP outliers are reconciled. Otherwise fall back to WordPress sitemaps plus PDP/browser audit and keep the result Partial until closure is proven.

### Ecwid and Lightspeed eCom E-Series

**Surface classification:** documented sitemap for qualifying Ecwid Instant Sites; documented token-authenticated REST API; storefront/browser surface otherwise.

Ecwid documents that qualifying Instant Sites automatically publish a [`/sitemap.xml`](https://support.ecwid.com/hc/en-us/articles/360003869899-Submitting-a-sitemap-to-Google) containing storefront, category, and product URLs. The same document warns that embedded stores depend on the host website’s sitemap behavior and specifically notes a Wix integration limitation. Sitemap availability also depends on the Ecwid plan described by that documentation.

The Ecwid REST [Search products](https://docs.ecwid.com/api-reference/rest-api/products/search-products) route is excellent when legitimately available: it returns `total`, `count`, `offset`, and `limit` (up to 100), plus product IDs, SKU, quantities, stock flags, translated names/descriptions, URL, timestamps, product class/options, and combinations. Combination records can carry their own variation ID, options, SKU, image, `inStock`, `quantity`, unlimited-inventory flag, and price. `outOfStockVisibilityBehaviour` can distinguish SHOW, HIDE, and ALLOW_PREORDER behavior.

But Ecwid’s [app settings and access-token documentation](https://docs.ecwid.com/develop-apps/app-settings) states that REST calls are token-based and scopes such as `read_catalog` belong to an installed app. A “public” app token is safe to expose to a browser, but it still exists only because a merchant installed/authorized that app. StockHawk cannot treat arbitrary retailers as having granted it access.

**Enumeration and proof of exhaustion**

- Without a legitimate app token: exhaust the Instant Site/host sitemap, classify every product URL, and audit each PDP/browser payload for complete combinations. Ecwid’s documented storefront category pagination can redirect an out-of-range page to the last page, so “request until empty” is not a reliable proof.
- With an intentionally available public-client token: page product search at `limit=100` until `offset + count >= total`; reconcile unique product IDs to `total`; emit each combination as its own listing; repeat the total after the run.

**Identification fields:** product/variation IDs, SKU, UPC/other custom attributes if exposed, product class, URL, names/translations, descriptions, category/brand metadata, option values, images, and update time.

**Stock:** a parent `inStock` can mean some combination is sellable, so exact combinations control StockHawk listings. Explicit combination `inStock=false` maps to `out of stock`; ALLOW_PREORDER plus a public preorder offer can map to `preorder`; unavailable or missing combination data remains `unknown`.

**Likely request cost:** token route approximately `ceil(products/100)`, because product records can include combinations. Sitemap/PDP route is sitemap shards plus one page/browser extraction per parent. Monitoring can often refresh all combinations from one parent payload.

**Failure modes:** external embeds with incomplete host sitemaps, plan differences, missing app authorization, legacy store versions, intentionally hidden out-of-stock items, translated/market views, storefront JS changes, and browser-only state.

**Certification verdict:** **conditional**. The REST route can support strong certification when its token is legitimately available to StockHawk. Sitemap plus audited combination closure can also certify a specific store. Sitemap alone certifies only parent URL discovery, not separate exact variants.

### Lightspeed X-Series and C-Series

**Surface classification:** secured merchant APIs; public rendered storefront data varies by product line and theme.

Lightspeed’s [X-Series API introduction](https://x-series-api.lightspeedhq.com/docs/introduction) describes secured access on behalf of a retailer, and its product/variant API is not an anonymous crawling interface. The [C-Series eCom API documentation](https://ecom-support.lightspeedhq.com/hc/en-us/articles/220320568-API-documentation) likewise describes merchant-plan/API access. Do not borrow either as a public StockHawk credential.

X-Series [eCommerce theme objects](https://x-series-api.lightspeedhq.com/v2026.01/docs/ecommerce_theme_objects) show that rendered storefront contexts can include product variants, SKU-like fields, availability, inventory quantity, and inventory-tracking state. That is useful evidence for what a public theme may render, not a promise that every live Lightspeed storefront exposes a stable raw endpoint.

**Route:** detect E-Series/Ecwid separately. For X/C stores, use sitemaps/category/PDP and public browser requests during the representative audit. Prove a stable total/end condition and complete variant set on the actual store before certification.

**Stock and cost:** a product page/browser payload may refresh all variants in one request, but theme customization controls whether inventory details exist. Missing or parent-only state is `unknown`. Cost is sitemap/category enumeration plus roughly one PDP per parent unless a live public list endpoint is proven.

**Failure modes:** confusing Lightspeed product lines, merchant API authentication, legacy themes, custom headless storefronts, hidden inventory, and different domains between the marketing site and store.

**Certification verdict:** **store-specific only** unless the site is actually Ecwid/E-Series and meets that route’s closure rules.

### Square Online and Weebly

**Surface classification:** documented public sitemap/page behavior; merchant-authenticated Catalog/Inventory APIs; store-specific browser data.

Square says its sites automatically generate [`/sitemap.xml`](https://squareup.com/us/en/the-bottom-line/starting-your-business/seo-guide-for-business), but that general SEO statement does not promise that every shopper-reachable item and exact variant appears. More importantly, Square documents a [`Direct link only`](https://squareup.com/help/us/en/article/7982-manage-square-online-item-settings-from-your-item-library) item visibility mode: the item is excluded from navigation and site search while remaining publicly purchasable through its direct URL. Category traversal and search therefore cannot, by themselves, prove completeness.

The official [Catalog API](https://developer.squareup.com/docs/catalog-api/what-it-does) and [Inventory API](https://developer.squareup.com/docs/inventory-api/build-with-inventory) require merchant OAuth permissions such as `ITEMS_READ` and `INVENTORY_READ`. The [Square Online API](https://developer.squareup.com/docs/online-api?preview=true) concerns site/snippet management and also requires merchant authorization; it is not an anonymous product feed.

Square documents that item options produce [distinct variations](https://squareup.com/help/us/en/article/6689-item-options) with their own SKU/price behavior. Public item state can be variation-specific [Available or Sold out](https://squareup.com/help/us/en/article/8495-beta-item-availability), and Square Online supports explicit [preorder configuration](https://squareup.com/help/us/en/article/8285-sell-items-as-preorders-with-square-online).

**Enumeration and proof of exhaustion:** consume the sitemap; traverse all store/category pagination; inspect every PDP and same-origin browser request; and test whether a known Direct-link-only item appears in the sitemap/browser catalog surface. Certification requires a store-specific total/end signal plus an explanation for every URL-set difference. If direct-link items are public but omitted from every enumerable surface, platform-wide exhaustive discovery is impossible from outside and the Storefront remains Partial.

**Identification fields:** Square variation IDs if exposed, SKU, GTIN where rendered, URL, option values, category, vendor/brand data, descriptions, images, and normalized name. Admin-only Catalog IDs cannot be assumed present on the public page.

**Stock:** exact public variation Available/Sold out states map directly. An explicit Square Online preorder state maps to `preorder`. Do not infer stock from the presence of a product page or parent card.

**Likely request cost:** sitemap plus category pages plus approximately one item page/browser payload per parent. There is no documented anonymous bulk stock route; a custom browser endpoint may improve this only after an audit proves its semantics.

**Failure modes:** Direct-link-only products, hidden/unavailable items, legacy Weebly themes, restaurant/order-ahead product models, scheduled availability, per-location state, custom domains, and undocumented frontend schema changes.

**Certification verdict:** **not defensible platform-wide** from documented public surfaces. Individual stores may become certifiable through a proven browser catalog endpoint and sitemap reconciliation; otherwise Partial is the correct continuing state, not Blocked.

### Wix Stores

**Surface classification:** documented product sitemap and page structured data; merchant-authenticated external APIs; in-site Velo collections are not generic external APIs.

Wix documents an automatic sitemap index and a dedicated [`/store-products-sitemap.xml`](https://support.wix.com/en/article/understanding-your-sites-sitemap-file). Each entry represents a product page and can include its URL, last-modified date, and images. Wix also states that product pages receive default [Product structured data](https://support.wix.com/en/article/wix-stores-optimizing-your-seo-for-product-pages) and documents variables including SKU, brand, images, price, and [InStock/OutOfStock availability](https://support.wix.com/en/article/using-variables-in-seo-settings). Merchants can customize SEO/structured data, so the default must be validated on the actual page.

Wix’s external product APIs are not anonymous crawler routes. The Products V3 query supports cursor pagination and up to 100 records, but [Wix REST authentication](https://dev.wix.com/docs/build-apps/develop-your-app/api-integrations/rest) requires a site owner to install/authorize an app. Product list queries also do not necessarily return every exact variant without further calls. The Wix Stores Products collection can be readable from the site’s own Velo code, but that in-site runtime permission does not grant an arbitrary external StockHawk process an API credential.

**Enumeration and proof of exhaustion:** recursively exhaust the Wix sitemap index and every store-product sitemap; resolve every PDP; compare canonical URLs; then prove every option combination from embedded state, public browser calls, or UI enumeration. Sitemap closure can strongly support parent-page completeness. It cannot certify separate variants when a PDP or public data surface exposes only the selected/default variant.

**Identification fields:** product URL/slug, structured-data SKU, brand, name, description, images, price, option labels, and any variant IDs/SKUs/GTIN exposed by the live page. Keep merchant-customized structured-data provenance.

**Stock:** use exact variant state from the option UI/browser payload where possible. Parent/default structured-data availability is only parent/default evidence. A missing Offer is `unknown`, not out of stock. Explicit page preorder language can map to `preorder`; Wix has no universal public preorder status that can be assumed across stores.

**Likely request cost:** sitemap index and shards plus about one PDP/browser payload per parent. If one payload contains all option combinations, it refreshes all variants together. `lastmod` can prioritize discovery, not guarantee stock freshness.

**Failure modes:** merchants disabling/customizing structured data, noindex products, custom product routes, multilingual/market views, Wix sites without Wix Stores, app-auth boundaries, and browser schemas that change independently of the visible page.

**Certification verdict:** **conditional**. Parent URL enumeration is good; exact Product certification requires live proof that every PDP’s full variant set is exposed and exhausted.

### Squarespace Commerce

**Surface classification:** documented public sitemap and product pages; merchant-authenticated Commerce APIs.

Squarespace automatically provides [`/sitemap.xml`](https://support.squarespace.com/hc/en-us/articles/206543547-View-your-site-map) and says it includes every page, with updates that may take up to 24 hours. Sitemaps are unavailable for some trial, parking, private, or password-protected sites. Squarespace [product setup](https://support.squarespace.com/hc/en-us/articles/205811338-Adding-products-to-your-store) supports product variants with variant-specific images, pricing, SKU, and stock; current help articles have changed variant limits over time, so the Connector must not hard-code a remembered limit without probing the live product.

The official [Products API](https://developers.squarespace.com/commerce-apis/products) can list products with cursor pagination and exact variants, and the [Inventory API](https://developers.squarespace.com/commerce-apis/inventory-overview) can expose variant stock. But [Commerce API authentication](https://developers.squarespace.com/commerce-apis/authentication-and-permissions) requires a site API key or merchant OAuth grant. Those APIs describe the ideal data model; they are not a public crawler route for arbitrary retailers.

Squarespace documents [variant-specific sold-out behavior](https://support.squarespace.com/hc/en-us/articles/206540657-Sold-out-products). It does not provide a universal built-in backorder facility; a merchant may instead use custom text or workflow.

**Enumeration and proof of exhaustion:** consume the sitemap, classify every Store product URL, traverse public Store pages as an independent check, and resolve every PDP. Certification requires extracting all variant combinations from page-embedded data/browser requests or proving them through the option UI, then reconciling those exact combinations to the page.

**Identification fields:** canonical URL, parent/variant ID where exposed, SKU, GTIN/MPN where publicly rendered, option labels, brand/name/descriptions, images, and normalized product text. Squarespace’s admin supports useful identifiers, but StockHawk must not assume an admin-only field is present on public pages.

**Stock:** exact variant sold-out UI is authoritative public evidence. Parent card/PDP availability cannot be spread across variants. A custom preorder label counts only when it clearly refers to the exact offer.

**Likely request cost:** sitemap plus one product-page/browser request per parent. The sitemap’s possible 24-hour lag makes it a discovery index, never the current stock source.

**Failure modes:** gated/private sites, custom code/templates, stale sitemap additions/removals, variant data loaded lazily, locale/market differences, noindex/disabled products, and undocumented page-state changes.

**Certification verdict:** **conditional** after sitemap closure and live variant closure. The merchant Commerce APIs must not be used without a grant.

### BigCommerce

**Surface classification:** documented public-client storefront GraphQL; merchant/private tokens for server-to-server use; sitemap/page fallback.

BigCommerce’s [GraphQL Storefront API overview](https://docs.bigcommerce.com/developer/docs/storefront/guides/graphql-storefront-api/overview) says storefronts can query catalog data, use cursor pagination with `pageInfo.hasNextPage`, and request up to 50 products in a connection subject to query-complexity limits. Stencil storefront pages receive an automatically generated token. [Authentication documentation](https://docs.bigcommerce.com/developer/docs/storefront/guides/graphql-storefront-api/authentication) calls storefront tokens browser-safe but origin-scoped, rotating in the Stencil context, and distinguishes them from private server-side tokens. As of the documented 2026 policy, newly created public tokens are not a durable server-to-server credential. StockHawk should use a public token only inside its intended same-origin shopper/browser context, never copy a merchant/private token.

The [products query](https://docs.bigcommerce.com/developer/docs/storefront/guides/graphql-storefront-api/products-and-catalog/products) can enumerate merchant-visible storefront products and return entity ID, SKU, path, name, descriptions, brand, categories, UPC, MPN, GTIN, price, options, and other public fields. The [variants connection](https://docs.bigcommerce.com/developer/docs/storefront/guides/graphql-storefront-api/products-and-catalog/variants) exposes exact variant entity IDs, SKU, UPC/MPN, selected options, and pricing; nested connections need independent pagination.

BigCommerce [inventory queries](https://docs.bigcommerce.com/developer/docs/storefront/guides/graphql-storefront-api/inventory/queries) expose `isInStock` and availability-to-sell information. [Inventory settings](https://docs.bigcommerce.com/developer/docs/storefront/guides/graphql-storefront-api/inventory/settings) allow merchants to hide exact quantities and to hide out-of-stock products/options entirely. A hidden OOS record is outside the query result and is a critical certification caveat. Catalyst documents a complete channel-aware [`/sitemap.xml`](https://docs.bigcommerce.com/developer/docs/storefront/catalyst/content-management/sitemap), while legacy/headless storefronts require their own audit.

**Enumeration and proof of exhaustion:** in the legitimate storefront browser context, query all products until product `hasNextPage=false`; for each product, independently page every variants/options connection until its own `hasNextPage=false`; reconcile unique entity IDs; compare product paths to the relevant channel sitemap; and repeat a catalog count or boundary check after the run.

**Identification fields:** product and variant entity IDs, path, SKU, UPC, MPN, GTIN, brand, categories, options, normalized descriptions/names, and images. This is one of the strongest identity surfaces.

**Stock:** exact variant `isInStock` maps to `in stock`/`out of stock` within the merchant’s public inventory settings. Null quantity is not unknown stock if the boolean is explicit; it simply means quantity is hidden. Hidden OOS options/products cannot be represented unless the sitemap/PDP retains them. Preorder requires an explicit platform/page preorder signal, not a generic positive availability boolean.

**Likely request cost:** about `ceil(products/50)`, provided each product has no more than the selected nested-variant page size and the query stays below complexity limits; high-variant products need extra variant-connection calls. A sitemap/PDP fallback costs one page per parent. Stock monitoring can group many variant fields into one GraphQL query, but should be tuned only after measuring the live store’s documented complexity/rate behavior.

**Failure modes:** legacy Blueprint stores without GraphQL, custom headless channels, origin/CORS enforcement, rotating browser token, query-complexity errors, independently paginated nested connections, hidden OOS settings, channel-specific product visibility, and storefront updates during cursor traversal.

**Certification verdict:** **strong, conditional** in a legitimate public-client browser context when all connections and channel URLs reconcile. If the store hides OOS records, certification must explicitly cover only currently shopper-visible records unless a second public surface preserves those listings.

### Adobe Commerce and Magento Open Source

**Surface classification:** documented public storefront GraphQL in common Foundation/PaaS deployments; deployment-specific SaaS Catalog Service; admin REST endpoints are not the chosen route.

Adobe’s [Foundation `products` query](https://developer.adobe.com/commerce/webapi/graphql/schema/products/queries/products) supports search/filter, `pageSize`, `currentPage`, `total_count`, and page information. Results can expose SKU, URL key, categories, custom storefront attributes, and `stock_status`. Configurable products expose [child variants with their own SKUs and option selections](https://developer.adobe.com/commerce/webapi/graphql/schema/products/interfaces/types/configurable). Product pagination is offset-based, and requesting a page greater than the available range returns an error.

Adobe Commerce as a Cloud Service uses a different Catalog Service rather than that Foundation `products` query. Its [variants query](https://developer.adobe.com/commerce/webapi/graphql/schema/catalog-service/queries/product-variants) returns every variation of a product with cursor pagination (default/maximum 100), exact SKU/selection IDs, URL, `inStock`, `lowStock`, and `lastModifiedAt`; a null cursor is the end signal. The Storefront Integration must identify which schema is actually live rather than hard-code one Magento generation.

**Enumeration and proof of exhaustion:** locate the storefront GraphQL endpoint; identify Foundation versus SaaS schema without privileged introspection assumptions; enumerate all public products through a broad storefront-visible filter/root-category strategy; close Foundation pages against `total_count` and `currentPage`, or SaaS cursors to null; expand every configurable/bundle/grouped product; reconcile sitemap product URLs; and repeat totals/boundaries after a long offset crawl.

**Identification fields:** SKU, URL key/canonical URL, product UID/ID where exposed, configurable child SKU, selected option UIDs/labels, categories, manufacturer/brand custom attributes, GTIN/UPC custom attributes, descriptions, images, and normalized names.

**Stock:** exact simple/configurable-child `stock_status` or `inStock` maps directly. Parent stock is only a summary. Adobe supports extensible inventory/backorder behavior, so an explicit preorder label/field is required for `preorder`; otherwise ambiguous backorder is `unknown`.

**Likely request cost:** approximately `ceil(products/pageSize)` when nested child variants fit in each parent response; SaaS products and variants may require separate cursor calls. Actual maximum page size and query complexity are deployment configuration, so audit before selecting batch size.

**Failure modes:** Foundation versus SaaS schema drift, disabled/introspection-limited GraphQL, WAFs, store-view and website visibility, customer-group catalogs, hidden OOS configuration, offset mutation, configurable children omitted by visibility rules, and custom attributes not marked for storefront use.

**Certification verdict:** **strong, conditional** after deployment identification, stable total/cursor closure, child-variant closure, and sitemap/store-view reconciliation.

### GoDaddy Websites + Marketing Commerce

**Surface classification:** documented storefront/admin product semantics, but no documented anonymous catalog enumeration API.

GoDaddy documents product catalog fields including name, description, category, URL slug, SKU, UPC/ISBN/model number, inventory, backorder setting, and sales channels in [Add products to the product catalog](https://www.godaddy.com/help/add-products-to-the-product-catalog-40668). It also documents [product options](https://www.godaddy.com/en-in/help/add-product-options-in-my-online-store-20054) with combination-specific image, SKU, price, sale price, quantity, brand, and manufacturer information. These are valuable clues about what a public page/browser payload may contain; they are not public API guarantees.

GoDaddy’s public [Developer Portal](https://developer.godaddy.com/doc) does not document a Websites + Marketing anonymous product-catalog endpoint. The documented developer APIs concern other GoDaddy services or authenticated account capabilities.

**Enumeration and proof of exhaustion:** during the audit, resolve the actual store host; consume any sitemap; traverse every store/category page and pagination control; resolve every PDP; inspect same-origin storefront XHR/embedded state; and test exact variant closure. Only a live endpoint with a stable total/end signal plus sitemap/category reconciliation can certify that one store.

**Identification fields:** any public product/variant ID, URL slug, SKU, UPC/ISBN/model number, brand/manufacturer, category, option labels, images, descriptions, and normalized name.

**Stock:** exact public variant availability controls the normalized state. Admin support for a quantity/backorder flag does not mean it is exposed publicly. A bare backorder setting is `unknown` unless the public listing explicitly says preorder.

**Likely request cost:** category/sitemap pages plus one PDP/browser payload per parent. An observed bulk XHR may reduce cost, but it remains store-specific and needs schema health checks.

**Failure modes:** custom page layouts, hidden categories/products, marketing-site-to-store redirects, undocumented XHR changes, variant data loaded after interaction, POS versus online channel differences, and no stable total.

**Certification verdict:** **not platform-wide**. Keep stores Partial until the representative/full Storefront Audit proves an enumerable public catalog and all variants.

### NetSuite SuiteCommerce

**Surface classification:** documented anonymous Item Search API.

Oracle documents the [Item Search API](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_N2665337.html) as a REST/JSON search, sort, facet, and pagination interface for Commerce web stores. The [eligible-item rules](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_1520340184.html) explicitly state that the service has no authentication and exposes website item records to public internet traffic. Those rules also explain important exclusions: items must be active, displayed on the website, associated to the relevant subsidiary/account/category rules, numerically priced, and either in stock or allowed to display under the site’s out-of-stock behavior.

The [input-parameter documentation](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_N2665676.html) says the bare `/api/items` route returns all anonymous-visible item IDs; `fields`/`fieldset` add details; `matrixchilditems_fieldset` controls matrix-child details; and `limit`/`offset` paginate with a default limit of 50. Oracle explicitly warns that the API is not designed for deep pagination. Facets/categories, account/site identifiers, stable sorting, and item-ID lookups can partition or repair a crawl. Oracle also warns that live stock fields are [more expensive than static fields](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_163829940588.html), especially when matrix children multiply them.

**Enumeration and proof of exhaustion:** first retrieve a lightweight complete ID view. For large catalogs, partition by non-overlapping public category/facet or ID buckets rather than depend on a very deep offset scan; record each partition’s count/boundary; union and deduplicate IDs; then batch/detail those IDs with a minimal field set and matrix-child field set. Reconcile the union to the unfiltered result metadata/ID set and sitemap product URLs. Re-run partition counts after a long crawl.

**Identification fields:** internal item ID, URL component, item ID/SKU, UPC code or ISBN/MPN fields included by the site’s field set, matrix-child IDs/options, manufacturer/brand custom fields, categories/facets, names/descriptions, images, and locale.

**Stock:** request exact matrix-child/public inventory fields only in the monitoring/detail pass. Map an explicit exact-child public availability to `in stock`/`out of stock`. If the site hides out-of-stock items, disappearance is a public-visibility transition but not enough to reconstruct a never-seen hidden item. Personalized catalog view parameters are admin/recognized-user behavior and are out of scope for anonymous V1.

**Likely request cost:** roughly `ceil(items/50)` lightweight ID pages by default, preferably divided into shallow partitions, followed by batched detail requests. Requesting every expensive live-stock field on the discovery list can be much slower; separate discovery identity fields from targeted exact-item stock monitoring.

**Failure modes:** deep-pagination behavior, customized field sets omitting identity/stock, matrix-child expansion cost, anonymous OOS hiding, search-index delay, store/subsidiary/currency/locale parameters, mutation during offsets, and custom SuiteCommerce implementations.

**Certification verdict:** **strong but conditional**. It can certify the anonymous shopper-visible catalog when shallow partitions, IDs, matrix children, and URLs reconcile. The certificate must disclose any configured omission of out-of-stock items.

### Miva

**Surface classification:** documented anonymous Runtime JSON API; authenticated administrative JSON API is separate.

Miva explicitly documents [`Runtime_ProductList_Load_Query`](https://docs.miva.com/developer/developer-resources/json-api/functions/runtime_productlist_load_query/) as a public client-side function requiring no API key (`session_type: runtime`). It supports `count`, `offset`, sorting/filtering, a `total_count` response, stable product IDs/codes/SKUs, canonical URLs, descriptions, categories, images, attributes/options, timestamps, and on-demand inventory fields. Inventory can expose `inv_level` (In Stock, Low Stock, Out of Stock), available/in-stock quantities, tracking flags, and public messages. A `variant_id` filter makes pricing, inventory, discounts, and images variant-specific.

Do not confuse it with authenticated [`ProductList_Load_Query`](https://docs.miva.com/developer/developer-resources/json-api/functions/productlist_load_query/) or the broader JSON API. [Miva’s API authentication guide](https://docs.miva.com/developer/developer-resources/json-api/api-getting-started/) requires an admin-created access token, signing controls, and often an IP allowlist for non-runtime functions.

**Enumeration and proof of exhaustion:** call the runtime product list with a stable code/ID sort and minimal discovery columns; paginate `count`/`offset` until the final page; reconcile unique IDs to `total_count`; retrieve attributes/options; generate/follow the exact variant identifiers exposed by the runtime data; call the variant filter where needed to obtain variant-specific SKU/inventory; and repeat `total_count` after the run.

**Identification fields:** numeric ID, unique product code, SKU, canonical URL, categories/custom fields, descriptions, attribute/option values, images, updated timestamp, and variant-specific values.

**Stock:** exact runtime variant inventory is one of the best public long-tail signals. Map `In Stock`/`Low Stock` to `in stock`, `Out of Stock` to `out of stock`, and explicit public preorder text/config to `preorder`. If inventory tracking is disabled or no exact variant state is exposed, use `unknown` rather than assume unlimited stock.

**Likely request cost:** about `ceil(total_count/count)` product pages plus variant-specific calls for products whose base response does not close exact inventory. A minimal first pass and targeted inventory fields avoid the cost of large descriptions/images on every monitoring run.

**Failure modes:** older Miva versions, alternate JSON endpoint folders, runtime function disabled/customized, mutation during offset paging, generated option combinations versus real variants, and a documented edge where master-level OOS visibility can hide a product even when a variant is in stock.

**Certification verdict:** **strongest documented long-tail route**, after stable total reconciliation and exact variant closure.

### Volusion

**Surface classification:** optional documented public All Products XML feed; otherwise public sitemap/category/PDP traversal.

Volusion documents a merchant-enabled [All Products XML export](https://help.volusion.com/s/allfeaturedproductsexportwithvolusionapi) containing products, categories, options, product codes, stock status, and availability. Volusion also documents that option combinations can become child products with distinct product codes and independent inventory through the [Inventory Control Grid](https://help.volusion.com/s/HowtoUsetheInventoryControlGrid?hsLang=en-us). This is materially stronger than scraping a category page, but the feed is optional and refreshes only once daily around midnight Central.

**Enumeration and proof of exhaustion:** when enabled, consume the complete feed, expand every child/option combination, reconcile unique product codes, and compare the feed URLs/codes with the public sitemap and categories. Without the feed, traverse every sitemap/category/PDP and exact option combination; HTML-only results remain Partial unless the live audit finds a stable count/end signal.

**Identification fields:** product and child product code, SKU/UPC where published, category, option labels, name/description, image, canonical URL, and public manufacturer/brand text.

**Stock:** the feed's stock and availability are discovery evidence, not a fast current-stock source because of its daily refresh. Refresh known Jellycat PDPs/child states for current monitoring. Volusion can [hide out-of-stock products](https://help.volusion.com/s/howtousethehidewhenoutofstockoption), so disappearance cannot reconstruct an item StockHawk never observed.

**Likely request cost:** one feed request for discovery, then roughly one PDP/child request per known Jellycat parent for current stock. Without the feed, cost approaches sitemap/category pages plus one PDP per parent.

**Failure modes:** feed disabled, daily inventory lag, hidden OOS products, option combinations not emitted as child products, customized templates, and inconsistent feed/PDP visibility.

**Certification verdict:** **strong when the optional feed is enabled and variant-complete; otherwise conditional or Partial**.

### Webflow Ecommerce

**Surface classification:** documented public sitemap and storefront pages; merchant-authenticated Data API.

Webflow documents that a published site can generate a [sitemap that updates on publish](https://help.webflow.com/hc/en-us/articles/33961355371667-Create-a-sitemap-in-Webflow). The complete [List Products API](https://developers.webflow.com/data/reference/ecommerce/products/list) requires a merchant bearer token, so it is not a public crawler route. Webflow documents [product variants](https://help.webflow.com/hc/en-us/articles/33961334531347-Create-product-options-and-variants) as distinct option combinations. It also documents that Collection pagination can show up to 100 items per page and that [site search indexes only the first Collection page](https://help.webflow.com/hc/en-us/articles/33961307617683-Paginate-Collection-lists), which makes search an especially unsafe completeness method.

**Enumeration and proof of exhaustion:** recursively consume the published sitemap, classify every Ecommerce product URL, resolve every PDP, expand all public option combinations from page/browser state, and reconcile against every Store/Collection page. Certification requires those sets to agree; a curated Collection or search result is never enough.

**Identification fields:** product/variant IDs where exposed, canonical URL, SKU, option values, public brand/manufacturer text, categories, descriptions, images, and normalized name.

**Stock:** use exact variant/PDP sold-out or availability state. The authenticated Data API's inventory model cannot be assumed present publicly. Custom preorder copy counts only when it clearly applies to the exact variant.

**Likely request cost:** sitemap plus approximately one PDP/browser payload per parent, unless a live storefront payload safely batches multiple products or variants.

**Failure modes:** manually disabled sitemap, stale-until-publish URLs, filtered/limited Collections, custom templates, lazy variant data, and undocumented page-state changes.

**Certification verdict:** **conditional**, after sitemap, PDP, variant, and Collection reconciliation.

### nopCommerce

**Surface classification:** public sitemap/category/manufacturer/PDP surfaces; the official Web API is an authenticated plugin.

nopCommerce documents its [Web API](https://docs.nopcommerce.com/en/developer/web-api/index.html) as an installed plugin using JWT authentication, not a universal shopper API. Public catalog behavior is highly configurable: [catalog settings](https://docs.nopcommerce.com/en/running-your-store/catalog/catalog-settings.html) control SKU, GTIN, MPN, availability, out-of-stock attributes, manufacturers, and paging; [product configuration](https://docs.nopcommerce.com/en/running-your-store/catalog/products/add-products.html) supports unpublished, ACL-limited, grouped, and non-individually-visible products; and [inventory management](https://docs.nopcommerce.com/en/running-your-store/order-management/inventory-management.html) can track stock by attribute combination with backorder behavior. The platform supports a public sitemap configured through its [robots settings](https://docs.nopcommerce.com/en/getting-started/advanced-configuration/robots-txt.html).

**Enumeration and proof of exhaustion:** consume the sitemap, exhaust categories and manufacturers with their advertised paging, resolve grouped products and children, and enumerate every attribute combination on every PDP. Reconcile URL and unique-product sets across those surfaces. Custom themes/plugins mean no one HTML shape is a platform contract.

**Identification fields:** product/child identity, SKU, GTIN, MPN, manufacturer, categories, option attributes, canonical URL, descriptions, images, and normalized name.

**Stock:** use explicit exact-child or attribute-combination availability/backorder text. A parent's stock state must not be copied to children, and bare backorder permission is `unknown` unless the listing explicitly says preorder.

**Likely request cost:** sitemap/category pages plus one PDP per grouped/simple parent; stores exposing all combinations in one page payload are cheaper than interaction-driven themes.

**Failure modes:** custom themes/plugins, unpublished or ACL products, non-individually-visible grouped children, merchant-hidden OOS attributes, configurable paging, and authenticated API confusion.

**Certification verdict:** **conditional and Storefront-specific** after cross-surface and exact-combination closure.

### Solidus

**Surface classification:** optional documented public GraphQL extension; otherwise an application-specific storefront.

The team-supported [`solidus_graphql_api`](https://guides.solidus.io/4.5/cookbook/using-the-graphql-api/) extension can expose public catalog queries at `/graphql` without authentication for the initial shopper catalog. Products and nested variants use cursor pagination with `hasNextPage`/`endCursor`; both connections must be exhausted independently. Solidus's [stock and fulfillment](https://guides.solidus.io/advanced-solidus/stock-and-fulfillment/) behavior is deliberately customizable. The older REST API is authenticated and should not be mistaken for the optional public GraphQL surface.

**Enumeration and proof of exhaustion:** detect whether the extension is installed, page the product connection to `hasNextPage=false`, independently close every nested variant connection, reconcile unique IDs/URLs with the sitemap, and verify the actual schema's stock fields. Without the extension, follow the generic sitemap/category/PDP/browser audit.

**Identification fields:** product and variant IDs, slug/canonical URL, SKU, selected options, public taxonomy/brand fields, descriptions, images, and normalized name.

**Stock:** map only explicit exact-variant public stock. Because applications can customize stock locations, backorders, and availability, schema presence alone is insufficient; retain the observed field and meaning.

**Likely request cost:** roughly one request per product cursor page plus extra nested-variant pages; application-specific storefronts may require one PDP per parent.

**Failure modes:** extension absent, customized schema, independently paginated variants, application-specific authorization, and custom stock semantics.

**Certification verdict:** **strong when the public extension and required schema are present; otherwise Storefront-specific**.

### IndieCommerce

**Surface classification:** public retailer merchandise/search/PDP pages with no documented exhaustive merchandise export.

IndieCommerce 2 describes a shared database of roughly 12–13 million book records in its [feature overview](https://indiecommerce.com/indiecommerce-2-features). That shared title catalog is not the retailer's offer inventory and must never be counted as products sold by the store. Retailers can restrict category browsing in [site settings](https://indiecommerce.com/help-center/site-settings), while [book variations](https://indiecommerce.com/help-center/book-variations) can have distinct custom SKUs and stock. IndieCommerce release notes distinguish Website Stock from POS Stock.

**Enumeration and proof of exhaustion:** audit retailer-specific merchandise pages, their pagination and any stable totals, PDPs, and browser requests. Searches over the shared book catalog cannot certify retailer inventory. A store remains Partial unless its live merchandise surface exposes a bounded, reconciled set of actual retailer offers.

**Identification fields:** retailer merchandise SKU, ISBN/UPC when applicable, canonical URL, variation values, store category, public brand/manufacturer text, descriptions, images, and normalized name.

**Stock:** use Website Stock/exact variation availability shown to the shopper. Do not substitute POS Stock or a shared-title record for a public online Offer.

**Likely request cost:** merchandise browse/search pages plus one PDP per candidate; cost and closure are Storefront-specific.

**Failure modes:** enormous shared-catalog false positives, restricted browsing categories, divergent POS/website stock, bookstore-oriented search semantics, and no public merchandise total.

**Certification verdict:** **not platform-wide**; only a proven Storefront-specific offer surface can certify.

### Bookmanager

**Surface classification:** documented keyed lookup API plus an observed, undocumented anonymous Webstore customer API.

Bookmanager's documented [Shop Local API](https://bookmanager.com/public/api/) requires a key and is a lookup/location interface rather than a public complete-catalog export. Bookmanager states that its [Webstore](https://cdn1.bookmanager.com/i/tbm/www/Software) synchronizes store inventory and supports non-book merchandise. On Bookmanager-owned Mosaic Books, the first-party storefront [JavaScript bundle](https://cdn1.bookmanager.com/shop/static/js/main.0b072a08.chunk.js) exposes anonymous customer calls including `session/get`, `store/getSettings`, `browse/get`, and `title/getItem`.

**Observed enumeration behavior:** `browse/get` accepts offset/limit and returns `row_count`, `max_offset`, and rows. A public Mosaic query restricted to “What's in store” and non-books returned 5,120 rows; a limit of 100 worked, implying about 52 enumeration requests. Rows expose opaque item identity, ISBN/UPC-like values, price, store class, availability, and on-hand information.

**Proof and limitation:** stable offset closure against `row_count`/`max_offset` can strongly prove current in-store records for that filter. An unrestricted Jellycat keyword query also searches Bookmanager's much larger shared Titlelink catalog, so it does not prove offers at that retailer. No filter was proven to enumerate every historically loaded or out-of-stock store listing.

**Identification fields:** observed item ID, ISBN/UPC-like identifier, store class/category, price, public availability/on-hand state, canonical detail route, description, image, and normalized name.

**Stock:** exact observed on-hand/availability can support current `in stock`/`out of stock` mapping when the store/filter semantics are verified. A shared catalog record without store availability is not an Offer.

**Likely request cost:** roughly `ceil(row_count/100)` browse requests plus detail calls where rows omit exact variant fields.

**Failure modes:** undocumented schema drift, shared-title false positives, missing OOS/history filter, different Webstore generations, and store-specific settings.

**Certification verdict:** **strong for a proven current in-store inventory filter, but Partial for the complete public historical/OOS offer catalog**.

## How the 38 imported labels route after research

The cleaned workbook's 38 Legacy Connector Labels are not 38 trustworthy Connector contracts. They now route into three audit buckets:

- **Reusable platform hints:** `shopify`, `woocommerce`, `lightspeed`, `square`, `wix`, `squarespace`, `bigcommerce`, `magento`, `godaddy`, `indiecommerce`, `bookmanager`, `suitecommerce`, `miva`, `nopcommerce`, `solidus`, `volusion`, and `webflowcommerce`. The audit must still redetect the live platform and capability surface.
- **Legacy hosted-vendor hints without a proven universal public contract:** `aspxstorefront`, `celerant`, `eflorist`, `emeraldcityflorist`, `flowermanager`, `fsn`, `hanafloristpos`, `lovingly`, `myshoplocal`, `sparksflorist`, and `specialtytoysnetwork`. Route these through live platform detection, then either reuse a proven platform Adapter or retain a Storefront-specific sitemap/PDP/browser integration.
- **Retailer/site-specific hints:** `babyfurnitureplus`, `bloomingdales`, `crateandbarrel`, `jellycat`, `leighsbooks`, `mitchells`, `nordstrom`, `uncharted`, and `vonmaur`. These name a retailer or one prior extraction, not a reusable platform boundary. Physical-location rows must first resolve to the actual commerce Storefront.

The remaining label, `unsupported`, means only “the old implementation did not handle this.” It supplies no evidence about the current Storefront, platform, products, or access state.

## Representative residential-IP observations

These observations were made from the local Mac on 2026-07-18 PDT with the reproducible [`probe-storefront-surfaces.mjs`](probe-storefront-surfaces.mjs). The probe used an honest StockHawk research user agent, at most two concurrent Storefronts, 15-second timeouts, and three to five public GETs per target. It used no login, cookies, forms, cart, checkout, CAPTCHA solving, or access-control evasion. A real public browser was used only to determine whether a normal shopper browser could load the official Jellycat site after the honest direct client received a challenge.

| Imported hint / Storefront | Direct observation | What it proves |
|---|---|---|
| Shopify / Paper Luxe | Root sitemap exposed three product shards; the first contained 2,497 product URLs. Public product JSON exposed variants, SKU, barcode, vendor, tags, and availability. | Platform sitemap plus per-parent JSON can close parents and variants; shards must all be consumed. |
| Shopify / Paper Luxe “Sky Dragon” | Title was only `Sky Dragon`; public JSON still exposed vendor `Jellycat`, SKU `SKY2DD`, Jellycat/tag evidence, `available: true`, and quantity 9. | Brand-in-title filtering would miss real products; vendor, identifiers, metadata, and variants solve it. |
| WooCommerce / Creative Interiors | Product sitemap contained 730 product URLs and the Store API independently reported `X-WP-Total: 730`. `Amuseables Philippe Palmier` omitted Jellycat in its title but exposed brand/category Jellycat, SKU `A6PAL`, `is_in_stock: true`, and “11 in stock.” | Independent URL/count agreement is viable certification evidence, and the Store API is both discovery- and stock-efficient. |
| Ecwid/Lightspeed / Oh Baby | Public sitemap listed 7,506 product-shaped URLs, including distinct character/size routes such as `Bartholomew-Bear-Medium`. | Sitemap closure is cheap parent discovery; exact fields/stock still require legitimate storefront data or PDP closure. |
| Square Online / Nature Company of Salado | Sitemap listed 128 product routes. A product title omitted Jellycat, while page state exposed a `Jellycat NatCo Collection` category. | Sitemap/category metadata can find title-omitting candidates, but no platform-wide variant/end contract was proven. |
| Wix / Magpie Blossoms versus Touch of Grayce | Both detected as Wix. Magpie's product sitemap listed 2,505 URLs; Touch of Grayce exposed no Store product sitemap. | Same platform does not imply the Store module or same completeness capability is present. |
| BigCommerce / Baby Crossing | Legacy `/xmlsitemap.php` index exposed a product shard with 380 product URLs. | BigCommerce generations need live route detection; the sitemap is a useful fallback when GraphQL context is unavailable. |
| GoDaddy / Little Things Toy Store | `sitemap.ols.xml` exposed 124 product-shaped routes among 170 URLs. | Product URL discovery can be bounded, but variant and stock closure remain Storefront-specific. |
| SuiteCommerce / Henry Bear's Park | A location-page seed resolved on the commerce host; its sitemap child exposed 3,720 URLs. | Location rows can lead to one shared Storefront, and the sitemap can independently reconcile the Item Search API. |
| Bookmanager / Merritt Bookstore | `sitemap.txt` exposed 2,501 public URLs. | Sitemaps can be plain text and are useful cross-checks, but shared title search still is not store inventory. |
| Miva / Borsheims and nopCommerce / Fairytales | The first 1.5 MB captured 8,051 and 9,504 sitemap URLs respectively before the probe's safety cap. | Production discovery must stream large sitemaps and rely on platform totals/cursors instead of fixed body caps. |
| Webflow / Connors Mercantile | Sitemap exposed only 17 product routes, including one generic `/product/jellycat` route. | A brand landing/product route does not enumerate exact Jellycat items or variants by itself. |
| Official Jellycat US | Honest direct HTTP requests received a 403 challenge, while a normal local browser loaded Shop All. At observation time its public filters showed 344 in-stock and 382 out-of-stock records plus ordinary pagination. A product family page exposed six selectable styles, a public SKU, and explicit “Notify me when available.” | Browser fallback can recover shopper-visible data without bypassing a challenge, but it is more expensive and still needs pagination/variant proof. |

The observations also found Storefront-specific health failures rather than platform verdicts: one Lightspeed-hinted store failed TLS negotiation, one Squarespace-hinted domain had a certificate-host mismatch, and two Magento-hinted stores returned access challenges. An imported Magento example, City Chemist, now detected as Squarespace and exposed only five non-product sitemap URLs. These cases prove that the live Storefront and capabilities must be redetected; imported labels cannot select a Connector by themselves.

## V1 architecture conclusion

Use a capability ladder, not a title search and not a one-label/one-scraper switch:

1. Prefer a documented anonymous interface with a count, cursor, or total-pages signal.
2. Otherwise use a legitimate documented public-client interface inside its browser/origin boundary.
3. Otherwise combine a platform-generated complete product sitemap with every parent PDP/public product payload and exact variant closure.
4. Otherwise certify only a Storefront-specific observed browser endpoint after its total/end behavior, URL reconciliation, and schema fingerprint are proven.
5. Search, a Jellycat category/collection, retailer navigation, or JSON-LD on already-known pages can find candidates but can never certify a catalog alone. Such results remain Partial and keep looping through alternative surfaces.

Catalog Discovery and Stock Monitoring should exploit different request shapes. Bulk APIs that already include exact stock can refresh many listings per request. Sitemap/PDP families should diff the cheap parent index for new products, then refresh only known Jellycat parents for stock; one parent response should update all of its exact variants. Periodic full discovery remains mandatory, so a newly published Jellycat product can enter as a provisional candidate without the user adding it to a manual list.

A real browser is an allowed public fallback for initial audit, repair, and stores whose ordinary shopper catalog cannot be reached by the honest direct client. It should not be the default high-frequency stock path. The Connector and scheduler design must measure it separately, keep global and per-Storefront pacing, and prefer a cheaper public payload whenever the same evidence is available.

Every result must preserve identifiers and metadata beyond title—retailer product/variant ID, canonical URL, vendor/brand, SKU/manufacturer code, GTIN/UPC/barcode, categories, tags, option values, descriptions, and images—so unknown products remain visible provisional candidates. Exact variants become separate listings. Stock normalizes only to `in stock`, `out of stock`, `preorder`, or `unknown`; no cart, checkout, shipping, pickup, or purchase-eligibility requests are required.
