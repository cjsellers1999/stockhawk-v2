import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";

import { decodeDatabaseConfig } from "./config.js";

const versionFourMigrations = [
  "0000_bootstrap.sql",
  "0001_catalog_persistence.sql",
  "0002_strengthen_catalog_invariants.sql",
  "0003_search_document_source.sql",
  "0004_enforce_batch_event_causality.sql",
] as const;

const baseUrl = new URL(decodeDatabaseConfig(process.env).url);
const adminUrl = new URL(baseUrl);
adminUrl.pathname = "/postgres";
adminUrl.search = "";

const adminClient = postgres(adminUrl.toString(), { max: 1 });

const requireId = (row: { id: number } | undefined, subject: string) => {
  if (row === undefined) {
    throw new Error(`Expected ${subject} insert to return an id`);
  }
  return row.id;
};

const applyMigration = async (
  client: ReturnType<typeof postgres>,
  migrationName: string,
) => {
  const migration = await readFile(
    fileURLToPath(new URL(`../migrations/${migrationName}`, import.meta.url)),
    "utf8",
  );
  const statements = migration
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  await client.begin(async (transaction) => {
    await statements.reduce(
      (pending, statement) =>
        pending.then(() => transaction.unsafe(statement).then(() => undefined)),
      Promise.resolve(),
    );
  });
};

const seedVersionFourListing = async (
  client: ReturnType<typeof postgres>,
  exactCurrentFacts: boolean,
) => {
  const [storefront] = await client<{ id: number }[]>`
    insert into storefront (
      hostname,
      name,
      origin,
      stockhawk_identity
    ) values (
      'migration.example',
      'Migration Store',
      'https://migration.example',
      'stf_migration'
    )
    returning id::integer as id
  `;
  const [evidence] = await client<{ id: number }[]>`
    insert into source_evidence_artifact (
      content_hash,
      observed_at,
      source_url,
      stockhawk_identity
    ) values (
      ${"a".repeat(64)},
      '2026-07-22T18:00:00.000Z',
      'https://migration.example/dragon',
      'evd_migration'
    )
    returning id::integer as id
  `;
  const [staleBatch] = await client<{ id: number }[]>`
    insert into observation_batch (
      command_hash,
      idempotency_key,
      run_identity,
      schema_version,
      stockhawk_identity
    ) values (
      ${"b".repeat(64)},
      'commit_migration_stale',
      'run_migration_stale',
      1,
      'batch_migration_stale'
    )
    returning id::integer as id
  `;
  const [currentBatch] = await client<{ id: number }[]>`
    insert into observation_batch (
      command_hash,
      idempotency_key,
      run_identity,
      schema_version,
      stockhawk_identity
    ) values (
      ${"c".repeat(64)},
      'commit_migration_current',
      'run_migration_current',
      1,
      'batch_migration_current'
    )
    returning id::integer as id
  `;
  const storefrontId = requireId(storefront, "Storefront");
  const evidenceId = requireId(evidence, "Source Evidence Artifact");
  const staleBatchId = requireId(staleBatch, "stale Observation Batch");
  const currentBatchId = requireId(currentBatch, "current Observation Batch");
  const [listing] = await client<{ id: number }[]>`
    insert into retailer_listing (
      current_observation_order,
      current_observed_at,
      image_url,
      listing_presence,
      purchase_url,
      raw_title,
      source_identity_namespace,
      source_identity_rule_version,
      source_identity_value,
      stockhawk_identity,
      storefront_id
    ) values (
      2,
      '2026-07-22T18:05:00.000Z',
      'https://migration.example/current.jpg',
      'active',
      'https://migration.example/current',
      ${exactCurrentFacts ? "Current Dragon" : "Unmatched Dragon"},
      'fixture-product-handle',
      1,
      'migration-dragon',
      'lst_migration',
      ${storefrontId}
    )
    returning id::integer as id
  `;
  const listingId = requireId(listing, "Retailer Listing");

  await client`
    insert into retailer_listing_observation (
      batch_id,
      evidence_artifact_id,
      image_url,
      observation_order,
      observed_at,
      purchase_url,
      raw_title,
      retailer_listing_id,
      stockhawk_identity
    ) values
      (
        ${staleBatchId},
        ${evidenceId},
        null,
        1,
        '2026-07-22T18:00:00.000Z',
        'https://migration.example/stale',
        'Stale Dragon',
        ${listingId},
        'obs_migration_stale'
      ),
      (
        ${currentBatchId},
        ${evidenceId},
        'https://migration.example/current.jpg',
        2,
        '2026-07-22T18:05:00.000Z',
        'https://migration.example/current',
        'Current Dragon',
        ${listingId},
        'obs_migration_current'
      )
  `;
};

