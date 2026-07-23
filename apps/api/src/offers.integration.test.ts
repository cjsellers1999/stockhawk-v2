import { randomUUID } from "node:crypto";

import {
  latestOwnerCommandResponseSchema,
  offerSearchResponseSchema,
  ownerCommandReceiptSchema,
} from "@stockhawk/contracts";
import {
  createDatabase,
  decodeDatabaseConfig,
  syntheticOfferObservationBatch,
} from "@stockhawk/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "./app.js";

const { url } = decodeDatabaseConfig(process.env);
const database = createDatabase(url);
const origin = "https://stockhawk.test";
const tokens = [
  `integration-session-${randomUUID()}`,
  `integration-csrf-${randomUUID()}`,
];
const app = buildApp({
  database,
  security: {
    allowedOrigins: new Set([origin]),
    cookieSecure: true,
    createOpaqueToken: () => {
      const token = tokens.shift();
      if (token === undefined) {
        throw new Error("No integration-test token remains");
      }
      return token;
    },
    now: () => new Date(),
    passwordVerifier: async () => true,
    sessionTtlMs: 12 * 60 * 60 * 1_000,
    trustLoopbackProxy: false,
  },
  webDistPath: undefined,
  worker: { check: async () => true },
});
let sessionCookie = "";
let csrfToken = "";

beforeAll(async () => {
  await database.startJobQueue();
  await database.commitObservationBatch(syntheticOfferObservationBatch);
  const login = await app.inject({
    headers: {
      origin,
      "sec-fetch-site": "same-origin",
    },
    method: "POST",
    payload: { password: "integration password" },
    url: "/api/auth/login",
  });
  const setCookie = login.headers["set-cookie"];
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie ?? ""];
  sessionCookie = cookies.map((cookie) => cookie.split(";", 1)[0]).join("; ");
  const csrfCookie = cookies.find((cookie) =>
    cookie.startsWith("stockhawk_csrf="),
  );
  csrfToken = csrfCookie?.split("=", 2)[1]?.split(";", 1)[0] ?? "";
});

afterAll(async () => {
  await app.close();
  await database.close();
});

describe("Offer search API with migrated PostgreSQL", () => {
  it("returns the synthetic exact-variant Offer", async () => {
    const response = await app.inject({
      headers: { cookie: sessionCookie },
      method: "GET",
      url: "/api/offers?q=Fixture%20Store&stock=in_stock",
    });
    const result = offerSearchResponseSchema.parse(response.json());

    expect(response.statusCode).toBe(200);
    expect(result.items).toContainEqual(
      expect.objectContaining({
        canonicalProductName: "Sky Dragon",
        listingPresence: "active",
        listingIdentity: "lst_stockhawk_synthetic_offer_v1",
        stockStatus: "in_stock",
        storefrontIdentity: "stf_stockhawk_fixture_store_v1",
        storefrontName: "StockHawk Fixture Store",
        variant: "Medium",
      }),
    );

    const missingResponse = await app.inject({
      headers: { cookie: sessionCookie },
      method: "GET",
      url: "/api/offers?q=not-a-real-offer",
    });
    expect(missingResponse.json()).toEqual({ items: [], total: 0 });
  });

  it("logs in, queues health intent, processes it, and reconciles receipt", async () => {
    const command = {
      family: "refresh_health",
      idempotencyKey: randomUUID(),
      schemaVersion: 1,
    } as const;
    const queuedResponse = await app.inject({
      headers: {
        cookie: sessionCookie,
        origin,
        "sec-fetch-site": "same-origin",
        "x-csrf-token": csrfToken,
      },
      method: "POST",
      payload: command,
      url: "/api/owner-commands/refresh-health",
    });
    const queued = ownerCommandReceiptSchema.parse(queuedResponse.json());

    expect(queuedResponse.statusCode).toBe(202);
    expect(queued).toMatchObject({ command, status: "queued" });
    await expect(database.processNextOwnerCommand()).resolves.toBe(true);

    const latestResponse = await app.inject({
      headers: { cookie: sessionCookie },
      method: "GET",
      url: "/api/owner-commands/refresh-health",
    });
    const latest = latestOwnerCommandResponseSchema.parse(
      latestResponse.json(),
    );

    expect(latestResponse.statusCode).toBe(200);
    expect(latest.receipt).toMatchObject({
      command,
      receiptId: queued.receiptId,
      status: "completed",
    });
    await expect(database.findHealthRefreshCheckpoint()).resolves.toMatchObject(
      {
        lastReceiptIdentity: queued.receiptId,
      },
    );
  });
});
