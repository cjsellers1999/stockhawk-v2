import { randomBytes } from "node:crypto";
import { setTimeout } from "node:timers/promises";

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

const waitForLockWaiters = async (
  client: ReturnType<typeof postgres>,
  minimum: number,
) => {
  const poll = async (attempt: number): Promise<void> => {
    const [result] = await client<{ waiting: number }[]>`
      select count(*)::integer as waiting
      from pg_stat_activity
      where datname = current_database()
        and wait_event_type = 'Lock'
    `;
    if ((result?.waiting ?? 0) >= minimum) {
      return;
    }
    if (attempt === 199) {
      throw new Error(`Expected at least ${minimum} PostgreSQL lock waiters`);
    }
    await setTimeout(10);
    await poll(attempt + 1);
  };
  await poll(0);
};

const waitForRetailerListingLockWaiter = async (
  client: ReturnType<typeof postgres>,
) => {
  const poll = async (attempt: number): Promise<void> => {
    const [result] = await client<{ waiting: number }[]>`
      select count(*)::integer as waiting
      from pg_stat_activity
      where datname = current_database()
        and wait_event_type = 'Lock'
        and position('from "retailer_listing"' in query) > 0
        and position('for update' in lower(query)) > 0
    `;
    if ((result?.waiting ?? 0) >= 1) {
      return;
    }
    if (attempt === 199) {
      throw new Error("Expected a Retailer Listing row-lock waiter");
    }
    await setTimeout(10);
    await poll(attempt + 1);
  };
  await poll(0);
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
          listingPresence: "active",
          matchStatus: "confirmed",
          purchaseUrl: "https://liltulips.com/products/sky-dragon-medium",
          rawTitle: "Sky Dragon — Medium",
          stockStatus: "in_stock",
          storefrontHostname: "liltulips.com",
          storefrontIdentity: "stf_lil_tulips",
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

  it("rejects Observation Batch identity reuse across different runs", async () => {
    const catalogDatabase = getDatabase();
    const originalCommand = commandForListing("global_batch_original");
    const reusedCommand = {
      ...commandForListing("global_batch_reused"),
      batchIdentity: originalCommand.batchIdentity,
    } satisfies CommitObservationBatchCommand;

    await catalogDatabase.commitObservationBatch(originalCommand);

    await expect(
      catalogDatabase.commitObservationBatch(reusedCommand),
    ).rejects.toThrow(/Observation Batch idempotency identity was reused/);
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

  it("rejects conflicting facts at the same listing observation order", async () => {
    const catalogDatabase = getDatabase();
    const baseCommand = commandForListing("duplicate_order");
    const initialCommand = {
      ...baseCommand,
      listing: {
        ...baseCommand.listing,
        rawTitle: "Duplicate Order Dragon — Medium",
      },
      observationOrder: 10,
    } satisfies CommitObservationBatchCommand;
    const conflictingCommand = {
      ...nextObservation({
        observedAt: "2026-07-22T20:00:00.000Z",
        observationOrder: 10,
        prior: initialCommand,
        status: "out_of_stock",
        suffix: "duplicate_order_conflict",
      }),
      listing: {
        ...initialCommand.listing,
        rawTitle: "Conflicting Dragon — Medium",
      },
    } satisfies CommitObservationBatchCommand;

    await catalogDatabase.commitObservationBatch(initialCommand);

    await expect(
      catalogDatabase.commitObservationBatch(conflictingCommand),
    ).rejects.toThrow(/Retailer Listing Observation identity conflict/);
    await expect(
      catalogDatabase.readStockObservationHistory({
        listingIdentity: initialCommand.listing.identity,
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        observationOrder: 10,
        status: initialCommand.stock.status,
      }),
    ]);
    await expect(
      catalogDatabase.searchOffers({
        freshness: "all",
        q: [initialCommand.listing.rawTitle],
        stock: "all",
        view: "flat",
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            rawTitle: initialCommand.listing.rawTitle,
            stockStatus: initialCommand.stock.status,
          }),
        ],
        total: 1,
      }),
    );
  });

  it("serializes concurrent out-of-order listing facts without regressing current truth", async () => {
    const catalogDatabase = getDatabase();
    const initialCommand = {
      ...commandForListing("concurrent"),
      observationOrder: 10,
    } satisfies CommitObservationBatchCommand;
    const newestCommand = {
      ...nextObservation({
        observedAt: "2026-07-22T20:00:00.000Z",
        observationOrder: 20,
        prior: initialCommand,
        status: "out_of_stock",
        suffix: "concurrent_newest",
      }),
      listing: {
        ...initialCommand.listing,
        rawTitle: "Sky Dragon — newest facts",
      },
    } satisfies CommitObservationBatchCommand;
    const delayedCommand = {
      ...nextObservation({
        observedAt: "2026-07-22T19:00:00.000Z",
        observationOrder: 19,
        prior: initialCommand,
        status: "preorder",
        suffix: "concurrent_delayed",
      }),
      listing: {
        ...initialCommand.listing,
        rawTitle: "Sky Dragon — delayed facts",
      },
    } satisfies CommitObservationBatchCommand;
    const blocker = postgres(testUrl.toString(), { max: 1 });
    const observer = postgres(testUrl.toString(), { max: 1 });
    const sqlClient = postgres(testUrl.toString(), { max: 1 });
    const advisoryLockKey = 7_220_226;
    let advisoryLockReleased = false;
    let newestCommit: Promise<unknown> | undefined;
    let delayedCommit: Promise<unknown> | undefined;

    await catalogDatabase.commitObservationBatch(initialCommand);
    await sqlClient.unsafe(`
        create function test_wait_before_listing_state_update()
        returns trigger
        language plpgsql
        as $$
        begin
          perform pg_advisory_xact_lock(${advisoryLockKey});
          return new;
        end
        $$;
        create trigger test_wait_before_listing_state_update
        before update on current_listing_state
        for each row execute function test_wait_before_listing_state_update();
      `);
    await blocker`select pg_advisory_lock(${advisoryLockKey})`;

    try {
      newestCommit = catalogDatabase.commitObservationBatch(newestCommand);
      await waitForLockWaiters(observer, 1);
      delayedCommit = catalogDatabase.commitObservationBatch(delayedCommand);
      await waitForLockWaiters(observer, 2);
      await blocker`select pg_advisory_unlock(${advisoryLockKey})`;
      advisoryLockReleased = true;
      await Promise.all([newestCommit, delayedCommit]);

      const [listing] = await sqlClient<
        { current_observation_order: number; raw_title: string }[]
      >`
          select
            observation.observation_order::integer as current_observation_order,
            observation.raw_title
          from retailer_listing as listing
          inner join current_listing_state as current
            on current.retailer_listing_id = listing.id
          inner join retailer_listing_observation as observation
            on observation.id = current.listing_observation_id
          where listing.stockhawk_identity = ${initialCommand.listing.identity}
        `;
      expect(listing).toEqual({
        current_observation_order: 20,
        raw_title: "Sky Dragon — newest facts",
      });
    } finally {
      if (!advisoryLockReleased) {
        await blocker`select pg_advisory_unlock(${advisoryLockKey})`;
      }
      await Promise.allSettled(
        [newestCommit, delayedCommit].filter(
          (promise): promise is Promise<unknown> => promise !== undefined,
        ),
      );
      await sqlClient.unsafe(`
          drop trigger if exists test_wait_before_listing_state_update on current_listing_state;
          drop function if exists test_wait_before_listing_state_update();
        `);
      await Promise.all([blocker.end(), observer.end(), sqlClient.end()]);
    }
  }, 10_000);

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
              evidence_artifact_id,
              match_authority,
              matched_at,
              product_id,
              retailer_listing_id,
              stockhawk_identity
            )
            select
              true,
              evidence.id,
              'constraint_test',
              now(),
              ${secondProduct.id},
              listing.id,
              'mat_constraint_conflict'
            from retailer_listing as listing
            cross join source_evidence_artifact as evidence
            where listing.stockhawk_identity = 'lst_synthetic_sky_dragon'
              and evidence.stockhawk_identity = 'evd_synthetic_001'
          `;
        }),
      ).rejects.toMatchObject({ code: "23505" });
    } finally {
      await sqlClient.end();
    }
  });

  it("requires every Catalog Match to retain evidence", async () => {
    const sqlClient = postgres(testUrl.toString(), { max: 1 });

    try {
      await expect(
        sqlClient.begin(async (transaction) => {
          await transaction`
            update catalog_match
            set evidence_artifact_id = null
            where stockhawk_identity = ${command.catalogMatchIdentity}
          `;
          throw new Error("Catalog Match accepted missing evidence");
        }),
      ).rejects.toMatchObject({ code: "23502" });
    } finally {
      await sqlClient.end();
    }
  });

  it("rejects Current Stock State facts that contradict its observation", async () => {
    const sqlClient = postgres(testUrl.toString(), { max: 1 });

    try {
      await expect(
        sqlClient.begin(async (transaction) => {
          await transaction`
            update current_stock_state as current
            set status = 'out_of_stock'
            from retailer_listing as listing
            where current.retailer_listing_id = listing.id
              and listing.stockhawk_identity = ${command.listing.identity}
          `;
          throw new Error("Current Stock State accepted contradictory facts");
        }),
      ).rejects.toMatchObject({ code: "23503" });
    } finally {
      await sqlClient.end();
    }
  });

  it("rejects a Current Listing State pointer to another listing's observation", async () => {
    const catalogDatabase = getDatabase();
    const firstCommand = commandForListing("listing_state_first");
    const secondCommand = commandForListing("listing_state_second");
    const secondNewerCommand = nextObservation({
      prior: secondCommand,
      suffix: "listing_state_second_newer",
      observedAt: "2026-07-22T19:00:00.000Z",
      observationOrder: 2,
      status: "out_of_stock",
    });
    const sqlClient = postgres(testUrl.toString(), { max: 1 });

    await catalogDatabase.commitObservationBatch(firstCommand);
    await catalogDatabase.commitObservationBatch(secondCommand);
    await catalogDatabase.commitObservationBatch(secondNewerCommand);

    try {
      await expect(
        sqlClient`
          update current_listing_state as current
          set listing_observation_id = other_observation.id
          from retailer_listing as current_listing
          cross join retailer_listing as other_listing
          cross join lateral (
            select observation.id
            from retailer_listing_observation as observation
            where observation.retailer_listing_id = other_listing.id
            order by observation.observation_order
            limit 1
          ) as other_observation
          where current.retailer_listing_id = current_listing.id
            and current_listing.stockhawk_identity = ${firstCommand.listing.identity}
            and other_listing.stockhawk_identity = ${secondCommand.listing.identity}
        `,
      ).rejects.toMatchObject({ code: "23503" });
    } finally {
      await sqlClient.end();
    }
  });

  it("rejects a duplicate causal Change Event at the PostgreSQL constraint", async () => {
    const sqlClient = postgres(testUrl.toString(), { max: 1 });

    try {
      await expect(
        sqlClient`
          insert into change_event (
            batch_id,
            causal_idempotency_key,
            effective_at,
            event_type,
            listing_observation_id,
            new_value,
            previous_value,
            product_id,
            retailer_listing_id,
            schema_version,
            stock_observation_id,
            stockhawk_identity
          )
          select
            batch_id,
            causal_idempotency_key,
            effective_at,
            event_type,
            listing_observation_id,
            new_value,
            previous_value,
            product_id,
            retailer_listing_id,
            schema_version,
            stock_observation_id,
            'evt_duplicate_causal_constraint'
          from change_event
          order by stream_position
          limit 1
        `,
      ).rejects.toMatchObject({ code: "23505" });
    } finally {
      await sqlClient.end();
    }
  });

  it("rolls back state when a required Change Event conflicts", async () => {
    const catalogDatabase = getDatabase();
    const seedCommand = commandForListing("event_conflict_seed");
    const blockedCommand = commandForListing("event_conflict_target");
    const sqlClient = postgres(testUrl.toString(), { max: 1 });

    await catalogDatabase.commitObservationBatch(seedCommand);

    try {
      await sqlClient`
        insert into change_event (
          batch_id,
          causal_idempotency_key,
          effective_at,
          event_type,
          listing_observation_id,
          new_value,
          previous_value,
          product_id,
          retailer_listing_id,
          schema_version,
          stock_observation_id,
          stockhawk_identity
        )
        select
          batch.id,
          ${`${blockedCommand.idempotencyKey}:listing_discovered`},
          listing_observation.observed_at,
          'listing_discovered',
          listing_observation.id,
          'active',
          null,
          active_match.product_id,
          listing.id,
          1,
          null,
          'evt_reserved_required_event_conflict'
        from observation_batch as batch
        inner join retailer_listing_observation as listing_observation
          on listing_observation.batch_id = batch.id
        inner join retailer_listing as listing
          on listing.id = listing_observation.retailer_listing_id
        inner join catalog_match as active_match
          on active_match.retailer_listing_id = listing.id
          and active_match.active
        where batch.stockhawk_identity = ${seedCommand.batchIdentity}
      `;

      await expect(
        catalogDatabase.commitObservationBatch(blockedCommand),
      ).rejects.toMatchObject({ cause: { code: "23505" } });

      const [counts] = await sqlClient<{ batches: number; listings: number }[]>`
        select
          count(*) filter (
            where batch.stockhawk_identity = ${blockedCommand.batchIdentity}
          )::integer as batches,
          count(*) filter (
            where listing.stockhawk_identity = ${blockedCommand.listing.identity}
          )::integer as listings
        from observation_batch as batch
        full join retailer_listing as listing on false
      `;
      expect(counts).toEqual({ batches: 0, listings: 0 });
    } finally {
      await sqlClient.end();
    }
  });

  it("rejects Change Events with causal observations from another batch", async () => {
    const catalogDatabase = getDatabase();
    const claimedBatchCommand = commandForListing("event_claimed_batch");
    const observedCommand = commandForListing("event_actual_batch");
    const sqlClient = postgres(testUrl.toString(), { max: 1 });

    await catalogDatabase.commitObservationBatch(claimedBatchCommand);
    await catalogDatabase.commitObservationBatch(observedCommand);

    try {
      await expect(
        sqlClient`
          insert into change_event (
            batch_id,
            causal_idempotency_key,
            effective_at,
            event_type,
            listing_observation_id,
            new_value,
            previous_value,
            product_id,
            retailer_listing_id,
            schema_version,
            stock_observation_id,
            stockhawk_identity
          )
          select
            claimed_batch.id,
            'event_mismatched_causality',
            stock_observation.observed_at,
            'stock_status_changed',
            listing_observation.id,
            stock_observation.status,
            'unknown',
            active_match.product_id,
            listing.id,
            1,
            stock_observation.id,
            'evt_mismatched_causality'
          from observation_batch as claimed_batch
          cross join retailer_listing as listing
          inner join retailer_listing_observation as listing_observation
            on listing_observation.retailer_listing_id = listing.id
          inner join stock_observation
            on stock_observation.batch_id = listing_observation.batch_id
            and stock_observation.retailer_listing_id = listing.id
          inner join catalog_match as active_match
            on active_match.retailer_listing_id = listing.id
            and active_match.active
          where claimed_batch.stockhawk_identity = ${claimedBatchCommand.batchIdentity}
            and listing.stockhawk_identity = ${observedCommand.listing.identity}
        `,
      ).rejects.toMatchObject({ code: "23503" });
    } finally {
      await sqlClient.end();
    }
  });

  it("requires the causal observation for each Change Event type", async () => {
    const catalogDatabase = getDatabase();
    const missingObservationCommand = commandForListing(
      "event_missing_observation",
    );
    const sqlClient = postgres(testUrl.toString(), { max: 1 });

    await catalogDatabase.commitObservationBatch(missingObservationCommand);

    try {
      await expect(
        sqlClient`
          insert into change_event (
            batch_id,
            causal_idempotency_key,
            effective_at,
            event_type,
            listing_observation_id,
            new_value,
            previous_value,
            product_id,
            retailer_listing_id,
            schema_version,
            stock_observation_id,
            stockhawk_identity
          )
          select
            batch.id,
            'event_missing_stock_observation',
            listing_observation.observed_at,
            'stock_status_changed',
            listing_observation.id,
            'in_stock',
            'unknown',
            active_match.product_id,
            listing.id,
            1,
            null,
            'evt_missing_stock_observation'
          from observation_batch as batch
          inner join retailer_listing_observation as listing_observation
            on listing_observation.batch_id = batch.id
          inner join retailer_listing as listing
            on listing.id = listing_observation.retailer_listing_id
          inner join catalog_match as active_match
            on active_match.retailer_listing_id = listing.id
            and active_match.active
          where batch.stockhawk_identity = ${missingObservationCommand.batchIdentity}
        `,
      ).rejects.toMatchObject({ code: "23514" });
    } finally {
      await sqlClient.end();
    }
  });

  it("keeps inactive Search Documents out of normal Offer search", async () => {
    const catalogDatabase = getDatabase();
    const sqlClient = postgres(testUrl.toString(), { max: 1 });

    try {
      await sqlClient`
        update retailer_listing
        set listing_presence = 'inactive'
        where stockhawk_identity = ${command.listing.identity}
      `;
      await catalogDatabase.rebuildSearchDocuments();

      const result = await catalogDatabase.searchOffers({
        freshness: "all",
        q: ["liltulips.com"],
        stock: "all",
        view: "flat",
      });
      expect(result.items).not.toContainEqual(
        expect.objectContaining({
          listingIdentity: command.listing.identity,
        }),
      );
    } finally {
      await sqlClient`
        update retailer_listing
        set listing_presence = 'active'
        where stockhawk_identity = ${command.listing.identity}
      `;
      await catalogDatabase.rebuildSearchDocuments();
      await sqlClient.end();
    }
  });

  it("reactivates a listing from a newer positive observation with a causal event", async () => {
    const catalogDatabase = getDatabase();
    const baseCommand = commandForListing("reappearance");
    const initialCommand = {
      ...baseCommand,
      listing: {
        ...baseCommand.listing,
        purchaseUrl: "https://liltulips.com/products/reappearance-dragon",
        rawTitle: "Reappearance Dragon — Medium",
      },
    } satisfies CommitObservationBatchCommand;
    const reappearanceCommand = nextObservation({
      prior: initialCommand,
      suffix: "reappearance_newer",
      observedAt: "2026-07-22T20:00:00.000Z",
      observationOrder: 2,
      status: "in_stock",
    });
    const sqlClient = postgres(testUrl.toString(), { max: 1 });

    await catalogDatabase.commitObservationBatch(initialCommand);

    try {
      await sqlClient`
        update retailer_listing
        set listing_presence = 'inactive'
        where stockhawk_identity = ${initialCommand.listing.identity}
      `;
      await catalogDatabase.rebuildSearchDocuments();

      await expect(
        catalogDatabase.commitObservationBatch(reappearanceCommand),
      ).resolves.toEqual({
        batchIdentity: reappearanceCommand.batchIdentity,
        outcome: "committed",
      });
      await expect(
        catalogDatabase.searchOffers({
          freshness: "all",
          q: [initialCommand.listing.rawTitle],
          stock: "all",
          view: "flat",
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          items: [
            expect.objectContaining({
              listingIdentity: initialCommand.listing.identity,
              listingPresence: "active",
            }),
          ],
          total: 1,
        }),
      );
      await expect(
        catalogDatabase.readChangeEvents({
          listingIdentity: initialCommand.listing.identity,
        }),
      ).resolves.toContainEqual(
        expect.objectContaining({
          eventType: "listing_reappeared",
          newValue: "active",
          previousValue: "inactive",
        }),
      );
    } finally {
      await sqlClient`
        update retailer_listing
        set listing_presence = 'active'
        where stockhawk_identity = ${initialCommand.listing.identity}
      `;
      await catalogDatabase.rebuildSearchDocuments();
      await sqlClient.end();
    }
  });

  it("decides reappearance from Listing Presence read under the row lock", async () => {
    const catalogDatabase = getDatabase();
    const baseCommand = commandForListing("reappearance_lock");
    const initialCommand = {
      ...baseCommand,
      listing: {
        ...baseCommand.listing,
        purchaseUrl: "https://liltulips.com/products/reappearance-lock-dragon",
        rawTitle: "Reappearance Lock Dragon — Medium",
      },
    } satisfies CommitObservationBatchCommand;
    const reappearanceCommand = nextObservation({
      prior: initialCommand,
      suffix: "reappearance_lock_newer",
      observedAt: "2026-07-22T20:05:00.000Z",
      observationOrder: 2,
      status: "in_stock",
    });
    const lockClient = postgres(testUrl.toString(), { max: 1 });
    const observerClient = postgres(testUrl.toString(), { max: 1 });
    let concurrentCommit:
      ReturnType<typeof catalogDatabase.commitObservationBatch> | undefined;

    await catalogDatabase.commitObservationBatch(initialCommand);

    try {
      await lockClient.begin(async (transaction) => {
        await transaction`
          select id
          from retailer_listing
          where stockhawk_identity = ${initialCommand.listing.identity}
          for update
        `;
        concurrentCommit =
          catalogDatabase.commitObservationBatch(reappearanceCommand);
        await waitForRetailerListingLockWaiter(observerClient);
        await transaction`
          update retailer_listing
          set listing_presence = 'inactive'
          where stockhawk_identity = ${initialCommand.listing.identity}
        `;
      });

      await expect(concurrentCommit).resolves.toEqual({
        batchIdentity: reappearanceCommand.batchIdentity,
        outcome: "committed",
      });
      await expect(
        catalogDatabase.searchOffers({
          freshness: "all",
          q: [initialCommand.listing.rawTitle],
          stock: "all",
          view: "flat",
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          items: [
            expect.objectContaining({
              listingIdentity: initialCommand.listing.identity,
              listingPresence: "active",
            }),
          ],
          total: 1,
        }),
      );
      await expect(
        catalogDatabase.readChangeEvents({
          listingIdentity: initialCommand.listing.identity,
        }),
      ).resolves.toContainEqual(
        expect.objectContaining({
          eventType: "listing_reappeared",
          newValue: "active",
          previousValue: "inactive",
        }),
      );
    } finally {
      await concurrentCommit?.catch(() => undefined);
      await observerClient`
        update retailer_listing
        set listing_presence = 'active'
        where stockhawk_identity = ${initialCommand.listing.identity}
      `;
      await catalogDatabase.rebuildSearchDocuments();
      await lockClient.end();
      await observerClient.end();
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
