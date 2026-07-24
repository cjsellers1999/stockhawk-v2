import { createHash, randomUUID } from "node:crypto";

import {
  healthRefreshCommandSchema,
  ownerCommandJobSchema,
  ownerCommandReceiptSchema,
  type HealthRefreshCommand,
  type OwnerCommandReceipt,
} from "@stockhawk/contracts";
import { and, desc, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { PgBoss } from "pg-boss";

import { PersistenceConflictError } from "./catalog-persistence.js";
import { fromStockHawkDrizzle } from "./pg-boss-drizzle-adapter.js";
import {
  healthRefreshCheckpoint,
  ownerCommandReceipt,
  schema,
} from "./schema.js";

type StockHawkDatabase = PostgresJsDatabase<typeof schema>;

export const OWNER_COMMAND_QUEUE = "owner-health-refresh";
const ownerCommandAdvisoryLockNamespace = 1_397_700_001;
const terminalJobStates = new Set(["cancelled", "completed", "failed"]);

export class OwnerCommandInFlightError extends Error {
  constructor() {
    super("A health refresh command is already queued");
    this.name = "OwnerCommandInFlightError";
  }
}

export type OwnerCommandPersistence = {
  enqueueOwnerCommand: (
    command: HealthRefreshCommand,
  ) => Promise<OwnerCommandReceipt>;
  findLatestOwnerCommand: () => Promise<OwnerCommandReceipt | null>;
  findOwnerCommandByIdempotencyKey: (
    idempotencyKey: string,
  ) => Promise<OwnerCommandReceipt | null>;
  findHealthRefreshCheckpoint: () => Promise<{
    lastReceiptIdentity: string;
    refreshCount: number;
    refreshedAt: Date;
  } | null>;
  processNextOwnerCommand: () => Promise<boolean>;
};

const fingerprint = (command: HealthRefreshCommand) =>
  createHash("sha256").update(JSON.stringify(command)).digest("hex");

const toReceipt = (
  row: typeof ownerCommandReceipt.$inferSelect,
): OwnerCommandReceipt =>
  ownerCommandReceiptSchema.parse({
    command: {
      family: row.commandFamily,
      idempotencyKey: row.idempotencyKey,
      schemaVersion: row.commandSchemaVersion,
    },
    completedAt: row.completedAt?.toISOString() ?? null,
    failedAt: row.failedAt?.toISOString() ?? null,
    receiptId: row.stockhawkIdentity,
    requestedAt: row.requestedAt.toISOString(),
    status: row.status,
  });

export const createOwnerCommandPersistence = ({
  beforeApplyHealthRefresh,
  boss,
  database,
}: {
  beforeApplyHealthRefresh?: () => Promise<void>;
  boss: PgBoss;
  database: StockHawkDatabase;
}): OwnerCommandPersistence => {
  const findByIdempotencyKey = async (idempotencyKey: string) => {
    const [receipt] = await database
      .select()
      .from(ownerCommandReceipt)
      .where(eq(ownerCommandReceipt.idempotencyKey, idempotencyKey))
      .limit(1);
    return receipt === undefined ? null : toReceipt(receipt);
  };

  const reconcileTerminalReceipts = async () => {
    const queuedReceipts = await database
      .select({
        jobId: ownerCommandReceipt.jobId,
        receiptId: ownerCommandReceipt.stockhawkIdentity,
      })
      .from(ownerCommandReceipt)
      .where(eq(ownerCommandReceipt.status, "queued"));

    await Promise.all(
      queuedReceipts.map(async (receipt) => {
        const [job] = await boss.findJobs(OWNER_COMMAND_QUEUE, {
          id: receipt.jobId,
        });
        if (job !== undefined && !terminalJobStates.has(job.state)) {
          return;
        }
        await database
          .update(ownerCommandReceipt)
          .set({ failedAt: sql`now()`, status: "failed" })
          .where(
            and(
              eq(ownerCommandReceipt.stockhawkIdentity, receipt.receiptId),
              eq(ownerCommandReceipt.status, "queued"),
            ),
          );
      }),
    );
  };

  return {
    enqueueOwnerCommand: async (unparsedCommand) => {
      const command = healthRefreshCommandSchema.parse(unparsedCommand);
      const commandHash = fingerprint(command);

      return database.transaction(async (transaction) => {
        await transaction.execute(
          sql`select pg_advisory_xact_lock(${ownerCommandAdvisoryLockNamespace}, 1)`,
        );
        const [existing] = await transaction
          .select()
          .from(ownerCommandReceipt)
          .where(eq(ownerCommandReceipt.idempotencyKey, command.idempotencyKey))
          .limit(1);
        if (existing !== undefined) {
          if (existing.commandHash !== commandHash) {
            throw new PersistenceConflictError(
              "Owner command idempotency key was reused with different input",
            );
          }
          return toReceipt(existing);
        }
        const [inFlight] = await transaction
          .select({ id: ownerCommandReceipt.id })
          .from(ownerCommandReceipt)
          .where(
            and(
              eq(ownerCommandReceipt.commandFamily, command.family),
              eq(ownerCommandReceipt.status, "queued"),
            ),
          )
          .limit(1);
        if (inFlight !== undefined) {
          throw new OwnerCommandInFlightError();
        }

        const receiptId = randomUUID();
        const jobId = randomUUID();
        const [inserted] = await transaction
          .insert(ownerCommandReceipt)
          .values({
            commandFamily: command.family,
            commandHash,
            commandSchemaVersion: command.schemaVersion,
            idempotencyKey: command.idempotencyKey,
            jobId,
            status: "queued",
            stockhawkIdentity: receiptId,
          })
          .onConflictDoNothing()
          .returning();

        if (inserted === undefined) {
          throw new PersistenceConflictError(
            "Owner command receipt could not be inserted",
          );
        }

        const queuedJobId = await boss.send(
          OWNER_COMMAND_QUEUE,
          { receiptId, schemaVersion: 1 },
          {
            db: fromStockHawkDrizzle(transaction),
            id: jobId,
          },
        );
        if (queuedJobId !== jobId) {
          throw new Error("Owner command job was not queued");
        }

        return toReceipt(inserted);
      });
    },
    findLatestOwnerCommand: async () => {
      const [latest] = await database
        .select()
        .from(ownerCommandReceipt)
        .where(eq(ownerCommandReceipt.commandFamily, "refresh_health"))
        .orderBy(
          desc(ownerCommandReceipt.requestedAt),
          desc(ownerCommandReceipt.id),
        )
        .limit(1);
      return latest === undefined ? null : toReceipt(latest);
    },
    findHealthRefreshCheckpoint: async () => {
      const [checkpoint] = await database
        .select({
          lastReceiptIdentity: healthRefreshCheckpoint.lastReceiptIdentity,
          refreshCount: healthRefreshCheckpoint.refreshCount,
          refreshedAt: healthRefreshCheckpoint.refreshedAt,
        })
        .from(healthRefreshCheckpoint)
        .where(eq(healthRefreshCheckpoint.identity, "owner"))
        .limit(1);
      return checkpoint ?? null;
    },
    findOwnerCommandByIdempotencyKey: findByIdempotencyKey,
    processNextOwnerCommand: async () => {
      await reconcileTerminalReceipts();
      const [job] = await boss.fetch<unknown>(OWNER_COMMAND_QUEUE, {
        includeMetadata: true,
      });
      if (job === undefined) {
        return false;
      }

      try {
        const payload = ownerCommandJobSchema.parse(job.data);
        await database.transaction(async (transaction) => {
          const [existing] = await transaction
            .select({ status: ownerCommandReceipt.status })
            .from(ownerCommandReceipt)
            .where(eq(ownerCommandReceipt.stockhawkIdentity, payload.receiptId))
            .limit(1)
            .for("update");
          if (existing === undefined) {
            throw new Error("Owner command receipt is missing");
          }
          if (existing.status !== "completed") {
            await beforeApplyHealthRefresh?.();
            await transaction
              .insert(healthRefreshCheckpoint)
              .values({
                identity: "owner",
                lastReceiptIdentity: payload.receiptId,
                refreshCount: 1,
                refreshedAt: sql`now()`,
              })
              .onConflictDoUpdate({
                set: {
                  lastReceiptIdentity: payload.receiptId,
                  refreshCount: sql`${healthRefreshCheckpoint.refreshCount} + 1`,
                  refreshedAt: sql`now()`,
                },
                target: healthRefreshCheckpoint.identity,
              });
          }
          const [completed] = await transaction
            .update(ownerCommandReceipt)
            .set({
              completedAt: sql`coalesce(${ownerCommandReceipt.completedAt}, now())`,
              failedAt: null,
              status: "completed",
            })
            .where(
              and(
                eq(ownerCommandReceipt.stockhawkIdentity, payload.receiptId),
                eq(ownerCommandReceipt.status, "queued"),
              ),
            )
            .returning({ id: ownerCommandReceipt.id });
          if (completed === undefined && existing.status !== "completed") {
            throw new Error("Owner command receipt is not queued");
          }
          const completion = await boss.complete(
            OWNER_COMMAND_QUEUE,
            job.id,
            { receiptId: payload.receiptId },
            { db: fromStockHawkDrizzle(transaction) },
          );
          if (!("affected" in completion) || completion.affected !== 1) {
            throw new Error(
              "Owner command job completion was not acknowledged",
            );
          }
        });
        return true;
      } catch (error) {
        const failure = {
          message:
            error instanceof Error
              ? error.message
              : "Owner command processing failed",
        };
        const payload = ownerCommandJobSchema.safeParse(job.data);
        if (payload.success && job.retryCount >= job.retryLimit) {
          await database.transaction(async (transaction) => {
            await transaction
              .update(ownerCommandReceipt)
              .set({ failedAt: sql`now()`, status: "failed" })
              .where(
                and(
                  eq(
                    ownerCommandReceipt.stockhawkIdentity,
                    payload.data.receiptId,
                  ),
                  eq(ownerCommandReceipt.status, "queued"),
                ),
              );
            await boss.fail(OWNER_COMMAND_QUEUE, job.id, failure, {
              db: fromStockHawkDrizzle(transaction),
            });
          });
        } else {
          await boss.fail(OWNER_COMMAND_QUEUE, job.id, failure);
        }
        throw error;
      }
    },
  };
};
