import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { PgBoss, type QueueOptions } from "pg-boss";
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
import {
  createOwnerCommandPersistence,
  OWNER_COMMAND_QUEUE,
  type OwnerCommandPersistence,
} from "./owner-command-persistence.js";
import { schema, serviceHeartbeat } from "./schema.js";
import {
  createStockObservationReader,
  type StockObservationReader,
} from "./stock-observation-reader.js";

export type Database = CatalogPersistence &
  ChangeEventReader &
  OfferSearch &
  OwnerCommandPersistence &
  StockObservationReader & {
    check: () => Promise<boolean>;
    close: () => Promise<void>;
    markWorkerReady: () => Promise<void>;
    startJobQueue: () => Promise<void>;
    workerIsReady: () => Promise<boolean>;
  };

type OwnerCommandQueueOptions = Pick<
  QueueOptions,
  "expireInSeconds" | "retryBackoff" | "retryDelay" | "retryLimit"
>;

export type CreateDatabaseOptions = {
  beforeApplyHealthRefresh?: () => Promise<void>;
  ownerCommandQueue?: OwnerCommandQueueOptions;
};

export const createDatabase = (
  url: string,
  options: CreateDatabaseOptions = {},
): Database => {
  const client = postgres(url, { max: 5 });
  const database = drizzle({ client, schema });
  const boss = new PgBoss({
    connectionString: url,
    max: 2,
    migrate: false,
    schedule: false,
  });
  let jobQueueStarted = false;
  let jobQueueFaulted = false;
  boss.on("error", () => {
    jobQueueFaulted = true;
  });
  const catalogPersistence = createCatalogPersistence(database);
  const changeEventReader = createChangeEventReader(database);
  const offerSearch = createOfferSearch(database);
  const ownerCommandPersistence = createOwnerCommandPersistence({
    beforeApplyHealthRefresh: options.beforeApplyHealthRefresh,
    boss,
    database,
  });
  const stockObservationReader = createStockObservationReader(database);

  return {
    ...catalogPersistence,
    ...changeEventReader,
    ...offerSearch,
    ...ownerCommandPersistence,
    ...stockObservationReader,
    check: async () => {
      try {
        await database.execute(sql`select 1`);
        if (jobQueueStarted) {
          if ((await boss.getQueue(OWNER_COMMAND_QUEUE)) === null) {
            return false;
          }
          jobQueueFaulted = false;
        }
        if (jobQueueFaulted) {
          return false;
        }
        return true;
      } catch {
        return false;
      }
    },
    close: async () => {
      if (jobQueueStarted) {
        await boss.stop();
      }
      await client.end();
    },
    markWorkerReady: async () => {
      await database
        .insert(serviceHeartbeat)
        .values({ observedAt: sql`now()`, serviceName: "worker" })
        .onConflictDoUpdate({
          set: { observedAt: sql`excluded.observed_at` },
          target: serviceHeartbeat.serviceName,
        });
    },
    startJobQueue: async () => {
      if (jobQueueStarted) {
        return;
      }
      await boss.start();
      await boss.createQueue(OWNER_COMMAND_QUEUE, {
        deleteAfterSeconds: 60 * 60 * 24 * 30,
        expireInSeconds: options.ownerCommandQueue?.expireInSeconds ?? 60,
        retryBackoff: options.ownerCommandQueue?.retryBackoff ?? true,
        retryDelay: options.ownerCommandQueue?.retryDelay ?? 5,
        retryLimit: options.ownerCommandQueue?.retryLimit ?? 5,
      });
      jobQueueStarted = true;
      jobQueueFaulted = false;
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
