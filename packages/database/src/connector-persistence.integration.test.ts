import { randomBytes } from "node:crypto";

import type { CommitConnectorBatchCommand } from "@stockhawk/contracts";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { decodeDatabaseConfig } from "./config.js";
import { createDatabase, type Database } from "./database.js";
import { migrateDatabase } from "./migration.js";

const testDatabaseName = `stockhawk_connector_${process.pid}_${randomBytes(6).toString("hex")}`;
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
    throw new Error("Expected the isolated Connector database to be ready");
  }
  return database;
};

const command = {
  batch: {
    checkpoint: {
      schemaVersion: 1,
      value: { cursor: "page-2" },
    },
    evidence: [
      {
        content: '{"products":[]}',
        contentHash:
          "86d8b086af0fc30d06856e218fcfdb6b803f91b45f50b1b753d8deac627fc054",
        identity: "evd_fixture_page_1",
        mediaType: "application/json",
        observedAt: "2026-07-24T17:00:00.000Z",
        sourceUrl: "https://fixture.store/catalog",
      },
    ],
    identity: "batch_fixture_page_1",
    observations: [
      {
        accessMethod: "http",
        evidenceIdentity: "evd_fixture_page_1",
        imageUrl: null,
        observedAt: "2026-07-24T17:00:00.000Z",
        parentSourceIdentity: {
          namespace: "fixture-product",
          ruleVersion: 1,
          value: "sky-dragon",
        },
        purchaseUrl: "https://fixture.store/products/sky-dragon-medium",
        rawAvailability: { available: true },
        rawFacts: { source: "fixture-http" },
        rawTitle: "Sky Dragon — Medium",
        stockStatus: "in_stock",
        variantSourceIdentity: {
          namespace: "fixture-variant",
          ruleVersion: 1,
          value: "sky-dragon-medium",
        },
      },
    ],
    runIdentity: "run_fixture_discovery",
    schemaVersion: 1,
    sequence: 0,
  },
  run: {
    adapterId: "fixture-http",
    adapterVersion: "1.0.0",
    identity: "run_fixture_discovery",
    integrationIdentity: "int_fixture_v1",
    job: "catalog_discovery",
    resumeMode: "checkpoint",
  },
  schemaVersion: 1,
} satisfies CommitConnectorBatchCommand;

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

