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
const app = buildApp({
  allowedOrigins: new Set([origin]),
  database,
  webDistPath: undefined,
  worker: { check: async () => true },
});

beforeAll(async () => {
  await database.startJobQueue();
  await database.commitObservationBatch(syntheticOfferObservationBatch);
});

afterAll(async () => {
  await app.close();
  await database.close();
});

describe("Offer search API with migrated PostgreSQL", () => {
  it("returns the synthetic exact-variant Offer", async () => {
    const response = await app.inject({
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
      method: "GET",
      url: "/api/offers?q=not-a-real-offer",
    });
    expect(missingResponse.json()).toEqual({ items: [], total: 0 });
  });

  it("queues health intent, processes it, and reconciles receipt", async () => {
    const command = {
      family: "refresh_health",
      idempotencyKey: randomUUID(),
      schemaVersion: 1,
    } as const;
    const queuedResponse = await app.inject({
      headers: {
        origin,
        "sec-fetch-site": "same-origin",
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
