import { offerSearchResponseSchema } from "@stockhawk/contracts";
import {
  createDatabase,
  decodeDatabaseConfig,
  syntheticOfferObservationBatch,
} from "@stockhawk/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "./app.js";

const { url } = decodeDatabaseConfig(process.env);
const database = createDatabase(url);
const app = buildApp({
  database,
  webDistPath: undefined,
  worker: { check: async () => true },
});

beforeAll(async () => {
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
});