describe("Connector Persistence Boundary", () => {
  it("atomically persists a bounded batch and opaque checkpoint", async () => {
    const connectorDatabase = getDatabase();

    await expect(
      connectorDatabase.commitConnectorBatch(command),
    ).resolves.toEqual({
      batchIdentity: command.batch.identity,
      outcome: "committed",
    });
    await expect(
      connectorDatabase.readConnectorRun({
        runIdentity: command.run.identity,
      }),
    ).resolves.toEqual({
      checkpoint: command.batch.checkpoint,
      latestSequence: 0,
      resumeMode: "checkpoint",
      runIdentity: command.run.identity,
    });
    await expect(
      connectorDatabase.readConnectorBatch({
        batchIdentity: command.batch.identity,
      }),
    ).resolves.toEqual({
      batchIdentity: command.batch.identity,
      evidenceCount: 1,
      observationCount: 1,
    });
  });

  it("replays identical input without advancing the checkpoint twice", async () => {
    const replayCommand = {
      ...command,
      batch: {
        ...command.batch,
        evidence: command.batch.evidence.map((artifact) => ({
          ...artifact,
          identity: "evd_fixture_replay_page_1",
        })),
        identity: "batch_fixture_replay",
        observations: command.batch.observations.map((observation) => ({
          ...observation,
          evidenceIdentity: "evd_fixture_replay_page_1",
        })),
      },
      run: {
        ...command.run,
        identity: "run_fixture_replay",
      },
    } satisfies CommitConnectorBatchCommand;
    replayCommand.batch.runIdentity = replayCommand.run.identity;
    const connectorDatabase = getDatabase();

    await connectorDatabase.commitConnectorBatch(replayCommand);

    await expect(
      connectorDatabase.commitConnectorBatch(replayCommand),
    ).resolves.toEqual({
      batchIdentity: replayCommand.batch.identity,
      outcome: "replayed",
    });
    await expect(
      connectorDatabase.readConnectorBatch({
        batchIdentity: replayCommand.batch.identity,
      }),
    ).resolves.toEqual({
      batchIdentity: replayCommand.batch.identity,
      evidenceCount: 1,
      observationCount: 1,
    });
    await expect(
      connectorDatabase.readConnectorRun({
        runIdentity: replayCommand.run.identity,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        latestSequence: 0,
      }),
    );
  });

  it("replays restart-only redelivery despite later observation timestamps", async () => {
    const restartCommand = {
      ...command,
      batch: {
        ...command.batch,
        checkpoint: null,
        evidence: command.batch.evidence.map((artifact) => ({
          ...artifact,
          identity: "evd_fixture_restart_page_1",
        })),
        identity: "batch_fixture_restart_page_1",
        observations: command.batch.observations.map((observation) => ({
          ...observation,
          evidenceIdentity: "evd_fixture_restart_page_1",
        })),
        runIdentity: "run_fixture_restart",
      },
      run: {
        ...command.run,
        identity: "run_fixture_restart",
        resumeMode: "restart_only",
      },
    } satisfies CommitConnectorBatchCommand;
    const connectorDatabase = getDatabase();
    await connectorDatabase.commitConnectorBatch(restartCommand);

    await expect(
      connectorDatabase.commitConnectorBatch({
        ...restartCommand,
        batch: {
          ...restartCommand.batch,
          evidence: restartCommand.batch.evidence.map((artifact) => ({
            ...artifact,
            observedAt: "2026-07-24T18:00:00.000Z",
          })),
          observations: restartCommand.batch.observations.map(
            (observation) => ({
              ...observation,
              observedAt: "2026-07-24T18:00:00.000Z",
            }),
          ),
        },
      }),
    ).resolves.toEqual({
      batchIdentity: restartCommand.batch.identity,
      outcome: "replayed",
    });
  });

  it("replays semantically identical JSON with reordered object keys", async () => {
    const runIdentity = "run_fixture_canonical_json";
    const evidenceIdentity = "evd_fixture_canonical_json";
    const baseObservation = command.batch.observations[0];
    if (baseObservation === undefined) {
      throw new Error("Expected the Connector fixture observation");
    }
    const canonicalCommand = {
      ...command,
      batch: {
        ...command.batch,
        evidence: command.batch.evidence.map((artifact) => ({
          ...artifact,
          identity: evidenceIdentity,
        })),
        identity: "batch_fixture_canonical_json",
        observations: [
          {
            ...baseObservation,
            evidenceIdentity,
            rawFacts: { alpha: 1, nested: { alpha: 1, beta: 2 } },
          },
        ],
        runIdentity,
      },
      run: {
        ...command.run,
        identity: runIdentity,
      },
    } satisfies CommitConnectorBatchCommand;
    const connectorDatabase = getDatabase();
    await connectorDatabase.commitConnectorBatch(canonicalCommand);

    await expect(
      connectorDatabase.commitConnectorBatch({
        ...canonicalCommand,
        batch: {
          ...canonicalCommand.batch,
          observations: canonicalCommand.batch.observations.map(
            (observation) => ({
              ...observation,
              rawFacts: { nested: { beta: 2, alpha: 1 }, alpha: 1 },
            }),
          ),
        },
      }),
    ).resolves.toEqual({
      batchIdentity: canonicalCommand.batch.identity,
      outcome: "replayed",
    });
  });

  it("continues a checkpointed run at the next durable sequence", async () => {
    const runIdentity = "run_fixture_checkpoint_resume";
    const first = {
      ...command,
      batch: {
        ...command.batch,
        evidence: command.batch.evidence.map((artifact) => ({
          ...artifact,
          identity: "evd_fixture_checkpoint_page_1",
        })),
        identity: "batch_fixture_checkpoint_page_1",
        observations: command.batch.observations.map((observation) => ({
          ...observation,
          evidenceIdentity: "evd_fixture_checkpoint_page_1",
        })),
        runIdentity,
      },
      run: {
        ...command.run,
        identity: runIdentity,
      },
    } satisfies CommitConnectorBatchCommand;
    const second = {
      ...first,
      batch: {
        ...first.batch,
        checkpoint: null,
        evidence: first.batch.evidence.map((artifact) => ({
          ...artifact,
          identity: "evd_fixture_checkpoint_page_2",
        })),
        identity: "batch_fixture_checkpoint_page_2",
        observations: first.batch.observations.map((observation) => ({
          ...observation,
          evidenceIdentity: "evd_fixture_checkpoint_page_2",
        })),
        sequence: 1,
      },
    } satisfies CommitConnectorBatchCommand;
    const connectorDatabase = getDatabase();

    await connectorDatabase.commitConnectorBatch(first);
    await expect(
      connectorDatabase.commitConnectorBatch(second),
    ).resolves.toEqual({
      batchIdentity: second.batch.identity,
      outcome: "committed",
    });
    await expect(
      connectorDatabase.readConnectorRun({ runIdentity }),
    ).resolves.toEqual(expect.objectContaining({ latestSequence: 1 }));
  });

  it("persists distinct colon-bearing source identity tuples", async () => {
    const runIdentity = "run_fixture_colon_identities";
    const evidenceIdentity = "evd_fixture_colon_identities";
    const baseObservation = command.batch.observations[0];
    if (baseObservation === undefined) {
      throw new Error("Expected the Connector fixture observation");
    }
    const collisionCommand = {
      ...command,
      batch: {
        ...command.batch,
        evidence: command.batch.evidence.map((artifact) => ({
          ...artifact,
          identity: evidenceIdentity,
        })),
        identity: "batch_fixture_colon_identities",
        observations: [
          {
            ...baseObservation,
            evidenceIdentity,
            variantSourceIdentity: {
              namespace: "fixture:1",
              ruleVersion: 2,
              value: "dragon",
            },
          },
          {
            ...baseObservation,
            evidenceIdentity,
            variantSourceIdentity: {
              namespace: "fixture",
              ruleVersion: 1,
              value: "2:dragon",
            },
          },
        ],
        runIdentity,
      },
      run: {
        ...command.run,
        identity: runIdentity,
      },
    } satisfies CommitConnectorBatchCommand;
    const connectorDatabase = getDatabase();

    await expect(
      connectorDatabase.commitConnectorBatch(collisionCommand),
    ).resolves.toEqual({
      batchIdentity: collisionCommand.batch.identity,
      outcome: "committed",
    });
    await expect(
      connectorDatabase.readConnectorBatch({
        batchIdentity: collisionCommand.batch.identity,
      }),
    ).resolves.toEqual({
      batchIdentity: collisionCommand.batch.identity,
      evidenceCount: 1,
      observationCount: 2,
    });
  });

  it("rejects conflicting batch identity reuse and sequence gaps", async () => {
    const connectorDatabase = getDatabase();
    const conflicting = {
      ...command,
      batch: {
        ...command.batch,
        checkpoint: null,
      },
    } satisfies CommitConnectorBatchCommand;

    await expect(
      connectorDatabase.commitConnectorBatch(conflicting),
    ).rejects.toThrow(/reused with different input/i);

    const skipped = {
      ...command,
      batch: {
        ...command.batch,
        identity: "batch_fixture_page_3",
        sequence: 2,
      },
    } satisfies CommitConnectorBatchCommand;
    await expect(
      connectorDatabase.commitConnectorBatch(skipped),
    ).rejects.toThrow(/next contiguous sequence/i);
  });

  it("rejects retained evidence whose content does not match its hash", async () => {
    const invalidEvidence = {
      ...command,
      batch: {
        ...command.batch,
        evidence: command.batch.evidence.map((artifact) => ({
          ...artifact,
          content: '{"tampered":true}',
        })),
        identity: "batch_fixture_invalid_evidence",
        runIdentity: "run_fixture_invalid_evidence",
      },
      run: {
        ...command.run,
        identity: "run_fixture_invalid_evidence",
      },
    } satisfies CommitConnectorBatchCommand;

    await expect(
      getDatabase().commitConnectorBatch(invalidEvidence),
    ).rejects.toThrow(/content hash/i);
  });
});