const withVersionFourDatabase = async (
  suffix: string,
  callback: (client: ReturnType<typeof postgres>) => Promise<void>,
) => {
  const databaseName = `stockhawk_migration_${process.pid}_${suffix}_${randomBytes(4).toString("hex")}`;
  const databaseUrl = new URL(baseUrl);
  databaseUrl.pathname = `/${databaseName}`;
  databaseUrl.search = "";

  await adminClient.unsafe(`create database "${databaseName}"`);
  const client = postgres(databaseUrl.toString(), { max: 1 });

  try {
    await versionFourMigrations.reduce(
      (pending, migration) =>
        pending.then(() => applyMigration(client, migration)),
      Promise.resolve(),
    );
    await callback(client);
  } finally {
    await client.end();
    await adminClient.unsafe(`drop database if exists "${databaseName}"`);
  }
};

afterAll(async () => {
  await adminClient.end();
});

describe("current Listing State migration", () => {
  it("upgrades populated version-four data without losing stale or current facts", async () => {
    await withVersionFourDatabase("valid", async (client) => {
      await seedVersionFourListing(client, true);

      await applyMigration(client, "0005_normalize_current_listing_state.sql");

      const current = await client<
        {
          observation_order: number;
          purchase_url: string;
          raw_title: string;
        }[]
      >`
        select
          observation.observation_order::integer as observation_order,
          observation.purchase_url,
          observation.raw_title
        from current_listing_state as current
        inner join retailer_listing_observation as observation
          on observation.id = current.listing_observation_id
          and observation.retailer_listing_id = current.retailer_listing_id
      `;
      const observations = await client<
        {
          observation_order: number;
          purchase_url: string;
          raw_title: string;
        }[]
      >`
        select
          observation_order::integer as observation_order,
          purchase_url,
          raw_title
        from retailer_listing_observation
        order by observation_order
      `;
      const legacyColumns = await client<{ column_name: string }[]>`
        select column_name
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'retailer_listing'
          and column_name in (
            'current_observation_order',
            'current_observed_at',
            'image_url',
            'purchase_url',
            'raw_title'
          )
      `;

      expect(current).toEqual([
        {
          observation_order: 2,
          purchase_url: "https://migration.example/current",
          raw_title: "Current Dragon",
        },
      ]);
      expect(observations).toEqual([
        {
          observation_order: 1,
          purchase_url: "https://migration.example/stale",
          raw_title: "Stale Dragon",
        },
        {
          observation_order: 2,
          purchase_url: "https://migration.example/current",
          raw_title: "Current Dragon",
        },
      ]);
      expect(legacyColumns).toEqual([]);
    });
  });

  it("rejects unmatched current facts and rolls the migration back atomically", async () => {
    await withVersionFourDatabase("invalid", async (client) => {
      await seedVersionFourListing(client, false);

      await expect(
        applyMigration(client, "0005_normalize_current_listing_state.sql"),
      ).rejects.toThrow(
        "Retailer Listing current facts lack an exact immutable observation",
      );

      const [stateTable] = await client<{ table_name: string | null }[]>`
        select to_regclass('public.current_listing_state')::text as table_name
      `;
      const listing = await client<
        { current_observation_order: number; raw_title: string }[]
      >`
        select
          current_observation_order::integer as current_observation_order,
          raw_title
        from retailer_listing
      `;
      const [observationCount] = await client<{ count: number }[]>`
        select count(*)::integer as count
        from retailer_listing_observation
      `;

      expect(stateTable?.table_name).toBeNull();
      expect(listing).toEqual([
        {
          current_observation_order: 2,
          raw_title: "Unmatched Dragon",
        },
      ]);
      expect(observationCount?.count).toBe(2);
    });
  });
});
