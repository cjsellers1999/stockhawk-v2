# Search and Health prototype verdict

## Question

Which table information hierarchy best supports the morning Jellycat shopping workflow and Storefront remediation at representative V1 scale?

## Rejected direction

Card-heavy Search and Health layouts. At this historical stage, the owner requested a linear table direction; the later locked design resolves production Search as a table and Health as a linear fact list.

## Evaluated options

- `A — Compact ledger`: maximum visible rows and facts.
- `B — Table + inspector`: narrower scan table plus selected-row detail.
- `C — Store outline`: expandable Storefront/state group rows and children.

Shared accepted constraints:

- Light and dark mode.
- Historical TanStack Table v8 and TanStack Query; production uses exact-pinned Table v9 beta and Query v5 with the locked shadcn/Base UI/Tailwind stack.
- Every true UI mutation is optimistic by enforced wrapper; error rolls back and settlement reconciles.
- Optimism applies to the submitted command (`Queued`), never an unverified external outcome (`Healthy`, stock, or certification).
- Missing images remain informational only.

## Handoff verification

- Computer Use walkthrough completed in Google Chrome across every prototype control.
- Real Chrome regression tests are part of `npm run verify`.
- Fixed TanStack Table auto-reset loops that previously froze the browser after loading, filtering, or grouping.
- Retailer links are wiring-checked only because this throwaway prototype intentionally points them to `example.com`.

## Verdict

Retain `A — Compact ledger` as behavior prior art: dense Search rows, maximum visible results, facts kept in-row, and the optional Storefront-grouped view. Production renders Search as the locked Offer table and Health as the locked linear Storefront fact list in the [owner-approved design](../../design/DESIGN.md).

`B — Table + inspector` and `C — Store outline` are not the primary structures. This historical prototype's colors, typography, spacing, and overall appearance are superseded by the locked owner design. No future styling choice remains open for V1.
