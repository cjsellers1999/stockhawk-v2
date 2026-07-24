# ADR 0001: Use Tailscale as the application access boundary

- Status: Accepted
- Date: 2026-07-23

## Context

StockHawk is a single-owner application running on a Mac mini. Its UI needs
private access from a small set of owner-approved devices, not a second
application identity system. Maintaining accounts, passwords, sessions, and
CSRF tokens would duplicate the private-network authorization boundary and add
security-sensitive state with no V1 user need.

## Decision

Tailscale Serve is the sole ingress to StockHawk. A deny-by-default Tailscale
Grant authorizes only approved devices to the tagged StockHawk node over HTTPS.
Fastify and PostgreSQL bind to loopback.

StockHawk has no application account, login, password, session, authentication
cookie, or CSRF token. Browser mutations retain exact-Origin and same-origin
Fetch Metadata checks as request-integrity defenses; these checks are not an
authentication system.

There is no direct-LAN or alternate reverse-proxy fallback. Tailscale Funnel,
subnet routing, exit-node use, database exposure, and public router forwarding
remain disabled.

## Consequences

- Losing Tailscale access makes the UI unavailable; background API, worker, and
  database processing may continue locally.
- After reboot, UI access may wait for the supported macOS Tailscale client and
  Serve to return after login.
- Device approval and Tailscale policy are security-critical operational
  controls.
- Application authentication must not be added without a new owner-approved
  architecture decision.
- Tests should prove the Tailscale-only deployment and remaining mutation
  boundary, not merely assert that removed authentication artifacts are absent.
