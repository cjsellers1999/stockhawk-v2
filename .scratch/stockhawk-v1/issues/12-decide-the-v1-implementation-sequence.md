# Decide the V1 implementation sequence and handoff

Type: grilling
Label: wayfinder:grilling
Status: open
Triage: ready-for-human
Blocked by: 11

## Question

Given every resolved architecture, audit, interaction, operations, and verification decision, what tracer-bullet implementation sequence reaches useful end-to-end Jellycat results early without weakening the final completion contract? Decide vertical slices, dependency order, proof gates, the point at which the full Storefront rollout begins, and the exact artifacts to hand to execution.

## Upstream handoff constraints

- Build the three-plane verification system alongside the first vertical slice: deterministic fixtures/tests, the actual-Mac representative release rehearsal, and live per-Storefront qualification.
- No fixture or shared Platform Adapter result may substitute for per-Storefront Catalog Certification and shopper-visible Stock Semantics Validation.
- Full rollout starts only after the deterministic suite and representative Mac gate pass; first-time recurring scheduling remains behind each Integration's certification, stock-semantics, and target-accounting gate.
- The first representative-load slice must exercise at least 100,000 Offers, prove accepted search latency and scheduler degradation behavior, and measure database/detail/media growth so cache quota and disk high-water configuration are set before rollout.
- Every slice must extend the commit-keyed Evidence Bundle; rollout continuously regenerates the deterministic full-input closeout reconciliation, and Partial can never be hidden as complete.
