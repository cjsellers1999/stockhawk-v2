# Prototype the residential-IP crawl scheduler

Type: prototype
Label: wayfinder:prototype
Status: open
Triage: ready-for-human
Blocked by: 04, 05

## Question

What adaptive scheduling model produces the fastest safe combined Catalog Discovery and Stock Monitoring on one Mac mini and residential IP? Build a throwaway logic prototype using representative Connector costs to test global and per-Storefront concurrency, priority queues, caching, conditional work, jitter, retry/backoff behavior, failure isolation, full-snapshot reconciliation, and future alert latency; use the results to choose measurable pacing and freshness policies.

## Comments

- Use Connector Run Metrics from both HTTP and granted browser work. The prototype must measure browser cost separately and choose safe recurring cadence and priority for Browser Access Grants rather than treating browser fallback like ordinary requests.
