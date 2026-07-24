import { randomBytes, randomUUID } from "node:crypto";

import type { HealthRefreshCommand } from "@stockhawk/contracts";
import { PgBoss } from "pg-boss";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { decodeDatabaseConfig } from "./config.js";
import { createDatabase, type Database } from "./database.js";
import { migrateDatabase } from "./migration.js";
import { OWNER_COMMAND_QUEUE } from "./owner-command-persistence.js";

const config = decodeDatabaseConfig(process.env);
const testDatabaseName = `stockhawk_owner_command_${process.pid}_${randomBytes(6).toString("hex")}`;
const baseUrl = new URL(config.url);
const adminUrl = new URL(baseUrl);
adminUrl.pathname = "/postgres";
adminUrl.search = "";
const testUrl = new URL(baseUrl);
testUrl.pathname = `/${testDatabaseName}`;
testUrl.search = "";
const adminClient = postgres(adminUrl.toString(), { max: 1 });
let rejectHealthRefresh = false;
let beforeApplyHealthRefresh: (() => Promise<void>) | undefined;
let database: Database | undefined;

const getDatabase = () => {
  if (database === undefined) {
    throw new Error("Expected the isolated owner-command database to be ready");
  }
  return database;
};

beforeAll(async () => {
  await adminClient.unsafe(`create database "${testDatabaseName}"`);
  await migrateDatabase(testUrl.toString());
  database = createDatabase(testUrl.toString(), {
    beforeApplyHealthRefresh: async () => {
      if (rejectHealthRefresh) {
        throw new Error("Injected health refresh failure");
      }
      await beforeApplyHealthRefresh?.();
    },
    ownerCommandQueue: {
      expireInSeconds: 1,
      retryBackoff: false,
      retryDelay: 0,
      retryLimit: 0,
    },
  });
  await database.startJobQueue();
});

afterAll(async () => {
  try {
    await database?.close();
    await adminClient.unsafe(`drop database if exists "${testDatabaseName}"`);
  } finally {
    await adminClient.end();
  }
});

const healthRefreshCommand = (): HealthRefreshCommand => ({
  family: "refresh_health",
  idempotencyKey: randomUUID(),
  schemaVersion: 1,
});

