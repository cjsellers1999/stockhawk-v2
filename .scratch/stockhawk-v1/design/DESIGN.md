# StockHawk V1 locked design

Status: owner-approved and locked

Accepted source SHA-256: `1b03f2a6bbe5b0d4cad972901c100057b658c1375540a283f2f90821a85cb23a`

Canonical visual artifact: [stockhawk-v1-design-prototype.html](stockhawk-v1-design-prototype.html)

## Authority

The canonical HTML artifact is the V1 visual and interaction baseline. Its shell, hierarchy, colors, typography, density, spacing, borders, radii, semantic tones, responsive behavior, Search composition, and Health composition are accepted—not disposable styling. Production must reproduce it faithfully with React, TanStack Router, TanStack Query, and TanStack Table.

The artifact's sample retailer names, counts, statuses, page numbers, placeholder links, in-memory filtering, hash navigation, and demo JavaScript are illustrative only. Production behavior remains governed by the Implementation Spec and domain decisions: server-side search and keyset pagination, URL-persistent state, real images and safe fallbacks, exact retailer handoff, Zod-validated contracts, and enforced optimistic commands with authoritative reconciliation.

If this document and the HTML differ visually, the HTML wins. If sample data or demo behavior conflicts with the domain model or Implementation Spec, the domain model and Spec win. Deliberate visual changes require owner approval and a new recorded artifact hash.

## Application shell

- Desktop uses a full-height `224px` left sidebar, `62px` brand row, `62px` top bar, and centered content capped at `1500px` with `24px` padding.
- The sidebar contains the StockHawk bird mark, Search and Health navigation, and the private-owner/V1 footer. The active destination uses the subtle accent surface.
- The top bar stays quiet: worker state plus the theme control, right aligned.
- Search is the default destination. Health is a separate destination, not a dashboard inserted into Search.
- Desktop pages use one clear `24px` page title, a short muted explanation, and only the page-level action or count needed by that page.
- Use restrained bordered surfaces. Offers remain table rows; never introduce a card per Offer. Storefront health remains a linear list inside one surface; never introduce a card per Storefront.

## Visual tokens

The implementation must start from these tokens. Token names may change; rendered values may not change without owner approval.

| Token | Light | Dark |
| --- | --- | --- |
| Background | `#ffffff` | `#0a0a0a` |
| Foreground | `#0a0a0a` | `#fafafa` |
| Card | `#ffffff` | `#0f0f0f` |
| Primary | `#171717` | `#fafafa` |
| Primary foreground | `#fafafa` | `#171717` |
| Secondary/muted | `#f5f5f5` | `#262626` / `#1d1d1d` |
| Muted foreground | `#737373` | `#a3a3a3` |
| Border/input | `#e5e5e5` | `#292929` / `#333333` |
| Sidebar | `#fafafa` | `#111111` |
| Success | `#dcfce7` / `#166534` | `#12351f` / `#86efac` |
| Warning | `#fef3c7` / `#92400e` | `#3a2a0b` / `#fcd34d` |
| Danger | `#fee2e2` / `#991b1b` | `#3f1515` / `#fca5a5` |
| Information | `#dbeafe` / `#1e40af` | `#142a4c` / `#93c5fd` |
| Shadow | `0 1px 2px rgb(0 0 0 / .06)` | `0 1px 2px rgb(0 0 0 / .3)` |

- Typography is `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`, normally `14px/1.45`.
- Borders are `1px`; controls use `5–7px` radii; warning/toast surfaces use `8px`; major table/panel surfaces use `12px`.
- Normal buttons are `36px` tall; small buttons are `32px`; table cells use `11px 12px`; thumbnails are `42px` square with a `7px` radius.
- Icons are restrained `16px` two-stroke line icons; the brand mark is `24px`.
- Focus-visible controls use a `2px` ring with `2px` offset. Hover states remain subtle.

## Search page

The page structure and order are fixed:

