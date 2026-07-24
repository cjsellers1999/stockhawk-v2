import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type {
  OnboardingProgress,
  OfferSearchQuery,
  OfferSearchResponse,
  OwnerCommand,
  OwnerCommandFamily,
  OwnerCommandReceipt,
} from "@stockhawk/contracts";
import { describe, expect, it, vi } from "vitest";

import { buildApp, isBrowserNavigationRequest } from "./app.js";

const ownerCommandDatabase = () => ({
  enqueueOwnerCommand:
    vi.fn<(command: OwnerCommand) => Promise<OwnerCommandReceipt>>(),
  findLatestOwnerCommand: vi
    .fn<(family: OwnerCommandFamily) => Promise<OwnerCommandReceipt | null>>()
    .mockResolvedValue(null),
  findOnboardingProgress: vi
    .fn<() => Promise<OnboardingProgress | null>>()
    .mockResolvedValue(null),
});
const allowedOrigins = new Set(["https://stockhawk.test"]);

describe("readiness endpoint", () => {
  it("reports the API, database, and worker truth independently", async () => {
    const app = buildApp({
      allowedOrigins,
      database: {
        ...ownerCommandDatabase(),
        check: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
        searchOffers: vi
          .fn<() => Promise<OfferSearchResponse>>()
          .mockResolvedValue({ items: [], total: 0 }),
      },
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
      allowedOrigins,
      database: {
        ...ownerCommandDatabase(),
        check: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
        searchOffers,
      },
      webDistPath: undefined,
      worker: { check: vi.fn<() => Promise<boolean>>() },
    });

    const response = await app.inject({
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
      allowedOrigins,
      database: {
        ...ownerCommandDatabase(),
        check: vi.fn<() => Promise<boolean>>(),
        searchOffers,
      },
      webDistPath: undefined,
      worker: { check: vi.fn<() => Promise<boolean>>() },
    });

    const response = await app.inject({
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
      allowedOrigins,
      database: {
        ...ownerCommandDatabase(),
        check: vi.fn<() => Promise<boolean>>(),
        searchOffers: vi
          .fn<() => Promise<OfferSearchResponse>>()
          .mockResolvedValue({ items: [], total: 0 }),
      },
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

  it("requires exact Origin and Fetch Metadata for owner mutations", async () => {
    const command = {
      family: "refresh_health",
      idempotencyKey: "d8857fd0-b531-4a20-a08d-8f72727d4e0f",
      schemaVersion: 1,
    } as const;
    const receipt: OwnerCommandReceipt = {
      command,
      completedAt: null,
      failedAt: null,
      receiptId: "2e847567-14e4-49a9-a08c-92151429be8e",
      requestedAt: "2026-07-23T17:00:00.000Z",
      status: "queued",
    };
    const database = {
      ...ownerCommandDatabase(),
      check: vi.fn<() => Promise<boolean>>(),
      searchOffers: vi
        .fn<() => Promise<OfferSearchResponse>>()
        .mockResolvedValue({ items: [], total: 0 }),
    };
    database.enqueueOwnerCommand.mockResolvedValue(receipt);
    const app = buildApp({
      allowedOrigins,
      database,
      webDistPath: undefined,
      worker: { check: vi.fn<() => Promise<boolean>>() },
    });

    const wrongOrigin = await app.inject({
      headers: {
        origin: "https://attacker.test",
        "sec-fetch-site": "same-origin",
      },
      method: "POST",
      payload: command,
      url: "/api/owner-commands/refresh-health",
    });
    const missingMetadata = await app.inject({
      headers: { origin: "https://stockhawk.test" },
      method: "POST",
      payload: command,
      url: "/api/owner-commands/refresh-health",
    });
    const accepted = await app.inject({
      headers: {
        origin: "https://stockhawk.test",
        "sec-fetch-site": "same-origin",
      },
      method: "POST",
      payload: command,
      url: "/api/owner-commands/refresh-health",
    });

    expect(wrongOrigin.statusCode).toBe(403);
    expect(missingMetadata.statusCode).toBe(403);
    expect(accepted.statusCode).toBe(202);
    expect(database.enqueueOwnerCommand).toHaveBeenCalledOnce();
    expect(database.enqueueOwnerCommand).toHaveBeenCalledWith(command);
    await app.close();
  });

  it("exposes reconciled onboarding progress and queues a guarded resume", async () => {
    const progress: OnboardingProgress = {
      candidateSites: 2_489,
      cases: {
        inProgress: 0,
        queued: 0,
        resolved: 0,
        suspended: 1,
        total: 1,
      },
      focusCase: {
        candidateIdentity: "cnd_c473d673479129cabf67849530aa60e3",
        candidateName: "101 West Vine",
        candidateUrl: "https://www.101westvine.store/",
        identity: "obc_6d6294f35cc2c20a72a5e88f56fca573",
        nextAction: "Resume onboarding preflight",
        revision: 0,
        sourceRecordCount: 2,
        stage: "preflight",
        status: "suspended",
        terminal: false,
        updatedAt: "2026-07-24T17:00:00.000Z",
        waitReason: "Awaiting explicit owner resume",
      },
      importedAt: "2026-07-24T17:00:00.000Z",
      remainingCandidateSites: 2_488,
      sourceRecords: { reconciled: 2_712, total: 2_712 },
      workbookSha256:
        "0c4d846c6547e4d36d49de7c4aff250b63ec2cec9b39bfa166aa648586f53bbf",
    };
    const command = {
      action: "resume",
      caseIdentity: "obc_6d6294f35cc2c20a72a5e88f56fca573",
      expectedRevision: 0,
      family: "resume_onboarding",
      idempotencyKey: "d8857fd0-b531-4a20-a08d-8f72727d4e0f",
      schemaVersion: 1,
    } as const;
    const receipt: OwnerCommandReceipt = {
      command,
      completedAt: null,
      failedAt: null,
      receiptId: "2e847567-14e4-49a9-a08c-92151429be8e",
      requestedAt: "2026-07-24T17:00:01.000Z",
      status: "queued",
    };
    const database = {
      ...ownerCommandDatabase(),
      check: vi.fn<() => Promise<boolean>>(),
      searchOffers: vi
        .fn<() => Promise<OfferSearchResponse>>()
        .mockResolvedValue({ items: [], total: 0 }),
    };
    database.findOnboardingProgress.mockResolvedValue(progress);
    database.enqueueOwnerCommand.mockResolvedValue(receipt);
    const app = buildApp({
      allowedOrigins,
      database,
      webDistPath: undefined,
      worker: { check: vi.fn<() => Promise<boolean>>() },
    });

    const progressResponse = await app.inject({
      method: "GET",
      url: "/api/onboarding/progress",
    });
    const resumeResponse = await app.inject({
      headers: {
        origin: "https://stockhawk.test",
        "sec-fetch-site": "same-origin",
      },
      method: "POST",
      payload: command,
      url: "/api/owner-commands/resume-onboarding",
    });

    expect(progressResponse.statusCode).toBe(200);
    expect(progressResponse.json()).toEqual(progress);
    expect(resumeResponse.statusCode).toBe(202);
    expect(database.enqueueOwnerCommand).toHaveBeenCalledWith(command);
    await app.close();
  });

  it("classifies API dot-segment targets before URL normalization", () => {
    expect(
      isBrowserNavigationRequest("GET", "/api/%2e%2e/missing", "text/html"),
    ).toBe(false);
  });
});
