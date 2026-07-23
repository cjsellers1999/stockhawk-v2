import { describe, expect, it } from "vitest";

import {
  commitObservationBatchCommandSchema,
  offerSearchQuerySchema,
  offerSearchResponseSchema,
} from "./catalog.js";

const observedAt = "2026-07-22T18:00:00.000Z";

describe("catalog contracts", () => {
  it("decodes one exact-variant Observation Batch and its Offer response", () => {
    const command = commitObservationBatchCommandSchema.parse({
      batchIdentity: "batch_synthetic_001",
      catalogMatchIdentity: "mat_synthetic_001",
      evidence: {
        contentHash:
          "f1d2d2f924e986ac86fdf7b36c94bcdf32beec15d497f0943f9f9d1f2f3f4f5f",
        identity: "evd_synthetic_001",
        sourceUrl: "https://liltulips.com/products/sky-dragon-medium",
      },
      idempotencyKey: "commit_synthetic_001",
      listing: {
        identity: "lst_synthetic_sky_dragon",
        imageUrl: null,
        purchaseUrl: "https://liltulips.com/products/sky-dragon-medium",
        rawTitle: "Sky Dragon — Medium",
        sourceIdentity: {
          namespace: "fixture-product-handle",
          ruleVersion: 1,
          value: "sky-dragon-medium",
        },
      },
      listingObservationIdentity: "obs_synthetic_001",
      observedAt,
      observationOrder: 1,
      product: {
        canonicalName: "Sky Dragon",
        identity: "prd_sky_dragon_medium",
        variant: "Medium",
      },
      runIdentity: "run_synthetic_001",
      schemaVersion: 1,
      stock: {
        identity: "stk_synthetic_001",
        status: "in_stock",
      },
      storefront: {
        identity: "stf_lil_tulips",
        name: "Lil’ Tulips",
        origin: "https://liltulips.com",
      },
    });

    const response = offerSearchResponseSchema.parse({
      items: [
        {
          canonicalProductName: command.product.canonicalName,
          imageUrl: command.listing.imageUrl,
          lastCheckedAt: command.observedAt,
          listingIdentity: command.listing.identity,
          listingPresence: "active",
          matchStatus: "confirmed",
          purchaseUrl: command.listing.purchaseUrl,
          rawTitle: command.listing.rawTitle,
          stockStatus: command.stock.status,
          storefrontHostname: "liltulips.com",
          storefrontName: command.storefront.name,
          variant: command.product.variant,
        },
      ],
      total: 1,
    });

    expect(response.items[0]?.listingIdentity).toBe("lst_synthetic_sky_dragon");
    expect(() =>
      commitObservationBatchCommandSchema.parse({
        ...command,
        untrustedExtra: true,
      }),
    ).toThrow(/unrecognized/i);
  });

  it("decodes URL-shaped Offer search state with strict defaults", () => {
    expect(
      offerSearchQuerySchema.parse({
        freshness: "fresh",
        match: "confirmed",
        q: ["Sky Dragon", "liltulips.com"],
        stock: "in_stock",
        view: "storefront",
      }),
    ).toEqual({
      freshness: "fresh",
      match: "confirmed",
      q: ["Sky Dragon", "liltulips.com"],
      stock: "in_stock",
      view: "storefront",
    });
    expect(offerSearchQuerySchema.parse({})).toEqual({
      freshness: "all",
      match: "all",
      q: [],
      stock: "all",
      view: "flat",
    });
    expect(() =>
      offerSearchQuerySchema.parse({ q: "", unsupported: true }),
    ).toThrow(/small|unrecognized/i);
  });
});
