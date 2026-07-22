# Prototype the search and Health Page experience

Type: prototype
Label: wayfinder:prototype
Status: open
Triage: ready-for-human
Blocked by: 05, 07

## Question

What final V1 interaction and information hierarchy best supports the morning shopping workflow and site remediation? Prototype the chosen flat Offer list with retailer-provided image thumbnails when available and a neutral missing-image placeholder, one URL-persistent match-any chip input across Product title/retailer/site URL, Stock Status filters, Storefront-grouped view, explicit pagination, retailer handoff, timestamps, Partial warnings, and dedicated Health Page using realistic high-volume and failure-state data. Missing images must never affect health or product visibility.

## Upstream decisions

- Offer thumbnails prefer the Retailer Listing's primary image, fall back to an official Jellycat image only for an exact Catalog Match, then use a neutral placeholder. Ambiguous or variant-unknown listings never receive a potentially wrong official image; image availability never affects health, visibility, or stock.
