import { createDatabase, decodeDatabaseConfig } from "@stockhawk/database";

const config = decodeDatabaseConfig(process.env);
const database = createDatabase(config.url);

await database.markWorkerReady();
const refreshHeartbeat = async () => {
  try {
    await database.markWorkerReady();
  } catch {
    // Readiness reports the outage while this worker keeps retrying.
  }
};
const heartbeat = setInterval(refreshHeartbeat, 10_000);

const shutdown = async () => {
  clearInterval(heartbeat);
  await database.close();
};

const requestShutdown = () => {
  void shutdown().catch(() => {
    process.exitCode = 1;
  });
};

process.once("SIGINT", requestShutdown);
process.once("SIGTERM", requestShutdown);
