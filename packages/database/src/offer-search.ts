import {
  offerSearchQuerySchema,
  offerSearchResponseSchema,
  type OfferSearchQuery,
  type OfferSearchResponse,
} from "@stockhawk/contracts";
import { and, desc, eq, or, sql, type SQL } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { schema, searchDocument } from "./schema.js";

type StockHawkDatabase = PostgresJsDatabase<typeof schema>;

export type OfferSearch = {
  searchOffers: (query?: OfferSearchQuery) => Promise<OfferSearchResponse>;
};

const defaultQuery = offerSearchQuerySchema.parse({});
const isStale = sql<boolean>`${searchDocument.lastCheckedAt} < now() - case
  when ${searchDocument.stockStatus} in ('out_of_stock', 'unknown')
    then interval '15 minutes'
  else interval '60 minutes'
end`;

const textMatch = (term: string) =>
  or(
    sql`position(lower(${term}) in lower(${searchDocument.rawTitle})) > 0`,
    sql`position(lower(${term}) in lower(${searchDocument.canonicalProductName})) > 0`,
    sql`position(lower(${term}) in lower(${searchDocument.storefrontName})) > 0`,
    sql`position(lower(${term}) in lower(${searchDocument.storefrontHostname})) > 0`,
    sql`position(lower(${term}) in lower(${searchDocument.purchaseUrl})) > 0`,
  );

export const createOfferSearch = (
  database: StockHawkDatabase,
): OfferSearch => ({
  searchOffers: async (unparsedQuery = defaultQuery) => {
    const query = offerSearchQuerySchema.parse(unparsedQuery);
    const conditions: SQL[] = [
      eq(searchDocument.classification, "offer"),
      eq(searchDocument.listingPresence, "active"),
      eq(searchDocument.matchStatus, "confirmed"),
    ];
    if (query.stock !== "all") {
      conditions.push(eq(searchDocument.stockStatus, query.stock));
    }
    if (query.match === "provisional") {
      conditions.push(sql`false`);
    }
    if (query.freshness === "fresh") {
      conditions.push(sql`not (${isStale})`);
    } else if (query.freshness === "stale") {
      conditions.push(isStale);
    }
    if (query.q.length > 0) {
      const matchAnyTerm = or(...query.q.map((term) => textMatch(term)));
      if (matchAnyTerm !== undefined) {
        conditions.push(matchAnyTerm);
      }
    }

    const rows = await database
      .select({
        canonicalProductName: searchDocument.canonicalProductName,
        imageUrl: searchDocument.imageUrl,
        lastCheckedAt: searchDocument.lastCheckedAt,
        listingIdentity: searchDocument.listingIdentity,
        listingPresence: searchDocument.listingPresence,
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
      .where(and(...conditions))
      .orderBy(
        isStale,
        desc(searchDocument.lastCheckedAt),
        searchDocument.retailerListingId,
      );

    return offerSearchResponseSchema.parse({
      items: rows.map((row) => ({
        canonicalProductName: row.canonicalProductName,
        imageUrl: row.imageUrl,
        lastCheckedAt: row.lastCheckedAt.toISOString(),
        listingIdentity: row.listingIdentity,
        listingPresence: row.listingPresence,
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
