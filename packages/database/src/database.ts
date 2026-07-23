import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { schema, serviceHeartbeat } from "./schema.js";

export type Database = {
  check: () => Promise<boolean>;
  close: () => Promise<void>;
  markWorkerReady: () => Promise<void>;
  workerIsReady: () => Promise<boolean>;
};

export const createDatabase = (url: string): Database => {
  const client = postgres(url, { max: 5 });
  const database = drizzle({ client, schema });

  return {
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
