import { randomBytes, randomUUID } from "node:crypto";

import type { HealthRefreshCommand } from "@stockhawk/contracts";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { decodeDatabaseConfig } from "./config.js";
import { createDatabase, type Database } from "./database.js";
import { migrateDatabase } from "./migration.js";

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
    },
    ownerCommandQueue: {
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

const createSession = async () =>
  getDatabase().createAdminSession({
    csrfTokenHash: "b".repeat(64),
    expiresAt: new Date(Date.now() + 60_000),
    sessionTokenHash: randomUUID().replaceAll("-", "").padEnd(64, "a"),
  });

const healthRefreshCommand = (): HealthRefreshCommand => ({
  family: "refresh_health",
  idempotencyKey: randomUUID(),
  schemaVersion: 1,
});

describe("owner command Persistence Boundary", () => {
  it("persists a server session until its exact expiry", async () => {
    const ownerDatabase = getDatabase();
    const session = await createSession();

    await expect(
      ownerDatabase.findActiveAdminSession({
        now: new Date(session.expiresAt.getTime() - 1),
        sessionTokenHash: session.sessionTokenHash,
      }),
    ).resolves.toEqual(session);
    await expect(
      ownerDatabase.findActiveAdminSession({
        now: session.expiresAt,
        sessionTokenHash: session.sessionTokenHash,
      }),
    ).resolves.toBeNull();
  });

  it("atomically queues one job and replays one durable receipt", async () => {
    const ownerDatabase = getDatabase();
    const session = await createSession();
    const command = healthRefreshCommand();

    const firstReceipt = await ownerDatabase.enqueueOwnerCommand({
      command,
      requestedBySessionId: session.id,
    });
    const replayedReceipt = await ownerDatabase.enqueueOwnerCommand({
      command,
      requestedBySessionId: session.id,
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
    const session = await createSession();
    const command = healthRefreshCommand();
    const receipt = await ownerDatabase.enqueueOwnerCommand({
      command,
      requestedBySessionId: session.id,
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

  it("rolls back the receipt when its session cannot own the intent", async () => {
    const ownerDatabase = getDatabase();
    const command = healthRefreshCommand();

    await expect(
      ownerDatabase.enqueueOwnerCommand({
        command,
        requestedBySessionId: Number.MAX_SAFE_INTEGER,
      }),
    ).rejects.toMatchObject({
      cause: { constraint_name: "owner_command_receipt_session_fk" },
    });
    await expect(
      ownerDatabase.findOwnerCommandByIdempotencyKey(command.idempotencyKey),
    ).resolves.toBeNull();
  });
});
