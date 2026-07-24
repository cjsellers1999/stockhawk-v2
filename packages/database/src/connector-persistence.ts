import { createHash } from "node:crypto";

import {
  commitConnectorBatchCommandSchema,
  type CommitConnectorBatchCommand,
  type ConnectorCheckpoint,
  type ConnectorResumeMode,
} from "@stockhawk/contracts";
import { and, eq, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import {
  connectorEvidenceArtifact,
  connectorListingObservation,
  connectorObservationBatch,
  connectorRun,
  schema,
} from "./schema.js";

type StockHawkDatabase = PostgresJsDatabase<typeof schema>;

export type CommitConnectorBatchResult = {
  batchIdentity: string;
  outcome: "committed" | "replayed";
};

export type ConnectorRunRecord = {
  checkpoint: ConnectorCheckpoint | null;
  latestSequence: number;
  resumeMode: ConnectorResumeMode;
  runIdentity: string;
};
export type ConnectorBatchRecord = {
  batchIdentity: string;
  evidenceCount: number;
  observationCount: number;
};

export type ConnectorPersistence = {
  commitConnectorBatch: (
    command: CommitConnectorBatchCommand,
  ) => Promise<CommitConnectorBatchResult>;
  readConnectorRun: (input: {
    runIdentity: string;
  }) => Promise<ConnectorRunRecord | null>;
  readConnectorBatch: (input: {
    batchIdentity: string;
  }) => Promise<ConnectorBatchRecord | null>;
};

export class ConnectorPersistenceConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConnectorPersistenceConflictError";
  }
}

// A crash replay may observe the same logical batch later. Stable batch,
// evidence, and listing identities plus retained content still must match;
// wall-clock observation timestamps do not turn redelivery into new work.
const isUnknownRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const canonicalJson = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalJson);
  }
  if (isUnknownRecord(value)) {
    const entries = Object.entries(value);
    entries.sort(([left], [right]) =>
      left < right ? -1 : left > right ? 1 : 0,
    );
    return Object.fromEntries(
      entries.map(([key, item]) => [key, canonicalJson(item)]),
    );
  }
  return value;
};

const fingerprint = (command: CommitConnectorBatchCommand) =>
  createHash("sha256")
    .update(
      JSON.stringify(
        canonicalJson({
          ...command,
          batch: {
            ...command.batch,
            evidence: command.batch.evidence.map((artifact) => ({
              ...artifact,
              observedAt: null,
            })),
            observations: command.batch.observations.map((observation) => ({
              ...observation,
              observedAt: null,
            })),
          },
        }),
      ),
    )
    .digest("hex");
const childIdentity = (value: string) =>
  `connector_${createHash("sha256").update(value).digest("hex").slice(0, 32)}`;

const runFactsMatch = ({
  command,
  row,
}: {
  command: CommitConnectorBatchCommand;
  row: typeof connectorRun.$inferSelect;
}) =>
  row.adapterId === command.run.adapterId &&
  row.adapterVersion === command.run.adapterVersion &&
  row.integrationIdentity === command.run.integrationIdentity &&
  row.job === command.run.job &&
  row.resumeMode === command.run.resumeMode;

