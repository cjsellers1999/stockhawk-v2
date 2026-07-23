import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type {
  HealthRefreshCommand,
  OfferSearchQuery,
  OfferSearchResponse,
  OwnerCommandReceipt,
} from "@stockhawk/contracts";
import { describe, expect, it, vi } from "vitest";

import { buildApp, isBrowserNavigationRequest } from "./app.js";

const authenticatedSession = {
  csrfTokenHash: "b".repeat(64),
  expiresAt: new Date("2026-07-24T05:00:00.000Z"),
  id: 1,
  sessionTokenHash: "a".repeat(64),
};
const authenticatedDatabase = () => ({
  createAdminSession: vi
    .fn<
      (
        input: Omit<typeof authenticatedSession, "id">,
      ) => Promise<typeof authenticatedSession>
    >()
    .mockResolvedValue(authenticatedSession),
  enqueueOwnerCommand:
    vi.fn<
      (input: {
        command: HealthRefreshCommand;
        requestedBySessionId: number;
      }) => Promise<OwnerCommandReceipt>
    >(),
  findActiveAdminSession: vi
    .fn<
      (input: {
        now: Date;
        sessionTokenHash: string;
      }) => Promise<typeof authenticatedSession | null>
    >()
    .mockResolvedValue(authenticatedSession),
  findLatestOwnerCommand: vi
    .fn<() => Promise<OwnerCommandReceipt | null>>()
    .mockResolvedValue(null),
});
const security = {
  allowedOrigins: new Set(["https://stockhawk.test"]),
  cookieSecure: true,
  createOpaqueToken: () => "unused",
  now: () => new Date("2026-07-23T17:00:00.000Z"),
  passwordVerifier: vi
    .fn<(password: string) => Promise<boolean>>()
    .mockResolvedValue(true),
  sessionTtlMs: 12 * 60 * 60 * 1_000,
  trustLoopbackProxy: false,
};
const sessionHeaders = { cookie: "stockhawk_session=test-session" };

describe("readiness endpoint", () => {
  it("reports the API, database, and worker truth independently", async () => {
    const app = buildApp({
      database: {
        ...authenticatedDatabase(),
        check: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
        searchOffers: vi
          .fn<() => Promise<OfferSearchResponse>>()
          .mockResolvedValue({ items: [], total: 0 }),
      },
      security,
      webDistPath: undefined,
      worker: {
        check: vi.fn<() => Promise<boolean>>().mockResolvedValue(false),
      },
    });

    const response = await app.inject({ method: "GET", url: "/api/readiness" });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      api: "ready",
      database: "ready",
      worker: "unavailable",
    });
    await app.close();
  });

  it("returns searchable Offers from the authoritative read model", async () => {
    const searchResult = {
      items: [
        {
          canonicalProductName: "Sky Dragon",
          imageUrl: null,
          lastCheckedAt: "2026-07-22T18:00:00.000Z",
          listingIdentity: "lst_synthetic_sky_dragon",
          listingPresence: "active" as const,
          matchStatus: "confirmed" as const,
          purchaseUrl: "https://liltulips.com/products/sky-dragon-medium",
          rawTitle: "Sky Dragon — Medium",
          stockStatus: "in_stock" as const,
          storefrontHostname: "liltulips.com",
          storefrontIdentity: "stf_lil_tulips",
          storefrontName: "Lil’ Tulips",
          variant: "Medium",
        },
      ],
      total: 1,
    };
    const searchOffers = vi
      .fn<(query: OfferSearchQuery) => Promise<typeof searchResult>>()
      .mockResolvedValue(searchResult);
    const app = buildApp({
      database: {
        ...authenticatedDatabase(),
        check: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
        searchOffers,
      },
      security,
      webDistPath: undefined,
      worker: { check: vi.fn<() => Promise<boolean>>() },
    });

    const response = await app.inject({
      headers: sessionHeaders,
      method: "GET",
      url: "/api/offers?q=Sky%20Dragon&q=liltulips.com&stock=in_stock&view=storefront",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(searchResult);
    expect(searchOffers).toHaveBeenCalledWith({
      freshness: "all",
      q: ["Sky Dragon", "liltulips.com"],
      stock: "in_stock",
      view: "storefront",
    });
    await app.close();
  });

  it("rejects malformed Offer search state before the database boundary", async () => {
    const searchOffers = vi
      .fn<(query: OfferSearchQuery) => Promise<OfferSearchResponse>>()
      .mockResolvedValue({ items: [], total: 0 });
    const app = buildApp({
      database: {
        ...authenticatedDatabase(),
        check: vi.fn<() => Promise<boolean>>(),
        searchOffers,
      },
      security,
      webDistPath: undefined,
      worker: { check: vi.fn<() => Promise<boolean>>() },
    });

    const response = await app.inject({
      headers: sessionHeaders,
      method: "GET",
      url: "/api/offers?stock=invented",
    });

    expect(response.statusCode).toBe(400);
    expect(searchOffers).not.toHaveBeenCalled();
    await app.close();
  });

  it("uses the browser fallback only for HTML navigation", async () => {
    const webDistPath = await mkdtemp(join(tmpdir(), "stockhawk-web-"));
    await writeFile(
      join(webDistPath, "index.html"),
      "<title>StockHawk</title>",
    );
    const app = buildApp({
      database: {
        ...authenticatedDatabase(),
        check: vi.fn<() => Promise<boolean>>(),
        searchOffers: vi
          .fn<() => Promise<OfferSearchResponse>>()
          .mockResolvedValue({ items: [], total: 0 }),
      },
      security,
      webDistPath,
      worker: { check: vi.fn<() => Promise<boolean>>() },
    });

    const apiResponse = await app.inject({
      headers: { accept: "text/html" },
      method: "GET",
      url: "/api/missing",
    });
    const mutationResponse = await app.inject({
      headers: { accept: "text/html" },
      method: "POST",
      url: "/health",
    });
    const navigationResponse = await app.inject({
      headers: { accept: "text/html" },
      method: "GET",
      url: "/health",
    });

    expect(apiResponse.statusCode).toBe(404);
    expect(apiResponse.headers["content-type"]).toContain("application/json");
    expect(mutationResponse.statusCode).toBe(404);
    expect(navigationResponse.statusCode).toBe(200);
    expect(navigationResponse.body).toContain("StockHawk");
    await app.close();
    await rm(webDistPath, { recursive: true });
  });

  it("classifies API dot-segment targets before URL normalization", () => {
    expect(
      isBrowserNavigationRequest("GET", "/api/%2e%2e/missing", "text/html"),
    ).toBe(false);
  });
});
