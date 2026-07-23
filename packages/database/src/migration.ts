import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

export const migrateDatabase = async (url: string) => {
  const client = postgres(url, { max: 1 });
  const database = drizzle({ client });
  const migrationsDirectory = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../migrations",
  );

  try {
    await migrate(database, { migrationsFolder: migrationsDirectory });
  } finally {
    await client.end();
  }
};