export const createConnectorPersistence = (
  database: StockHawkDatabase,
): ConnectorPersistence => ({
  commitConnectorBatch: async (unparsedCommand) => {
    const command = commitConnectorBatchCommandSchema.parse(unparsedCommand);
    if (
      command.batch.evidence.some(
        (artifact) =>
          createHash("sha256").update(artifact.content).digest("hex") !==
          artifact.contentHash,
      )
    ) {
      throw new ConnectorPersistenceConflictError(
        "Connector evidence content hash does not match retained content",
      );
    }
    const commandHash = fingerprint(command);

    return database.transaction(async (transaction) => {
      const insertedRun = (
        await transaction
          .insert(connectorRun)
          .values({
            adapterId: command.run.adapterId,
            adapterVersion: command.run.adapterVersion,
            integrationIdentity: command.run.integrationIdentity,
            job: command.run.job,
            latestCheckpoint: command.batch.checkpoint,
            latestSequence: command.batch.sequence,
            resumeMode: command.run.resumeMode,
            stockhawkIdentity: command.run.identity,
          })
          .onConflictDoNothing()
          .returning()
      )[0];
      if (insertedRun !== undefined && command.batch.sequence !== 0) {
        throw new ConnectorPersistenceConflictError(
          "A new Connector Run must begin at sequence zero",
        );
      }
      const persistedRun =
        insertedRun ??
        (
          await transaction
            .select()
            .from(connectorRun)
            .where(eq(connectorRun.stockhawkIdentity, command.run.identity))
            .for("update")
        )[0];
      if (
        persistedRun === undefined ||
        !runFactsMatch({ command, row: persistedRun })
      ) {
        throw new ConnectorPersistenceConflictError(
          "Connector Run identity was reused with different input",
        );
      }

      const existingBatch = (
        await transaction
          .select()
          .from(connectorObservationBatch)
          .where(
            or(
              eq(
                connectorObservationBatch.stockhawkIdentity,
                command.batch.identity,
              ),
              and(
                eq(connectorObservationBatch.runId, persistedRun.id),
                eq(connectorObservationBatch.sequence, command.batch.sequence),
              ),
            ),
          )
      )[0];
      if (existingBatch !== undefined) {
        if (
          existingBatch.commandHash !== commandHash ||
          existingBatch.runId !== persistedRun.id ||
          existingBatch.sequence !== command.batch.sequence ||
          existingBatch.stockhawkIdentity !== command.batch.identity
        ) {
          throw new ConnectorPersistenceConflictError(
            "Connector batch identity or sequence was reused with different input",
          );
        }
        return {
          batchIdentity: command.batch.identity,
          outcome: "replayed" as const,
        };
      }

      if (
        insertedRun === undefined &&
        command.batch.sequence !== persistedRun.latestSequence + 1
      ) {
        throw new ConnectorPersistenceConflictError(
          "Connector batch must use the next contiguous sequence",
        );
      }
      const insertedBatch = (
        await transaction
          .insert(connectorObservationBatch)
          .values({
            batchPayload: command.batch,
            commandHash,
            runId: persistedRun.id,
            sequence: command.batch.sequence,
            stockhawkIdentity: command.batch.identity,
          })
          .onConflictDoNothing()
          .returning()
      )[0];
      if (insertedBatch === undefined) {
        throw new ConnectorPersistenceConflictError(
          "Connector batch identity or sequence was reused concurrently",
        );
      }
      const insertedEvidence =
        command.batch.evidence.length === 0
          ? []
          : await transaction
              .insert(connectorEvidenceArtifact)
              .values(
                command.batch.evidence.map((artifact) => ({
                  artifactPayload: artifact,
                  batchId: insertedBatch.id,
                  content: artifact.content,
                  contentHash: artifact.contentHash,
                  mediaType: artifact.mediaType,
                  observedAt: new Date(artifact.observedAt),
                  sourceUrl: artifact.sourceUrl,
                  stockhawkIdentity: artifact.identity,
                })),
              )
              .returning({
                id: connectorEvidenceArtifact.id,
                stockhawkIdentity: connectorEvidenceArtifact.stockhawkIdentity,
              });
      const evidenceIdByIdentity = new Map(
        insertedEvidence.map((artifact) => [
          artifact.stockhawkIdentity,
          artifact.id,
        ]),
      );
      if (command.batch.observations.length > 0) {
        // Connector output remains immutable raw ingress here. Later matching and
        // stock-semantics stages own canonical projections and search/events.
        await transaction.insert(connectorListingObservation).values(
          command.batch.observations.map((observation) => {
            const evidenceArtifactId = evidenceIdByIdentity.get(
              observation.evidenceIdentity,
            );
            if (evidenceArtifactId === undefined) {
              throw new ConnectorPersistenceConflictError(
                "Connector observation evidence was not persisted",
              );
            }
            return {
              accessMethod: observation.accessMethod,
              batchId: insertedBatch.id,
              evidenceArtifactId,
              observationPayload: observation,
              observedAt: new Date(observation.observedAt),
              parentSourceIdentityNamespace:
                observation.parentSourceIdentity.namespace,
              parentSourceIdentityRuleVersion:
                observation.parentSourceIdentity.ruleVersion,
              parentSourceIdentityValue: observation.parentSourceIdentity.value,
              stockhawkIdentity: childIdentity(
                JSON.stringify([
                  command.batch.identity,
                  observation.variantSourceIdentity.namespace,
                  observation.variantSourceIdentity.ruleVersion,
                  observation.variantSourceIdentity.value,
                ]),
              ),
              variantSourceIdentityNamespace:
                observation.variantSourceIdentity.namespace,
              variantSourceIdentityRuleVersion:
                observation.variantSourceIdentity.ruleVersion,
              variantSourceIdentityValue:
                observation.variantSourceIdentity.value,
            };
          }),
        );
      }
      if (insertedRun === undefined) {
        await transaction
          .update(connectorRun)
          .set({
            latestCheckpoint: command.batch.checkpoint,
            latestSequence: command.batch.sequence,
            updatedAt: new Date(),
          })
          .where(eq(connectorRun.id, persistedRun.id));
      }
      return {
        batchIdentity: command.batch.identity,
        outcome: "committed" as const,
      };
    });
  },
  readConnectorRun: async ({ runIdentity }) => {
    const row = (
      await database
        .select()
        .from(connectorRun)
        .where(eq(connectorRun.stockhawkIdentity, runIdentity))
    )[0];
    if (row === undefined) {
      return null;
    }
    return {
      checkpoint: row.latestCheckpoint ?? null,
      latestSequence: row.latestSequence,
      resumeMode: connectorResumeMode(row.resumeMode),
      runIdentity: row.stockhawkIdentity,
    };
  },
  readConnectorBatch: async ({ batchIdentity }) => {
    const batch = (
      await database
        .select()
        .from(connectorObservationBatch)
        .where(eq(connectorObservationBatch.stockhawkIdentity, batchIdentity))
    )[0];
    if (batch === undefined) {
      return null;
    }
    const [evidence, observations] = await Promise.all([
      database
        .select({ id: connectorEvidenceArtifact.id })
        .from(connectorEvidenceArtifact)
        .where(eq(connectorEvidenceArtifact.batchId, batch.id)),
      database
        .select({ id: connectorListingObservation.id })
        .from(connectorListingObservation)
        .where(eq(connectorListingObservation.batchId, batch.id)),
    ]);
    return {
      batchIdentity,
      evidenceCount: evidence.length,
      observationCount: observations.length,
    };
  },
});

const connectorResumeMode = (value: string): ConnectorResumeMode => {
  if (value === "checkpoint" || value === "restart_only") {
    return value;
  }
  throw new ConnectorPersistenceConflictError(
    `Stored Connector resume mode is invalid: ${value}`,
  );
};
