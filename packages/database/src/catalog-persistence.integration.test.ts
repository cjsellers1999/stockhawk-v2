import { randomBytes } from "node:crypto";

import type { CommitObservationBatchCommand } from "@stockhawk/contracts";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { decodeDatabaseConfig } from "./config.js";
import { createDatabase, type Database } from "./database.js";
import { migrateDatabase } from "./migration.js";

const testDatabaseName = `stockhawk_test_${process.pid}_${randomBytes(6).toString("hex")}`;
const baseUrl = new URL(decodeDatabaseConfig(process.env).url);
const adminUrl = new URL(baseUrl);
adminUrl.pathname = "/postgres";
adminUrl.search = "";
const testUrl = new URL(baseUrl);
testUrl.pathname = `/${testDatabaseName}`;
testUrl.search = "";

const adminClient = postgres(adminUrl.toString(), { max: 1 });
let database: Database | undefined;

const getDatabase = () => {
  if (database === undefined) {
    throw new Error("Expected the isolated catalog database to be ready");
  }
  return database;
};

const command = {
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
  observedAt: "2026-07-22T18:00:00.000Z",
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
} satisfies CommitObservationBatchCommand;

const commandForListing = (suffix: string): CommitObservationBatchCommand => ({
  ...command,
  batchIdentity: `batch_${suffix}`,
  catalogMatchIdentity: `mat_${suffix}`,
  evidence: {
    ...command.evidence,
    identity: `evd_${suffix}`,
  },
  idempotencyKey: `commit_${suffix}`,
  listing: {
    ...command.listing,
    identity: `lst_${suffix}`,
    sourceIdentity: {
      ...command.listing.sourceIdentity,
      value: `sky-dragon-medium-${suffix}`,
    },
  },
  listingObservationIdentity: `obs_${suffix}`,
  runIdentity: `run_${suffix}`,
  stock: {
    ...command.stock,
    identity: `stk_${suffix}`,
  },
});

const nextObservation = ({
  prior,
  suffix,
  observedAt,
  observationOrder,
  status,
}: {
  prior: CommitObservationBatchCommand;
  suffix: string;
  observedAt: string;
  observationOrder: number;
  status: CommitObservationBatchCommand["stock"]["status"];
}): CommitObservationBatchCommand => ({
  ...prior,
  batchIdentity: `batch_${suffix}`,
  evidence: {
    ...prior.evidence,
    identity: `evd_${suffix}`,
  },
  idempotencyKey: `commit_${suffix}`,
  listingObservationIdentity: `obs_${suffix}`,
  observedAt,
  observationOrder,
  runIdentity: `run_${suffix}`,
  stock: {
    identity: `stk_${suffix}`,
    status,
  },
});

beforeAll(async () => {
  await adminClient.unsafe(`create database "${testDatabaseName}"`);
  await migrateDatabase(testUrl.toString());
  database = createDatabase(testUrl.toString());
});

afterAll(async () => {
  try {
    await database?.close();
    await adminClient.unsafe(`drop database if exists "${testDatabaseName}"`);
  } finally {
    await adminClient.end();
  }
});

