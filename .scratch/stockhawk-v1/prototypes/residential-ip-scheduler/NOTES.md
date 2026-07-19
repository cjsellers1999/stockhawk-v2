# Residential-IP scheduler prototype verdict

Status: accepted

## Question

Does the Adaptive fair policy's observable behavior feel like the correct V1 scheduler contract when compared with Cautious serial and Fixed greedy scheduling?

## Candidate observations

- Cautious serial remains comparatively safe but wastes independent-Storefront capacity and drains the initial-catalog sample slowly.
- Fixed greedy occasionally detects a simulated stock transition sooner, but only while producing approximately 17–62% modeled failures in the representative sweeps; its retries can leave more work overdue than the adaptive policy.
- Adaptive fair starts at three request-equivalent permits, ramps quickly using clean results across distinct Storefronts until first pressure, then probes additively around the learned limit and decreases multiplicatively. Browser work starts at one separately measured slot but expands independently when distinct browser Storefronts remain clean.
- In the deliberately saturated one-hour Browser discovery wave, one browser lane completed 1,309 useful requests while the adaptive isolated-context pool completed 3,457 (about 2.6×). The pool briefly used seven contexts, crossed the synthetic hidden-safe point of five, observed correlated pressure, and ended at three. Its modeled failure rate rose from 2.50% to 3.86%, which reinforces that successful useful work—not raw attempts or context count—is the optimization target.
- The same pool produced no extra completions during an ordinary four-hour Browser-heavy run because browser execution was not the active bottleneck. Multiple contexts are therefore an adaptive capacity tool, not a universal speed multiplier or a second IP identity.
- Short, checkpointed discovery quanta and work-conserving fairness allow overdue stock work to interrupt a long catalog without discarding partial progress; discovery that returns trustworthy stock evidence coalesces redundant monitoring.
- The 225-Storefront stratified Seed List sample is useful for queue comparison but cannot forecast how long the expected 2,247 Candidate Sites will take. Real targets and ceilings require Connector Run Metrics from allowed production work on the Mac mini and residential IP.
- Every simulated Partial run leaves disappearance reconciliation at zero; only completed certified catalog work can reconcile absence.
- Owner direction: CPU, RAM, and arbitrary global/browser concurrency numbers must not throttle V1. The production objective is maximum successfully committed useful observations per wall-clock time, with source and residential-IP feedback as the limiting signals.
- Browser-context boundary: test ordinary isolated sessions, context reuse, and parallel rendering under the shared broker. Do not vary fingerprints/viewports to impersonate separate users, interact with CAPTCHAs, or evade anti-bot controls. One Storefront challenge isolates that Storefront; only correlated evidence changes the shared pool.

## Owner verdict

- Accepted. V1 uses an HTTP-first hybrid Network-Limited Scheduler. Connector Adapters use governed HTTP whenever it can produce reliable evidence and receive a Browser Access Grant only for the public routes where HTTP is insufficient.
- The browser result answers only how to execute already-browser-required work: use an adaptive pool of ordinary isolated contexts when a due backlog proves one browser lane is saturated. Every context remains under the same residential-IP and per-Storefront broker controls; it is neither a replacement for HTTP nor a separate network identity.
- The pool expands while successful useful throughput improves and contracts on correlated pressure. One challenge isolates and backs off its Storefront. CAPTCHA interaction, fingerprint/viewport impersonation, proxy rotation, and anti-bot evasion remain excluded.
