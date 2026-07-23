import { createHash } from "node:crypto";

import {
  commitObservationBatchCommandSchema,
  type CommitObservationBatchCommand,
} from "@stockhawk/contracts";
import { and, eq, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import {
  catalogMatch,
  changeEvent,
  currentListingState,
  currentStockState,
  observationBatch,
  product,
  retailerListing,
  retailerListingObservation,
  schema,
  searchDocument,
  searchDocumentSource,
  sourceEvidenceArtifact,
  stockObservation,
  storefront,
} from "./schema.js";

type StockHawkDatabase = PostgresJsDatabase<typeof schema>;

export type CommitObservationBatchResult = {
  batchIdentity: string;
  outcome: "committed" | "replayed";
};

export type CatalogPersistence = {
  commitObservationBatch: (
    command: CommitObservationBatchCommand,
  ) => Promise<CommitObservationBatchResult>;
  rebuildSearchDocuments: () => Promise<number>;
};

export class PersistenceConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PersistenceConflictError";
  }
}

const first = <Row>(rows: Row[], message: string): Row => {
  const row = rows[0];
  if (row === undefined) {
    throw new PersistenceConflictError(message);
  }
  return row;
};

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

const commandHash = (command: CommitObservationBatchCommand) =>
  hash(JSON.stringify(command));

const eventIdentity = (causalIdempotencyKey: string) =>
  `evt_${hash(causalIdempotencyKey).slice(0, 32)}`;

const datesMatch = (left: Date, right: Date) =>
  left.getTime() === right.getTime();

