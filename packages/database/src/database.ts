import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import {
  createCatalogPersistence,
  type CatalogPersistence,
} from "./catalog-persistence.js";
import {
  createChangeEventReader,
  type ChangeEventReader,
} from "./change-event-reader.js";
import { createOfferSearch, type OfferSearch } from "./offer-search.js";
import { schema, serviceHeartbeat } from "./schema.js";
import {
  createStockObservationReader,
  type StockObservationReader,
} from "./stock-observation-reader.js";

export type Database = CatalogPersistence &
  ChangeEventReader &
  OfferSearch &
  StockObservationReader & {
    check: () => Promise<boolean>;
    close: () => Promise<void>;
    markWorkerReady: () => Promise<void>;
    workerIsReady: () => Promise<boolean>;
  };

export const createDatabase = (url: string): Database => {
  const client = postgres(url, { max: 5 });
  const database = drizzle({ client, schema });
  const catalogPersistence = createCatalogPersistence(database);
  const changeEventReader = createChangeEventReader(database);
  const offerSearch = createOfferSearch(database);
  const stockObservationReader = createStockObservationReader(database);

  return {
    ...catalogPersistence,
    ...changeEventReader,
    ...offerSearch,
    ...stockObservationReader,
    check: async () => {
      try {
        await database.execute(sql`select 1`);
        return true;
      } catch {
        return false;
      }
    },
    close: async () => client.end(),
    markWorkerReady: async () => {
      await database
        .insert(serviceHeartbeat)
        .values({ observedAt: sql`now()`, serviceName: "worker" })
        .onConflictDoUpdate({
          set: { observedAt: sql`excluded.observed_at` },
          target: serviceHeartbeat.serviceName,
        });
    },
    workerIsReady: async () => {
      try {
        const result = await database
          .select({
            ready: sql<boolean>`coalesce(max(${serviceHeartbeat.observedAt}) > now() - interval '30 seconds', false)`,
          })
          .from(serviceHeartbeat)
          .where(eq(serviceHeartbeat.serviceName, "worker"));
        return result[0]?.ready ?? false;
      } catch {
        return false;
      }
    },
  };
};
