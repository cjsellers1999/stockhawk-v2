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
- Owner rejected card-heavy layouts. The V1 interaction must be linear and table-first, with light and dark modes.
- Use TanStack Table for table row models and TanStack Query for server state. Every true UI mutation must be optimistic through an enforced shared boundary with immediate cache update, rollback on failure, and authoritative reconciliation.
- Optimistic state represents only truth already established by the owner's action—for example, a retry command becomes `Queued` immediately. It must never claim unverified Storefront health, stock, certification, or crawl success.

## Prototype asset

- [Search and Health table prototype](../prototypes/search-health-experience/README.md) — React/Vite prototype with three linear TanStack Table directions, light/dark mode, TanStack Query data, optimistic command behavior, rollback tests, direct-mutation enforcement, and a complete real-Chrome regression suite. Every control was also walked through with Computer Use after fixing table auto-reset freezes.

## Answer

Use `A — Compact ledger` as V1's primary Search and Health interaction and information hierarchy. It keeps the workflow linear and dense, maximizes visible rows, retains operational facts in the table, and still supports the accepted optional Storefront-grouped view, URL-persistent match-any chips, filters, sorting, pagination, images, freshness/Partial warnings, and manual retailer handoff.

Do not use the side inspector or Storefront outline as the primary structure. The prototype's visual styling is not accepted: colors, typography, spacing, and overall appearance remain disposable and will be replaced by a future owner-supplied design. This styling deferral does not reopen the accepted Compact-ledger behavior, light/dark support, TanStack Table/Query boundary, or optimistic-mutation policy.
