# Search and Health prototype verdict

## Question

Which table information hierarchy best supports the morning Jellycat shopping workflow and Storefront remediation at representative V1 scale?

## Rejected direction

Card-heavy Search and Health layouts. Owner requested a linear table interface.

## Evaluated options

- `A — Compact ledger`: maximum visible rows and facts.
- `B — Table + inspector`: narrower scan table plus selected-row detail.
- `C — Store outline`: expandable Storefront/state group rows and children.

Shared accepted constraints:

- Light and dark mode.
- TanStack Table and TanStack Query.
- Every true UI mutation is optimistic by enforced wrapper; error rolls back and settlement reconciles.
- Optimism applies to the submitted command (`Queued`), never an unverified external outcome (`Healthy`, stock, or certification).
- Missing images remain informational only.

## Handoff verification

- Computer Use walkthrough completed in Google Chrome across every prototype control.
- Real Chrome regression tests are part of `npm run verify`.
- Fixed TanStack Table auto-reset loops that previously froze the browser after loading, filtering, or grouping.
- Retailer links are wiring-checked only because this throwaway prototype intentionally points them to `example.com`.

## Verdict

Use `A — Compact ledger` as V1's interaction and information hierarchy for Search and Health: dense linear tables, maximum visible rows, facts kept in-row, and the existing optional Storefront-grouped view.

`B — Table + inspector` and `C — Store outline` are not the primary structures. The prototype's colors, typography, spacing, and overall visual design are explicitly rejected; they are disposable and will be replaced by a future owner-supplied design without changing the accepted Compact-ledger behavior.
