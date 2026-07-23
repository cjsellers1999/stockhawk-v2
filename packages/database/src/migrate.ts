import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import postgres from "postgres";

import { decodeDatabaseConfig } from "./config.js";

const run = async () => {
  const { url } = decodeDatabaseConfig(process.env);
  const sql = postgres(url, { max: 1 });
  const migrationsDirectory = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../migrations",
  );
  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith(".sql"))
    .toSorted();

  const applyMigrations = async (files: string[]): Promise<void> => {
    const [migrationFile, ...remainingFiles] = files;
    if (migrationFile === undefined) {
      return;
    }

    const applied = await sql<{ exists: boolean }[]>`
      select exists(select 1 from schema_migrations where migration_name = ${migrationFile}) as exists
    `;
    if (!applied[0]?.exists) {
      const migration = await readFile(
        resolve(migrationsDirectory, migrationFile),
        "utf8",
      );
      await sql.begin(async (transaction) => {
        await transaction.unsafe(migration);
        await transaction`insert into schema_migrations (migration_name) values (${migrationFile})`;
      });
    }

    await applyMigrations(remainingFiles);
  };

  try {
    await sql`
      create table if not exists schema_migrations (
        migration_name text primary key,
        applied_at timestamptz not null default now()
      )
    `;

    await applyMigrations(migrationFiles);
  } finally {
    await sql.end();
  }
};

await run();
