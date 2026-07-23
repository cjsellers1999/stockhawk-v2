# Prototype the search and Health Page experience

Type: prototype
Label: wayfinder:prototype
Status: resolved
Triage: ready-for-human
Blocked by: 05, 07

## Question

What final V1 interaction and information hierarchy best supports the morning shopping workflow and site remediation? Prototype the chosen flat Offer list with retailer-provided image thumbnails when available and a neutral missing-image placeholder, one URL-persistent match-any chip input across Product title/retailer/site URL, Stock Status filters, Storefront-grouped view, explicit pagination, retailer handoff, timestamps, Partial warnings, and dedicated Health Page using realistic high-volume and failure-state data. Missing images must never affect health or product visibility.

## Upstream decisions

- Offer thumbnails prefer the Retailer Listing's primary image, fall back to an official Jellycat image only for an exact Catalog Match, then use a neutral placeholder. Ambiguous or variant-unknown listings never receive a potentially wrong official image; image availability never affects health, visibility, or stock.
- Owner rejected card-per-result layouts. Search is a dense linear table; Health is a dense linear Storefront fact list. Both use light and dark modes, with restrained summary and containing surfaces only where the locked design shows them.
- Use exact-pinned latest TanStack Table v9 beta for table row models and exact-pinned stable TanStack Query v5 for server state. Every true UI mutation must be optimistic through an enforced shared boundary with immediate cache update, rollback on failure, and authoritative reconciliation.
- Implement the locked artifact with Tailwind CSS v4 and locally owned shadcn/ui `base-nova` components backed by Base UI. shadcn defaults and external brand tokens must not alter StockHawk's accepted appearance.
- Optimistic state represents only truth already established by the owner's action—for example, a retry command becomes `Queued` immediately. It must never claim unverified Storefront health, stock, certification, or crawl success.

## Design assets

- [Search and Health table prototype](../prototypes/search-health-experience/README.md) — Historical React/Vite behavior prototype built on Table v8; it does not select the production Table version or visual system.
- [Locked owner design](../design/DESIGN.md) — Accepted V1 visual and interaction contract, with the owner-supplied HTML preserved verbatim at SHA-256 `1b03f2a6bbe5b0d4cad972901c100057b658c1375540a283f2f90821a85cb23a`.

## Answer

Use the [locked owner design](../design/DESIGN.md) as V1's visual and interaction baseline. It instantiates the accepted Compact-ledger direction with the exact shell, light/dark tokens, typography, spacing, density, responsive breakpoints, Search composition, Health composition, badges, tables, panels, and controls recorded in the canonical HTML.

Do not use the old side inspector, Storefront outline, card-per-Offer layout, or variant selector. The earlier React prototype remains behavior and TanStack prior art only; its styling is superseded. The locked HTML's fake data, hash navigation, in-memory filtering, and demo actions are not production architecture. Production preserves the accepted server-side/URL behavior, TanStack Table/Query boundary, and optimistic-mutation policy while matching the locked appearance. Deliberate visual changes require owner approval and a newly recorded artifact hash.
