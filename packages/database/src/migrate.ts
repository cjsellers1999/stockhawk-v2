import { decodeDatabaseConfig } from "./config.js";
import { migrateDatabase } from "./migration.js";

const run = async () => {
  const { url } = decodeDatabaseConfig(process.env);
  await migrateDatabase(url);
};

await run();
