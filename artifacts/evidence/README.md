# Evidence bundles

`pnpm evidence` writes bootstrap metadata. `pnpm evidence:catalog` writes the
synthetic Offer tracer-path metadata. Both use the current commit SHA. Bundles
retain deterministic release evidence and exclude secrets and retailer response
bodies.
