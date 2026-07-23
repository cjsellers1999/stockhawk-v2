import {
  offerSearchResponseSchema,
  type OfferSearchResponse,
} from "@stockhawk/contracts";
import { desc, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { schema, searchDocument } from "./schema.js";

type StockHawkDatabase = PostgresJsDatabase<typeof schema>;

export type OfferSearch = {
  searchOffers: () => Promise<OfferSearchResponse>;
};

export const createOfferSearch = (
  database: StockHawkDatabase,
): OfferSearch => ({
  searchOffers: async () => {
    const rows = await database
      .select({
        canonicalProductName: searchDocument.canonicalProductName,
        imageUrl: searchDocument.imageUrl,
        lastCheckedAt: searchDocument.lastCheckedAt,
        listingIdentity: searchDocument.listingIdentity,
        matchStatus: searchDocument.matchStatus,
        purchaseUrl: searchDocument.purchaseUrl,
        rawTitle: searchDocument.rawTitle,
        stockStatus: searchDocument.stockStatus,
        storefrontHostname: searchDocument.storefrontHostname,
        storefrontName: searchDocument.storefrontName,
        total: sql<number>`count(*) over()::integer`,
        variant: searchDocument.variant,
      })
      .from(searchDocument)
      .orderBy(
        desc(searchDocument.lastCheckedAt),
        searchDocument.retailerListingId,
      );

    return offerSearchResponseSchema.parse({
      items: rows.map((row) => ({
        canonicalProductName: row.canonicalProductName,
        imageUrl: row.imageUrl,
        lastCheckedAt: row.lastCheckedAt.toISOString(),
        listingIdentity: row.listingIdentity,
        matchStatus: row.matchStatus,
        purchaseUrl: row.purchaseUrl,
        rawTitle: row.rawTitle,
        stockStatus: row.stockStatus,
        storefrontHostname: row.storefrontHostname,
        storefrontName: row.storefrontName,
        variant: row.variant,
      })),
      total: rows[0]?.total ?? 0,
    });
  },
});