1. `Search offers` title, purchase-handoff explanation, and total Offer count.
2. A conditional amber Collection Degradation Warning with a Health link. It is absent during normal operation.
3. One chip-producing match-any input spanning Product/title aliases, retailer name, and site URL; beside it, a `Flat` / `By Storefront` segmented control.
4. Compact Stock, Match, and Freshness filters; result count and `freshest first` ordering summary.
5. One bordered, horizontally scrollable Offer table and one pagination footer.

The Offer table column order is fixed:

1. `Retailer listing`: `42px` image, preserved retailer title, then muted canonical Product/variant explanation.
2. `Storefront`: retailer name and hostname.
3. `Stock`: semantic badge for in stock, out of stock, preorder, or unknown.
4. `Match`: Confirmed or Provisional plus Partial where applicable.
5. `Last checked`: age plus freshness goal, overdue explanation, or recovery state.
6. Exact retailer action: `Buy` for a trustworthy in-stock Offer; otherwise `View`, both with an external-link icon.

Retailer images fill the thumbnail when trustworthy. An exact official image may supply the accepted fallback; otherwise use the neutral package placeholder shown in the artifact. Missing media never hides a row or affects Health.

Flat mode shows individual Offers. By Storefront mode uses full-width muted group rows with Storefront name, matching Offer count, and Partial badge when applicable; it does not replace the table with cards or an inspector. Pagination uses visible previous, page-number, and next controls in the table footer.

## Health page

The page structure and order are fixed:

1. `Health` title, buying-impact explanation, and Refresh action.
2. Four compact summary cards: Monitoring coverage, Restock freshness, Catalog coverage, and Repair required.
3. A segmented Health filter and `Ordered by owner impact` summary.
4. A main Storefront list and a narrower operational side panel.

Each Storefront row shows:

- Storefront name, derived Healthy/Auto-recovering/Repair required/Partial badge, hostname, platform Integration and version, and impact or Offer-count badge;
- five independent facts in this order: Access, Catalog, Monitoring, Freshness, Lifecycle;
- a progress bar only when it communicates bounded progress;
- only applicable optimistic commands such as Retry, Re-audit, or Run discovery.

The operational side panel contains Rollout coverage, Status meanings, and Throughput & backlog. Domain-required filters or states not present in the sample—such as Dormant and Dead—use the same compact segmented/filter and badge language; they do not introduce a new layout.

## Responsive contract

- At `1050px` and below, the Health side panel moves beneath the Storefront list and becomes two columns; Health facts become three columns.
- At `760px` and below, the desktop sidebar becomes a `58px` sticky top rail with brand, Search, Health, and theme icons; the desktop top bar disappears. Content uses `18px 14px`, filters stack, summary cards become two columns, and Health facts become two columns.
- At `430px` and below, the brand wordmark hides, summary cards become one column, page actions may collapse to icons, and the warning's secondary button may hide while its meaning remains available.
- Tables retain their linear semantics and scroll horizontally when necessary. Responsive behavior must never silently drop a required fact or action.

## Interaction and accessibility contract

- Light and dark themes are both first-class and preserve the accepted token relationships.
- Navigation, chip editing, filters, view mode, sorting, and pagination are URL-backed in production and survive refresh/back/forward.
- Every true mutation remains optimistic through the one shared command boundary. Immediate UI may say `Queued`; it may not fabricate healthy, certified, discovered, or stock outcomes.
- Optimistic actions use the artifact's compact status toast pattern with `role="status"`/polite announcement, then reconcile authoritative state.
- Use semantic headings, landmarks, labels, buttons, links, tables, and status announcements. Meet the existing WCAG 2.2 AA verification contract in both themes and at responsive widths.

## Production acceptance

- Build visual-regression baselines from the canonical artifact at representative desktop, tablet, and mobile widths in both themes.
- Compare Search flat, Search grouped, material degradation, Health healthy, Health attention, empty, loading, and long-content states.
- Test real retailer images, missing images, long translated titles, long hostnames, large counts, every Stock/Match/Health badge, keyboard focus, zoom/reflow, and horizontal table overflow.
- Do not ship the old prototype variant selector, side inspector, Storefront outline, demo counts, fake retailers, `example.com` links, or hash-only demo routing.
