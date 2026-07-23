import { createDatabase } from "@stockhawk/database";

import { buildApp } from "./app.js";
import { decodeApiConfig } from "./config.js";

const config = decodeApiConfig(process.env);
const database = createDatabase(config.databaseUrl);
const app = buildApp({
  database,
  webDistPath: config.webDistPath,
  worker: { check: database.workerIsReady },
});

const shutdown = async () => {
  await app.close();
  await database.close();
};

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());

await app.listen({ host: config.host, port: config.port });
