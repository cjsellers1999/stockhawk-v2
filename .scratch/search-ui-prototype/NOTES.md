# StockHawk search prototype verdict

## Question

How should Jellycat search results be presented for daily manual shopping?

## Decisions

- Default to a flat, paginated list of individual Offers.
- Use one search input that turns comma- or Enter-separated searches into chips.
- Match every chip against Product title, retailer name, and site URL.
- Combine chips with “match any” semantics.
- Encode search chips in the URL so refreshes and shared links preserve them.
- Provide a second store-grouped view that shows the retailer followed by its matching Offers.
- Flat view paginates individual Offers.
- Store-grouped view paginates Storefronts and shows all matching Offers beneath each Storefront.
- Use visible Previous/Next and page-number controls rather than infinite scrolling.
- Encode view mode, Stock Status, and page number in the URL alongside search chips.
- Search both confirmed Offers and Provisional Candidates through the same chip input.
- Default Match Status to `All potential Jellycats`, with `Confirmed only` and `Provisional only` filters.
- Mark Provisional Candidates as `Possible Jellycat` and expose why the match is unresolved plus the evidence already collected.
- Keep manual retailer-page opening as the purchase handoff.

## Open question

- Define Store identity for grouping when workbook rows share a retailer name or hostname but represent duplicate configurations or physical location pages.
