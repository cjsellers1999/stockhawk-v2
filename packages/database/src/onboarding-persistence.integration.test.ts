import { randomBytes, randomUUID } from "node:crypto";
import { resolve } from "node:path";

import type { OnboardingCaseCommand } from "@stockhawk/contracts";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { decodeDatabaseConfig } from "./config.js";
import { createDatabase, type Database } from "./database.js";
import { migrateDatabase } from "./migration.js";
import { readSeedWorkbook } from "./seed-workbook.js";

const config = decodeDatabaseConfig(process.env);
const testDatabaseName = `stockhawk_onboarding_${process.pid}_${randomBytes(6).toString("hex")}`;
const baseUrl = new URL(config.url);
const adminUrl = new URL(baseUrl);
adminUrl.pathname = "/postgres";
adminUrl.search = "";
const testUrl = new URL(baseUrl);
testUrl.pathname = `/${testDatabaseName}`;
testUrl.search = "";
const adminClient = postgres(adminUrl.toString(), { max: 1 });
const workbookPath = resolve(
  import.meta.dirname,
  "../../../data/seed/stockhawk-sites.xlsx",
);
let database: Database | undefined;

const getDatabase = () => {
  if (database === undefined) {
    throw new Error("Expected the isolated onboarding database to be ready");
  }
  return database;
};

beforeAll(async () => {
  await adminClient.unsafe(`create database "${testDatabaseName}"`);
  await migrateDatabase(testUrl.toString());
  database = createDatabase(testUrl.toString(), {
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

describe("Seed List and Onboarding Case Persistence Boundary", () => {
  it("atomically imports, reconciles, replays, and resumes one durable case", async () => {
    const onboardingDatabase = getDatabase();
    const seed = await readSeedWorkbook(workbookPath);

    await expect(onboardingDatabase.importSeedWorkbook(seed)).resolves.toEqual({
      candidateSiteCount: 2_489,
      focusCaseIdentity: expect.stringMatching(/^obc_[a-f0-9]{32}$/),
      importIdentity: seed.importIdentity,
      outcome: "imported",
      sourceRecordCount: 2_712,
    });
    const suspendedProgress = await onboardingDatabase.findOnboardingProgress();
    expect(suspendedProgress).toMatchObject({
      candidateSites: 2_489,
      cases: {
        inProgress: 0,
        queued: 0,
        resolved: 0,
        suspended: 1,
        total: 1,
      },
      focusCase: {
        nextAction: "Resume onboarding preflight",
        revision: 0,
        sourceRecordCount: 2,
        stage: "preflight",
        status: "suspended",
        terminal: false,
        waitReason: "Awaiting explicit owner resume",
      },
      remainingCandidateSites: 2_488,
      sourceRecords: { reconciled: 2_712, total: 2_712 },
    });
    await expect(onboardingDatabase.importSeedWorkbook(seed)).resolves.toEqual({
      candidateSiteCount: 2_489,
      focusCaseIdentity: suspendedProgress?.focusCase?.identity,
      importIdentity: seed.importIdentity,
      outcome: "replayed",
      sourceRecordCount: 2_712,
    });

    const focusCase = suspendedProgress?.focusCase;
    if (focusCase === null || focusCase === undefined) {
      throw new Error("Expected one suspended Onboarding Case");
    }
    const command: OnboardingCaseCommand = {
      action: "resume",
      caseIdentity: focusCase.identity,
      expectedRevision: focusCase.revision,
      family: "resume_onboarding",
      idempotencyKey: randomUUID(),
      schemaVersion: 1,
    };
    const queuedReceipt = await onboardingDatabase.enqueueOwnerCommand(command);
    await expect(
      onboardingDatabase.enqueueOwnerCommand(command),
    ).resolves.toEqual(queuedReceipt);
    await expect(
      onboardingDatabase.findOnboardingProgress(),
    ).resolves.toMatchObject({
      focusCase: {
        revision: 0,
        stage: "preflight",
        status: "suspended",
      },
    });

    await expect(onboardingDatabase.processNextOwnerCommand()).resolves.toBe(
      true,
    );
    await expect(
      onboardingDatabase.findOwnerCommandByIdempotencyKey(
        command.idempotencyKey,
      ),
    ).resolves.toMatchObject({
      command,
      receiptId: queuedReceipt.receiptId,
      status: "completed",
    });
    await expect(
      onboardingDatabase.findOnboardingProgress(),
    ).resolves.toMatchObject({
      cases: {
        inProgress: 0,
        queued: 1,
        resolved: 0,
        suspended: 0,
        total: 1,
      },
      focusCase: {
        candidateIdentity: focusCase.candidateIdentity,
        nextAction: "Run onboarding preflight",
        revision: 1,
        sourceRecordCount: 2,
        stage: "preflight",
        status: "queued",
        terminal: false,
        waitReason: null,
      },
    });
  });
});
