# Evidence bundles

`pnpm evidence` writes bootstrap metadata. `pnpm evidence:catalog` writes the
synthetic Offer tracer-path metadata. `pnpm evidence:owner-command` writes the
optimistic owner-command and mutation-boundary metadata.
`pnpm evidence:onboarding` writes immutable Seed List reconciliation and
resumable Onboarding Case metadata. All use the current commit SHA.
Bundles retain deterministic release evidence and exclude secrets and retailer
response bodies.
