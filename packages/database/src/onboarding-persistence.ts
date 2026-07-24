import { createHash } from "node:crypto";

import {
  onboardingProgressSchema,
  type OnboardingCaseCommand,
  type OnboardingProgress,
} from "@stockhawk/contracts";
import { and, count, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { PersistenceConflictError } from "./catalog-persistence.js";
import {
  candidateSite,
  candidateSiteSourceRecord,
  onboardingCase,
  schema,
  seedSiteRecord,
  seedSourceImport,
} from "./schema.js";
import {
  SEED_NORMALIZATION_RULE_VERSION,
  type SeedWorkbookInput,
} from "./seed-workbook.js";

type StockHawkDatabase = PostgresJsDatabase<typeof schema>;
type StockHawkTransaction = Parameters<
  Parameters<StockHawkDatabase["transaction"]>[0]
>[0];

export type SeedImportResult = {
  candidateSiteCount: number;
  focusCaseIdentity: string;
  importIdentity: string;
  outcome: "imported" | "replayed";
  sourceRecordCount: number;
};

export type OnboardingPersistence = {
  findOnboardingProgress: () => Promise<OnboardingProgress | null>;
  importSeedWorkbook: (seed: SeedWorkbookInput) => Promise<SeedImportResult>;
};

const chunked = <Value>(values: Value[], size = 250) => {
  const chunks: Value[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
};

const onboardingCaseIdentity = (candidateIdentity: string) =>
  `obc_${createHash("sha256")
    .update(`1:${candidateIdentity}`)
    .digest("hex")
    .slice(0, 32)}`;

const ensureReplayMatches = (
  existing: typeof seedSourceImport.$inferSelect,
  seed: SeedWorkbookInput,
) => {
  if (
    existing.columnCount !== seed.columnCount ||
    existing.fileName !== seed.fileName ||
    existing.fileSha256 !== seed.fileSha256 ||
    JSON.stringify(existing.headers) !== JSON.stringify(seed.headers) ||
    existing.sourceRecordCount !== seed.sourceRecords.length ||
    existing.stockhawkIdentity !== seed.importIdentity ||
    existing.worksheetName !== seed.worksheetName
  ) {
    throw new PersistenceConflictError(
      "Seed import identity was reused with different workbook facts",
    );
  }
};

const countFor = async (
  transaction: StockHawkTransaction,
  table:
    | typeof candidateSite
    | typeof candidateSiteSourceRecord
    | typeof seedSiteRecord,
  condition: ReturnType<typeof eq>,
) => {
  const [result] = await transaction
    .select({ value: count() })
    .from(table)
    .where(condition);
  return result?.value ?? 0;
};

const verifyPersistedReconciliation = async (
  transaction: StockHawkTransaction,
  importId: number,
  seed: SeedWorkbookInput,
) => {
  const sourceRecordCount = await countFor(
    transaction,
    seedSiteRecord,
    eq(seedSiteRecord.importId, importId),
  );
  const candidateCount = await countFor(
    transaction,
    candidateSite,
    eq(candidateSite.importId, importId),
  );
  const [reconciliation] = await transaction
    .select({ value: count() })
    .from(candidateSiteSourceRecord)
    .innerJoin(
      candidateSite,
      eq(candidateSite.id, candidateSiteSourceRecord.candidateSiteId),
    )
    .where(eq(candidateSite.importId, importId));

  if (
    sourceRecordCount !== seed.sourceRecords.length ||
    candidateCount !== seed.candidates.length ||
    reconciliation?.value !== seed.sourceRecords.length
  ) {
    throw new PersistenceConflictError(
      "Persisted Seed List does not reconcile to the immutable workbook",
    );
  }
};

export const applyOnboardingCaseCommand = async (
  transaction: StockHawkTransaction,
  command: OnboardingCaseCommand,
) => {
  const [existing] = await transaction
    .select()
    .from(onboardingCase)
    .where(eq(onboardingCase.stockhawkIdentity, command.caseIdentity))
    .limit(1)
    .for("update");
  if (existing === undefined) {
    throw new PersistenceConflictError("Onboarding Case does not exist");
  }
  if (existing.revision !== command.expectedRevision) {
    throw new PersistenceConflictError(
      "Onboarding Case revision changed before the command was applied",
    );
  }
  if (
    command.action === "resume" &&
    (existing.status !== "suspended" || existing.terminal)
  ) {
    throw new PersistenceConflictError(
      "Only a suspended nonterminal Onboarding Case can resume",
    );
  }
  if (
    command.action === "reaudit" &&
    existing.status !== "suspended" &&
    existing.status !== "resolved"
  ) {
    throw new PersistenceConflictError(
      "Only a suspended or resolved Onboarding Case can be re-audited",
    );
  }

  const [updated] = await transaction
    .update(onboardingCase)
    .set({
      nextAction: "Run onboarding preflight",
      revision: existing.revision + 1,
      stage: command.action === "reaudit" ? "preflight" : existing.stage,
      status: "queued",
      terminal: false,
      updatedAt: sql`now()`,
      waitReason: null,
    })
    .where(
      and(
        eq(onboardingCase.id, existing.id),
        eq(onboardingCase.revision, existing.revision),
      ),
    )
    .returning({
      identity: onboardingCase.stockhawkIdentity,
      revision: onboardingCase.revision,
    });
  if (updated === undefined) {
    throw new PersistenceConflictError(
      "Onboarding Case changed while the command was applied",
    );
  }
  return updated;
};

export const createOnboardingPersistence = (
  database: StockHawkDatabase,
): OnboardingPersistence => ({
  findOnboardingProgress: async () => {
    const [seedImport] = await database
      .select()
      .from(seedSourceImport)
      .orderBy(seedSourceImport.importedAt)
      .limit(1);
    if (seedImport === undefined) {
      return null;
    }

    const [candidateCountResult] = await database
      .select({ value: count() })
      .from(candidateSite)
      .where(eq(candidateSite.importId, seedImport.id));
    const [reconciledCountResult] = await database
      .select({ value: count() })
      .from(candidateSiteSourceRecord)
      .innerJoin(
        candidateSite,
        eq(candidateSite.id, candidateSiteSourceRecord.candidateSiteId),
      )
      .where(eq(candidateSite.importId, seedImport.id));
    const caseStatusRows = await database
      .select({
        status: onboardingCase.status,
        value: count(),
      })
      .from(onboardingCase)
      .innerJoin(
        candidateSite,
        eq(candidateSite.id, onboardingCase.candidateSiteId),
      )
      .where(eq(candidateSite.importId, seedImport.id))
      .groupBy(onboardingCase.status);
    const caseCounts = new Map(
      caseStatusRows.map((row) => [row.status, row.value]),
    );
    const caseTotal = caseStatusRows.reduce(
      (total, row) => total + row.value,
      0,
    );
    const [focusCase] = await database
      .select({
        candidateIdentity: candidateSite.stockhawkIdentity,
        candidateName: candidateSite.name,
        candidateUrl: candidateSite.url,
        identity: onboardingCase.stockhawkIdentity,
        nextAction: onboardingCase.nextAction,
        revision: onboardingCase.revision,
        sourceRecordCount: count(candidateSiteSourceRecord.id),
        stage: onboardingCase.stage,
        status: onboardingCase.status,
        terminal: onboardingCase.terminal,
        updatedAt: onboardingCase.updatedAt,
        waitReason: onboardingCase.waitReason,
      })
      .from(onboardingCase)
      .innerJoin(
        candidateSite,
        eq(candidateSite.id, onboardingCase.candidateSiteId),
      )
      .innerJoin(
        candidateSiteSourceRecord,
        eq(
          candidateSiteSourceRecord.candidateSiteId,
          onboardingCase.candidateSiteId,
        ),
      )
      .where(eq(candidateSite.importId, seedImport.id))
      .groupBy(onboardingCase.id, candidateSite.id)
      .orderBy(onboardingCase.id)
      .limit(1);
    const candidateSiteCount = candidateCountResult?.value ?? 0;

    return onboardingProgressSchema.parse({
      candidateSites: candidateSiteCount,
      cases: {
        inProgress: caseCounts.get("in_progress") ?? 0,
        queued: caseCounts.get("queued") ?? 0,
        resolved: caseCounts.get("resolved") ?? 0,
        suspended: caseCounts.get("suspended") ?? 0,
        total: caseTotal,
      },
      focusCase:
        focusCase === undefined
          ? null
          : {
              ...focusCase,
              updatedAt: focusCase.updatedAt.toISOString(),
            },
      importedAt: seedImport.importedAt.toISOString(),
      remainingCandidateSites: candidateSiteCount - caseTotal,
      sourceRecords: {
        reconciled: reconciledCountResult?.value ?? 0,
        total: seedImport.sourceRecordCount,
      },
      workbookSha256: seedImport.fileSha256,
    });
  },
  importSeedWorkbook: async (seed) =>
    database.transaction(async (transaction) => {
      const [insertedImport] = await transaction
        .insert(seedSourceImport)
        .values({
          columnCount: seed.columnCount,
          fileName: seed.fileName,
          fileSha256: seed.fileSha256,
          headers: seed.headers,
          sourceRecordCount: seed.sourceRecords.length,
          stockhawkIdentity: seed.importIdentity,
          worksheetName: seed.worksheetName,
        })
        .onConflictDoNothing()
        .returning();
      if (insertedImport === undefined) {
        const [existing] = await transaction
          .select()
          .from(seedSourceImport)
          .where(
            and(
              eq(seedSourceImport.fileSha256, seed.fileSha256),
              eq(seedSourceImport.worksheetName, seed.worksheetName),
            ),
          )
          .limit(1);
        if (existing === undefined) {
          throw new PersistenceConflictError(
            "Seed import uniqueness conflict could not be resolved",
          );
        }
        ensureReplayMatches(existing, seed);
        await verifyPersistedReconciliation(transaction, existing.id, seed);
        const [focusCase] = await transaction
          .select({ identity: onboardingCase.stockhawkIdentity })
          .from(onboardingCase)
          .innerJoin(
            candidateSite,
            eq(candidateSite.id, onboardingCase.candidateSiteId),
          )
          .where(eq(candidateSite.importId, existing.id))
          .orderBy(onboardingCase.id)
          .limit(1);
        if (focusCase === undefined) {
          throw new PersistenceConflictError(
            "Replayed Seed import is missing its Onboarding Case",
          );
        }
        return {
          candidateSiteCount: seed.candidates.length,
          focusCaseIdentity: focusCase.identity,
          importIdentity: seed.importIdentity,
          outcome: "replayed",
          sourceRecordCount: seed.sourceRecords.length,
        };
      }

      const persistedRecords = (
        await Promise.all(
          chunked(seed.sourceRecords).map((records) =>
            transaction
              .insert(seedSiteRecord)
              .values(
                records.map((record) => ({
                  baseUrl: record.baseUrl,
                  importId: insertedImport.id,
                  legacyConnectorLabel: record.legacyConnectorLabel,
                  name: record.name,
                  rawRecordHash: record.rawRecordHash,
                  rawValues: record.rawValues,
                  sourceRecordId: record.sourceRecordId,
                  sourceRowNumber: record.sourceRowNumber,
                  stockhawkIdentity: record.identity,
                })),
              )
              .returning({
                id: seedSiteRecord.id,
                identity: seedSiteRecord.stockhawkIdentity,
              }),
          ),
        )
      ).flat();
      const recordIds = new Map(
        persistedRecords.map((record) => [record.identity, record.id]),
      );

      const persistedCandidates = (
        await Promise.all(
          chunked(seed.candidates).map((candidates) =>
            transaction
              .insert(candidateSite)
              .values(
                candidates.map((candidate) => ({
                  comparisonEndpointKey: candidate.comparisonEndpointKey,
                  importId: insertedImport.id,
                  name: candidate.name,
                  normalizationRuleVersion: SEED_NORMALIZATION_RULE_VERSION,
                  stockhawkIdentity: candidate.identity,
                  url: candidate.url,
                })),
              )
              .returning({
                id: candidateSite.id,
                identity: candidateSite.stockhawkIdentity,
              }),
          ),
        )
      ).flat();
      const candidateIds = new Map(
        persistedCandidates.map((candidate) => [
          candidate.identity,
          candidate.id,
        ]),
      );

      const reconciliations = seed.candidates.flatMap((candidate) => {
        const candidateSiteId = candidateIds.get(candidate.identity);
        if (candidateSiteId === undefined) {
          throw new PersistenceConflictError(
            "Candidate Site was not persisted",
          );
        }
        const normalizationDecision =
          candidate.sourceRecordIdentities.length === 1
            ? "unique_http_endpoint"
            : "syntactically_equivalent_http_endpoint";
        return candidate.sourceRecordIdentities.map((recordIdentity) => {
          const seedSiteRecordId = recordIds.get(recordIdentity);
          if (seedSiteRecordId === undefined) {
            throw new PersistenceConflictError(
              "Seed Site Record was not persisted",
            );
          }
          return {
            candidateSiteId,
            normalizationDecision,
            normalizationRuleVersion: SEED_NORMALIZATION_RULE_VERSION,
            seedSiteRecordId,
          };
        });
      });
      await Promise.all(
        chunked(reconciliations).map((reconciliationChunk) =>
          transaction
            .insert(candidateSiteSourceRecord)
            .values(reconciliationChunk),
        ),
      );

      const focusCandidate = seed.candidates[0];
      if (focusCandidate === undefined) {
        throw new PersistenceConflictError(
          "Seed import requires one Candidate Site",
        );
      }
      const focusCandidateId = candidateIds.get(focusCandidate.identity);
      if (focusCandidateId === undefined) {
        throw new PersistenceConflictError(
          "Focus Candidate Site was not persisted",
        );
      }
      const focusCaseIdentity = onboardingCaseIdentity(focusCandidate.identity);
      await transaction.insert(onboardingCase).values({
        attempts: [],
        candidateSiteId: focusCandidateId,
        dependencies: [],
        evidence: [
          {
            importIdentity: seed.importIdentity,
            kind: "seed_provenance",
            sourceRecordIdentities: focusCandidate.sourceRecordIdentities,
          },
        ],
        nextAction: "Resume onboarding preflight",
        revision: 0,
        stage: "preflight",
        status: "suspended",
        stockhawkIdentity: focusCaseIdentity,
        terminal: false,
        waitReason: "Awaiting explicit owner resume",
      });

      await verifyPersistedReconciliation(transaction, insertedImport.id, seed);
      return {
        candidateSiteCount: seed.candidates.length,
        focusCaseIdentity,
        importIdentity: seed.importIdentity,
        outcome: "imported",
        sourceRecordCount: seed.sourceRecords.length,
      };
    }),
});
