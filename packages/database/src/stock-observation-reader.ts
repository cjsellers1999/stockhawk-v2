import { stockStatusSchema } from "@stockhawk/contracts";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { z } from "zod";

import { retailerListing, schema, stockObservation } from "./schema.js";

type StockHawkDatabase = PostgresJsDatabase<typeof schema>;

const stockObservationRecordSchema = z
  .object({
    observationOrder: z.number().int().nonnegative(),
    observedAt: z.iso.datetime({ offset: true }),
    status: stockStatusSchema,
    stockObservationIdentity: z.string(),
  })
  .strict();

export type StockObservationRecord = z.infer<
  typeof stockObservationRecordSchema
>;

export type StockObservationReader = {
  readStockObservationHistory: (input: {
    listingIdentity: string;
  }) => Promise<StockObservationRecord[]>;
};

export const createStockObservationReader = (
  database: StockHawkDatabase,
): StockObservationReader => ({
  readStockObservationHistory: async ({ listingIdentity }) => {
    const rows = await database
      .select({
        observationOrder: stockObservation.observationOrder,
        observedAt: stockObservation.observedAt,
        status: stockObservation.status,
        stockObservationIdentity: stockObservation.stockhawkIdentity,
      })
      .from(stockObservation)
      .innerJoin(
        retailerListing,
        eq(retailerListing.id, stockObservation.retailerListingId),
      )
      .where(eq(retailerListing.stockhawkIdentity, listingIdentity))
      .orderBy(stockObservation.observationOrder, stockObservation.id);

    return z.array(stockObservationRecordSchema).parse(
      rows.map((row) => ({
        observationOrder: row.observationOrder,
        observedAt: row.observedAt.toISOString(),
        status: row.status,
        stockObservationIdentity: row.stockObservationIdentity,
      })),
    );
  },
});