describe("catalog Persistence Boundary", () => {
  it("commits one exact-variant Observation Batch as a searchable Offer", async () => {
    const catalogDatabase = getDatabase();

    await expect(
      catalogDatabase.commitObservationBatch(command),
    ).resolves.toEqual({
      batchIdentity: "batch_synthetic_001",
      outcome: "committed",
    });

    await expect(catalogDatabase.searchOffers()).resolves.toEqual({
      items: [
        {
          canonicalProductName: "Sky Dragon",
          imageUrl: null,
          lastCheckedAt: "2026-07-22T18:00:00.000Z",
          listingIdentity: "lst_synthetic_sky_dragon",
          matchStatus: "confirmed",
          purchaseUrl: "https://liltulips.com/products/sky-dragon-medium",
          rawTitle: "Sky Dragon — Medium",
          stockStatus: "in_stock",
          storefrontHostname: "liltulips.com",
          storefrontName: "Lil’ Tulips",
          variant: "Medium",
        },
      ],
      total: 1,
    });
  });

  it("replays an identical command without duplicating causal Change Events", async () => {
    const catalogDatabase = getDatabase();
    const replayCommand = commandForListing("replay");

    await catalogDatabase.commitObservationBatch(replayCommand);

    await expect(
      catalogDatabase.commitObservationBatch(replayCommand),
    ).resolves.toEqual({
      batchIdentity: "batch_replay",
      outcome: "replayed",
    });
    await expect(
      catalogDatabase.readChangeEvents({ listingIdentity: "lst_replay" }),
    ).resolves.toEqual([
      expect.objectContaining({
        eventType: "listing_discovered",
        newValue: "active",
        previousValue: null,
      }),
      expect.objectContaining({
        eventType: "stock_status_changed",
        newValue: "in_stock",
        previousValue: "unknown",
      }),
    ]);
  });

  it("retains a stale Stock Observation without replacing newer current truth", async () => {
    const catalogDatabase = getDatabase();
    const latestCommand = {
      ...commandForListing("ordered"),
      observedAt: "2026-07-22T19:00:00.000Z",
      observationOrder: 10,
    } satisfies CommitObservationBatchCommand;
    const staleCommand = nextObservation({
      observedAt: "2026-07-22T18:30:00.000Z",
      observationOrder: 9,
      prior: latestCommand,
      status: "out_of_stock",
      suffix: "stale",
    });

    await catalogDatabase.commitObservationBatch(latestCommand);
    await catalogDatabase.commitObservationBatch(staleCommand);

    const offers = await catalogDatabase.searchOffers();
    expect(
      offers.items.find(
        ({ listingIdentity }) => listingIdentity === "lst_ordered",
      ),
    ).toEqual(
      expect.objectContaining({
        lastCheckedAt: "2026-07-22T19:00:00.000Z",
        stockStatus: "in_stock",
      }),
    );
    await expect(
      catalogDatabase.readStockObservationHistory({
        listingIdentity: "lst_ordered",
      }),
    ).resolves.toEqual([
      expect.objectContaining({ observationOrder: 9, status: "out_of_stock" }),
      expect.objectContaining({ observationOrder: 10, status: "in_stock" }),
    ]);
    await expect(
      catalogDatabase.readChangeEvents({ listingIdentity: "lst_ordered" }),
    ).resolves.toHaveLength(2);
  });

  it("rolls back every write when an immutable identity conflicts", async () => {
    const catalogDatabase = getDatabase();
    const conflictingCommand = {
      ...commandForListing("rollback"),
      product: {
        ...command.product,
        canonicalName: "Conflicting Dragon",
      },
    } satisfies CommitObservationBatchCommand;

    await expect(
      catalogDatabase.commitObservationBatch(conflictingCommand),
    ).rejects.toThrow(/Product identity was reused/);

    const correctedCommand = {
      ...conflictingCommand,
      product: command.product,
    } satisfies CommitObservationBatchCommand;
    await expect(
      catalogDatabase.commitObservationBatch(correctedCommand),
    ).resolves.toEqual({
      batchIdentity: "batch_rollback",
      outcome: "committed",
    });
  });

  it("rejects a second active Catalog Match at the PostgreSQL constraint", async () => {
    const sqlClient = postgres(testUrl.toString(), { max: 1 });

    try {
      await expect(
        sqlClient.begin(async (transaction) => {
          const [secondProduct] = await transaction<[{ id: number }]>`
            insert into product (
              canonical_name,
              stockhawk_identity,
              variant
            )
            values (
              'Other Dragon',
              'prd_constraint_other',
              'Medium'
            )
            returning id
          `;
          if (secondProduct === undefined) {
            throw new Error("Expected the constraint Product to be inserted");
          }
          await transaction`
            insert into catalog_match (
              active,
              match_authority,
              matched_at,
              product_id,
              retailer_listing_id,
              stockhawk_identity
            )
            select
              true,
              'constraint_test',
              now(),
              ${secondProduct.id},
              listing.id,
              'mat_constraint_conflict'
            from retailer_listing as listing
            where listing.stockhawk_identity = 'lst_synthetic_sky_dragon'
          `;
        }),
      ).rejects.toMatchObject({ code: "23505" });
    } finally {
      await sqlClient.end();
    }
  });

  it("rebuilds equivalent Search Documents from authoritative state", async () => {
    const catalogDatabase = getDatabase();
    const beforeRebuild = await catalogDatabase.searchOffers();
    const sqlClient = postgres(testUrl.toString(), { max: 1 });

    try {
      await sqlClient`delete from search_document`;
    } finally {
      await sqlClient.end();
    }

    await expect(catalogDatabase.searchOffers()).resolves.toEqual({
      items: [],
      total: 0,
    });
    await expect(catalogDatabase.rebuildSearchDocuments()).resolves.toBe(
      beforeRebuild.total,
    );
    await expect(catalogDatabase.searchOffers()).resolves.toEqual(
      beforeRebuild,
    );
  });
});
