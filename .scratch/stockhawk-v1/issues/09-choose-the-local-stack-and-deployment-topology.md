# Choose the local stack and deployment topology

Type: research
Label: wayfinder:research
Status: claimed
Triage: ready-for-agent
Blocked by: 01, 04, 05

## Question

Which application, database, job-runner, process-supervision, logging, backup, and private-LAN deployment topology best satisfies the accepted domain model, Connector seam, crawl concurrency, fast search, Mac mini operation, recoverability, and maintainability by one developer? Compare realistic options, include security and failure-recovery tradeoffs, and recommend a minimal topology with explicit operational characteristics.

## Upstream constraints

- The accepted UI stack must support TanStack Table and TanStack Query. Evaluate exact framework/runtime integration in this ticket rather than reopening those library choices.
- Every true UI mutation must use an enforced optimistic command boundary: immediate cache update, rollback on failure, and authoritative reconciliation. Optimism may represent submitted intent such as `Queued`, never fabricate external Storefront, stock, discovery, or certification success.
