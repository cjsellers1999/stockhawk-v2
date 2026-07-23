import {
  commitObservationBatchCommandSchema,
  type CommitObservationBatchCommand,
} from "@stockhawk/contracts";

export const syntheticOfferObservationBatch =
  commitObservationBatchCommandSchema.parse({
    batchIdentity: "batch_stockhawk_synthetic_offer_v1",
    catalogMatchIdentity: "mat_stockhawk_synthetic_offer_v1",
    evidence: {
      contentHash:
        "3ce379b4f2326be502971d43328d85abc7e0902aafb3b2fed6be9e202abf101e",
      identity: "evd_stockhawk_synthetic_offer_v1",
      sourceUrl: "https://fixture.stockhawk.test/products/sky-dragon-medium",
    },
    idempotencyKey: "commit_stockhawk_synthetic_offer_v1",
    listing: {
      identity: "lst_stockhawk_synthetic_offer_v1",
      imageUrl: null,
      purchaseUrl: "https://fixture.stockhawk.test/products/sky-dragon-medium",
      rawTitle: "Sky Dragon — Medium",
      sourceIdentity: {
        namespace: "synthetic-product-handle",
        ruleVersion: 1,
        value: "sky-dragon-medium",
      },
    },
    listingObservationIdentity: "obs_stockhawk_synthetic_offer_v1",
    observedAt: "2026-07-23T01:00:00.000Z",
    observationOrder: 1,
    product: {
      canonicalName: "Sky Dragon",
      identity: "prd_stockhawk_sky_dragon_medium_v1",
      variant: "Medium",
    },
    runIdentity: "run_stockhawk_synthetic_offer_v1",
    schemaVersion: 1,
    stock: {
      identity: "stk_stockhawk_synthetic_offer_v1",
      status: "in_stock",
    },
    storefront: {
      identity: "stf_stockhawk_fixture_store_v1",
      name: "StockHawk Fixture Store",
      origin: "https://fixture.stockhawk.test",
    },
  }) satisfies CommitObservationBatchCommand;