describe("owner command Persistence Boundary", () => {
  it("atomically queues one job and replays one durable receipt", async () => {
    const ownerDatabase = getDatabase();
    const attempts = await Promise.allSettled(
      [healthRefreshCommand(), healthRefreshCommand()].map((command) =>
        ownerDatabase.enqueueOwnerCommand({ command }),
      ),
    );
    const accepted = attempts.flatMap((attempt) =>
      attempt.status === "fulfilled" ? [attempt.value] : [],
    );
    const rejected = attempts.flatMap((attempt) =>
      attempt.status === "rejected" ? [attempt.reason] : [],
    );
    expect(accepted).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]).toMatchObject({
      message: "A health refresh command is already queued",
      name: "OwnerCommandInFlightError",
    });
    const firstReceipt = accepted[0];
    if (firstReceipt === undefined) {
      throw new Error("Expected one accepted owner command");
    }
    const command = firstReceipt.command;
    const replayedReceipt = await ownerDatabase.enqueueOwnerCommand({
      command,
    });

    expect(firstReceipt.status).toBe("queued");
    expect(replayedReceipt).toEqual(firstReceipt);
    await expect(
      ownerDatabase.findOwnerCommandByIdempotencyKey(command.idempotencyKey),
    ).resolves.toEqual(firstReceipt);

    await expect(ownerDatabase.processNextOwnerCommand()).resolves.toBe(true);
    await expect(ownerDatabase.processNextOwnerCommand()).resolves.toBe(false);
    await expect(
      ownerDatabase.findOwnerCommandByIdempotencyKey(command.idempotencyKey),
    ).resolves.toMatchObject({
      command,
      receiptId: firstReceipt.receiptId,
      status: "completed",
    });
    await expect(
      ownerDatabase.findHealthRefreshCheckpoint(),
    ).resolves.toMatchObject({
      lastReceiptIdentity: firstReceipt.receiptId,
      refreshCount: 1,
    });
  });

  it("records terminal worker failure without applying domain intent", async () => {
    const ownerDatabase = getDatabase();
    const command = healthRefreshCommand();
    const receipt = await ownerDatabase.enqueueOwnerCommand({
      command,
    });
    rejectHealthRefresh = true;

    try {
      await expect(ownerDatabase.processNextOwnerCommand()).rejects.toThrow(
        "Injected health refresh failure",
      );
    } finally {
      rejectHealthRefresh = false;
    }

    await expect(
      ownerDatabase.findOwnerCommandByIdempotencyKey(command.idempotencyKey),
    ).resolves.toMatchObject({
      completedAt: null,
      failedAt: expect.any(String),
      receiptId: receipt.receiptId,
      status: "failed",
    });
    await expect(
      ownerDatabase.findHealthRefreshCheckpoint(),
    ).resolves.toMatchObject({
      refreshCount: 1,
    });
    await expect(ownerDatabase.processNextOwnerCommand()).resolves.toBe(false);
  });

  it("reconciles a receipt after an abandoned job expires terminally", async () => {
    const ownerDatabase = getDatabase();
    const command = healthRefreshCommand();
    const receipt = await ownerDatabase.enqueueOwnerCommand({
      command,
    });
    const abandonedBoss = new PgBoss({
      connectionString: testUrl.toString(),
      migrate: false,
      monitorIntervalSeconds: 1,
      schedule: false,
      supervise: false,
    });
    abandonedBoss.on("error", () => {});
    await abandonedBoss.start();

    try {
      const [job] = await abandonedBoss.fetch(OWNER_COMMAND_QUEUE, {
        includeMetadata: true,
      });
      if (job === undefined) {
        throw new Error("Expected the owner command job to be fetched");
      }
      await new Promise((resolve) => setTimeout(resolve, 1_200));
      await abandonedBoss.supervise(OWNER_COMMAND_QUEUE);
      await expect(
        abandonedBoss.findJobs(OWNER_COMMAND_QUEUE, { id: job.id }),
      ).resolves.toMatchObject([{ state: "failed" }]);

      await expect(ownerDatabase.processNextOwnerCommand()).resolves.toBe(
        false,
      );
      await expect(
        ownerDatabase.findOwnerCommandByIdempotencyKey(command.idempotencyKey),
      ).resolves.toMatchObject({
        completedAt: null,
        failedAt: expect.any(String),
        receiptId: receipt.receiptId,
        status: "failed",
      });
    } finally {
      await abandonedBoss.stop();
    }
  });

  it("rolls domain success back when an active job expires", async () => {
    const ownerDatabase = getDatabase();
    const command = healthRefreshCommand();
    const receipt = await ownerDatabase.enqueueOwnerCommand({
      command,
    });
    const priorCheckpoint = await ownerDatabase.findHealthRefreshCheckpoint();
    const supervisor = new PgBoss({
      connectionString: testUrl.toString(),
      migrate: false,
      monitorIntervalSeconds: 1,
      schedule: false,
      supervise: false,
    });
    supervisor.on("error", () => {});
    await supervisor.start();
    beforeApplyHealthRefresh = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1_200));
      await supervisor.supervise(OWNER_COMMAND_QUEUE);
    };

    try {
      await expect(ownerDatabase.processNextOwnerCommand()).rejects.toThrow(
        "Owner command job completion was not acknowledged",
      );
    } finally {
      beforeApplyHealthRefresh = undefined;
      await supervisor.stop();
    }

    await expect(
      ownerDatabase.findOwnerCommandByIdempotencyKey(command.idempotencyKey),
    ).resolves.toMatchObject({
      completedAt: null,
      failedAt: expect.any(String),
      receiptId: receipt.receiptId,
      status: "failed",
    });
    await expect(ownerDatabase.findHealthRefreshCheckpoint()).resolves.toEqual(
      priorCheckpoint,
    );
    await expect(ownerDatabase.processNextOwnerCommand()).resolves.toBe(false);
    await expect(
      ownerDatabase.findOwnerCommandByIdempotencyKey(command.idempotencyKey),
    ).resolves.toMatchObject({
      completedAt: null,
      failedAt: expect.any(String),
      receiptId: receipt.receiptId,
      status: "failed",
    });
  });
});