export const createCatalogPersistence = (
  database: StockHawkDatabase,
): CatalogPersistence => ({
  commitObservationBatch: async (unparsedCommand) => {
    const command = commitObservationBatchCommandSchema.parse(unparsedCommand);
    const observedAt = new Date(command.observedAt);
    const fingerprint = commandHash(command);

    return database.transaction(async (transaction) => {
      const insertedBatches = await transaction
        .insert(observationBatch)
        .values({
          commandHash: fingerprint,
          idempotencyKey: command.idempotencyKey,
          runIdentity: command.runIdentity,
          schemaVersion: command.schemaVersion,
          stockhawkIdentity: command.batchIdentity,
        })
        .onConflictDoNothing()
        .returning();
      const insertedBatch = insertedBatches[0];

      if (insertedBatch === undefined) {
        const existingBatch = first(
          await transaction
            .select()
            .from(observationBatch)
            .where(
              or(
                eq(observationBatch.idempotencyKey, command.idempotencyKey),
                eq(observationBatch.stockhawkIdentity, command.batchIdentity),
              ),
            ),
          "Observation Batch uniqueness conflict",
        );

        if (
          existingBatch.commandHash !== fingerprint ||
          existingBatch.idempotencyKey !== command.idempotencyKey ||
          existingBatch.runIdentity !== command.runIdentity ||
          existingBatch.stockhawkIdentity !== command.batchIdentity
        ) {
          throw new PersistenceConflictError(
            "Observation Batch idempotency identity was reused with different input",
          );
        }

        return {
          batchIdentity: command.batchIdentity,
          outcome: "replayed" as const,
        };
      }

      const insertedStorefronts = await transaction
        .insert(storefront)
        .values({
          hostname: new URL(command.storefront.origin).hostname,
          name: command.storefront.name,
          origin: command.storefront.origin,
          stockhawkIdentity: command.storefront.identity,
        })
        .onConflictDoNothing()
        .returning();
      const persistedStorefront =
        insertedStorefronts[0] ??
        first(
          await transaction
            .select()
            .from(storefront)
            .where(
              eq(storefront.stockhawkIdentity, command.storefront.identity),
            ),
          "Storefront identity conflict",
        );
      if (
        persistedStorefront.hostname !==
          new URL(command.storefront.origin).hostname ||
        persistedStorefront.name !== command.storefront.name ||
        persistedStorefront.origin !== command.storefront.origin
      ) {
        throw new PersistenceConflictError(
          "Storefront identity was reused with different facts",
        );
      }

      const insertedEvidenceArtifacts = await transaction
        .insert(sourceEvidenceArtifact)
        .values({
          contentHash: command.evidence.contentHash,
          observedAt,
          sourceUrl: command.evidence.sourceUrl,
          stockhawkIdentity: command.evidence.identity,
        })
        .onConflictDoNothing()
        .returning();
      const persistedEvidenceArtifact =
        insertedEvidenceArtifacts[0] ??
        first(
          await transaction
            .select()
            .from(sourceEvidenceArtifact)
            .where(
              eq(
                sourceEvidenceArtifact.stockhawkIdentity,
                command.evidence.identity,
              ),
            ),
          "Source Evidence Artifact identity conflict",
        );
      if (
        persistedEvidenceArtifact.contentHash !==
          command.evidence.contentHash ||
        !datesMatch(persistedEvidenceArtifact.observedAt, observedAt) ||
        persistedEvidenceArtifact.sourceUrl !== command.evidence.sourceUrl
      ) {
        throw new PersistenceConflictError(
          "Source Evidence Artifact identity was reused with different facts",
        );
      }

      const insertedProducts = await transaction
        .insert(product)
        .values({
          canonicalName: command.product.canonicalName,
          stockhawkIdentity: command.product.identity,
          variant: command.product.variant,
        })
        .onConflictDoNothing()
        .returning();
      const persistedProduct =
        insertedProducts[0] ??
        first(
          await transaction
            .select()
            .from(product)
            .where(eq(product.stockhawkIdentity, command.product.identity)),
          "Product identity conflict",
        );
      if (
        persistedProduct.canonicalName !== command.product.canonicalName ||
        persistedProduct.variant !== command.product.variant
      ) {
        throw new PersistenceConflictError(
          "Product identity was reused with different facts",
        );
      }

      const insertedListings = await transaction
        .insert(retailerListing)
        .values({
          listingPresence: "active",
          sourceIdentityNamespace: command.listing.sourceIdentity.namespace,
          sourceIdentityRuleVersion: command.listing.sourceIdentity.ruleVersion,
          sourceIdentityValue: command.listing.sourceIdentity.value,
          stockhawkIdentity: command.listing.identity,
          storefrontId: persistedStorefront.id,
        })
        .onConflictDoNothing()
        .returning();
      const persistedListing =
        insertedListings[0] ??
        first(
          await transaction
            .select()
            .from(retailerListing)
            .where(
              or(
                eq(retailerListing.stockhawkIdentity, command.listing.identity),
                and(
                  eq(retailerListing.storefrontId, persistedStorefront.id),
                  eq(
                    retailerListing.sourceIdentityNamespace,
                    command.listing.sourceIdentity.namespace,
                  ),
                  eq(
                    retailerListing.sourceIdentityValue,
                    command.listing.sourceIdentity.value,
                  ),
                ),
              ),
            ),
          "Retailer Listing identity conflict",
        );
      if (
        persistedListing.stockhawkIdentity !== command.listing.identity ||
        persistedListing.storefrontId !== persistedStorefront.id ||
        persistedListing.sourceIdentityNamespace !==
          command.listing.sourceIdentity.namespace ||
        persistedListing.sourceIdentityRuleVersion !==
          command.listing.sourceIdentity.ruleVersion ||
        persistedListing.sourceIdentityValue !==
          command.listing.sourceIdentity.value
      ) {
        throw new PersistenceConflictError(
          "Retailer Listing identity was reused with different source identity facts",
        );
      }

      first(
        await transaction
          .select()
          .from(retailerListing)
          .where(eq(retailerListing.id, persistedListing.id))
          .for("update"),
        "Retailer Listing row lock failed",
      );

      const persistedListingObservation = first(
        await transaction
          .insert(retailerListingObservation)
          .values({
            batchId: insertedBatch.id,
            evidenceArtifactId: persistedEvidenceArtifact.id,
            imageUrl: command.listing.imageUrl,
            observationOrder: command.observationOrder,
            observedAt,
            purchaseUrl: command.listing.purchaseUrl,
            rawTitle: command.listing.rawTitle,
            retailerListingId: persistedListing.id,
            stockhawkIdentity: command.listingObservationIdentity,
          })
          .onConflictDoNothing()
          .returning(),
        "Retailer Listing Observation identity conflict",
      );
      let listingReappeared = false;

      const existingCurrentListingState = (
        await transaction
          .select({
            listingObservationId: currentListingState.listingObservationId,
            observationOrder: retailerListingObservation.observationOrder,
          })
          .from(currentListingState)
          .innerJoin(
            retailerListingObservation,
            eq(
              retailerListingObservation.id,
              currentListingState.listingObservationId,
            ),
          )
          .where(eq(currentListingState.retailerListingId, persistedListing.id))
          .for("update")
      )[0];

      if (existingCurrentListingState === undefined) {
        await transaction.insert(currentListingState).values({
          listingObservationId: persistedListingObservation.id,
          retailerListingId: persistedListing.id,
        });
      } else if (
        command.observationOrder > existingCurrentListingState.observationOrder
      ) {
        await transaction
          .update(currentListingState)
          .set({ listingObservationId: persistedListingObservation.id })
          .where(
            eq(currentListingState.retailerListingId, persistedListing.id),
          );
        if (persistedListing.listingPresence === "inactive") {
          first(
            await transaction
              .update(retailerListing)
              .set({ listingPresence: "active" })
              .where(eq(retailerListing.id, persistedListing.id))
              .returning(),
            "Retailer Listing reactivation failed",
          );
          listingReappeared = true;
        }
      }

      const insertedCatalogMatches = await transaction
        .insert(catalogMatch)
        .values({
          evidenceArtifactId: persistedEvidenceArtifact.id,
          matchAuthority: "synthetic_fixture",
          matchedAt: observedAt,
          productId: persistedProduct.id,
          retailerListingId: persistedListing.id,
          stockhawkIdentity: command.catalogMatchIdentity,
        })
        .onConflictDoNothing()
        .returning();
      const persistedCatalogMatch =
        insertedCatalogMatches[0] ??
        first(
          await transaction
            .select()
            .from(catalogMatch)
            .where(
              and(
                eq(catalogMatch.retailerListingId, persistedListing.id),
                eq(catalogMatch.active, true),
              ),
            ),
          "Active Catalog Match conflict",
        );
      if (
        persistedCatalogMatch.productId !== persistedProduct.id ||
        persistedCatalogMatch.stockhawkIdentity !== command.catalogMatchIdentity
      ) {
        throw new PersistenceConflictError(
          "Retailer Listing already has a different active Catalog Match",
        );
      }

      const persistedStockObservation = first(
        await transaction
          .insert(stockObservation)
          .values({
            batchId: insertedBatch.id,
            evidenceArtifactId: persistedEvidenceArtifact.id,
            observationOrder: command.observationOrder,
            observedAt,
            retailerListingId: persistedListing.id,
            status: command.stock.status,
            stockhawkIdentity: command.stock.identity,
          })
          .onConflictDoNothing()
          .returning(),
        "Stock Observation identity conflict",
      );

      const existingCurrentStockState = (
        await transaction
          .select()
          .from(currentStockState)
          .where(eq(currentStockState.retailerListingId, persistedListing.id))
          .for("update")
      )[0];
      let stockTransition:
        { newValue: string; previousValue: string } | undefined;

      if (existingCurrentStockState === undefined) {
        await transaction.insert(currentStockState).values({
          observationOrder: command.observationOrder,
          observedAt,
          retailerListingId: persistedListing.id,
          status: command.stock.status,
          stockObservationId: persistedStockObservation.id,
        });
        if (command.stock.status !== "unknown") {
          stockTransition = {
            newValue: command.stock.status,
            previousValue: "unknown",
          };
        }
      } else if (
        command.observationOrder > existingCurrentStockState.observationOrder
      ) {
        await transaction
          .update(currentStockState)
          .set({
            observationOrder: command.observationOrder,
            observedAt,
            status: command.stock.status,
            stockObservationId: persistedStockObservation.id,
          })
          .where(eq(currentStockState.retailerListingId, persistedListing.id));
        if (existingCurrentStockState.status !== command.stock.status) {
          stockTransition = {
            newValue: command.stock.status,
            previousValue: existingCurrentStockState.status,
          };
        }
      }

      if (insertedListings.length === 1) {
        const causalIdempotencyKey = `${command.idempotencyKey}:listing_discovered`;
        await transaction.insert(changeEvent).values({
          batchId: insertedBatch.id,
          causalIdempotencyKey,
          effectiveAt: observedAt,
          eventType: "listing_discovered",
          listingObservationId: persistedListingObservation.id,
          newValue: "active",
          previousValue: null,
          productId: persistedProduct.id,
          retailerListingId: persistedListing.id,
          schemaVersion: 1,
          stockObservationId: null,
          stockhawkIdentity: eventIdentity(causalIdempotencyKey),
        });
      }

      if (listingReappeared) {
        const causalIdempotencyKey = `${command.idempotencyKey}:listing_reappeared`;
        await transaction.insert(changeEvent).values({
          batchId: insertedBatch.id,
          causalIdempotencyKey,
          effectiveAt: observedAt,
          eventType: "listing_reappeared",
          listingObservationId: persistedListingObservation.id,
          newValue: "active",
          previousValue: "inactive",
          productId: persistedProduct.id,
          retailerListingId: persistedListing.id,
          schemaVersion: 1,
          stockObservationId: null,
          stockhawkIdentity: eventIdentity(causalIdempotencyKey),
        });
      }

      if (stockTransition !== undefined) {
        const causalIdempotencyKey = `${command.idempotencyKey}:stock_status_changed`;
        await transaction.insert(changeEvent).values({
          batchId: insertedBatch.id,
          causalIdempotencyKey,
          effectiveAt: observedAt,
          eventType: "stock_status_changed",
          listingObservationId: persistedListingObservation.id,
          newValue: stockTransition.newValue,
          previousValue: stockTransition.previousValue,
          productId: persistedProduct.id,
          retailerListingId: persistedListing.id,
          schemaVersion: 1,
          stockObservationId: persistedStockObservation.id,
          stockhawkIdentity: eventIdentity(causalIdempotencyKey),
        });
      }

      const projection = first(
        await transaction
          .select()
          .from(searchDocumentSource)
          .where(
            eq(searchDocumentSource.retailerListingId, persistedListing.id),
          ),
        "Search Document source facts are incomplete",
      );

      await transaction
        .insert(searchDocument)
        .values(projection)
        .onConflictDoUpdate({
          set: {
            canonicalProductName: projection.canonicalProductName,
            imageUrl: projection.imageUrl,
            lastCheckedAt: projection.lastCheckedAt,
            listingPresence: projection.listingPresence,
            productId: projection.productId,
            purchaseUrl: projection.purchaseUrl,
            rawTitle: projection.rawTitle,
            stockStatus: projection.stockStatus,
            storefrontHostname: projection.storefrontHostname,
            storefrontId: projection.storefrontId,
            storefrontName: projection.storefrontName,
            updatedAt: sql`now()`,
            variant: projection.variant,
          },
          target: searchDocument.retailerListingId,
        });

      return {
        batchIdentity: command.batchIdentity,
        outcome: "committed" as const,
      };
    });
  },
  rebuildSearchDocuments: async () =>
    database.transaction(async (transaction) => {
      await transaction.delete(searchDocument);
      await transaction
        .insert(searchDocument)
        .select(transaction.select().from(searchDocumentSource));
      const countResult = first(
        await transaction
          .select({ count: sql<number>`count(*)::integer` })
          .from(searchDocument),
        "Search Document rebuild count failed",
      );
      return countResult.count;
    }),
});
