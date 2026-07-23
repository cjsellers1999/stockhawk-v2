import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { z } from "zod";

import { changeEvent, retailerListing, schema } from "./schema.js";

type StockHawkDatabase = PostgresJsDatabase<typeof schema>;

const changeEventRecordSchema = z
  .object({
    causalIdempotencyKey: z.string(),
    effectiveAt: z.iso.datetime({ offset: true }),
    eventType: z.enum(["listing_discovered", "stock_status_changed"]),
    newValue: z.string(),
    previousValue: z.string().nullable(),
    streamPosition: z.number().int().positive(),
  })
  .strict();

export type ChangeEventRecord = z.infer<typeof changeEventRecordSchema>;

export type ChangeEventReader = {
  readChangeEvents: (input: {
    listingIdentity: string;
  }) => Promise<ChangeEventRecord[]>;
};

export const createChangeEventReader = (
  database: StockHawkDatabase,
): ChangeEventReader => ({
  readChangeEvents: async ({ listingIdentity }) => {
    const rows = await database
      .select({
        causalIdempotencyKey: changeEvent.causalIdempotencyKey,
        effectiveAt: changeEvent.effectiveAt,
        eventType: changeEvent.eventType,
        newValue: changeEvent.newValue,
        previousValue: changeEvent.previousValue,
        streamPosition: changeEvent.streamPosition,
      })
      .from(changeEvent)
      .innerJoin(
        retailerListing,
        eq(retailerListing.id, changeEvent.retailerListingId),
      )
      .where(eq(retailerListing.stockhawkIdentity, listingIdentity))
      .orderBy(changeEvent.streamPosition);

    return z.array(changeEventRecordSchema).parse(
      rows.map((row) => ({
        causalIdempotencyKey: row.causalIdempotencyKey,
        effectiveAt: row.effectiveAt.toISOString(),
        eventType: row.eventType,
        newValue: row.newValue,
        previousValue: row.previousValue,
        streamPosition: row.streamPosition,
      })),
    );
  },
});
