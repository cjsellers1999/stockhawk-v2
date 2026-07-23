import { createDatabase, decodeDatabaseConfig } from "@stockhawk/database";

const config = decodeDatabaseConfig(process.env);
const database = createDatabase(config.url);

await database.startJobQueue();
await database.markWorkerReady();
const refreshHeartbeat = async () => {
  try {
    await database.markWorkerReady();
  } catch {
    // Readiness reports the outage while this worker keeps retrying.
  }
};
const heartbeat = setInterval(refreshHeartbeat, 10_000);
let processingOwnerCommands = false;
const processOwnerCommands = async () => {
  if (processingOwnerCommands) {
    return;
  }
  processingOwnerCommands = true;
  try {
    await database.processNextOwnerCommand();
  } catch {
    // pg-boss retains retry state while readiness remains independently true.
  } finally {
    processingOwnerCommands = false;
  }
};
void processOwnerCommands();
const ownerCommands = setInterval(() => void processOwnerCommands(), 1_000);

const shutdown = async () => {
  clearInterval(heartbeat);
  clearInterval(ownerCommands);
  await database.close();
};

const requestShutdown = () => {
  void shutdown().catch(() => {
    process.exitCode = 1;
  });
};

process.once("SIGINT", requestShutdown);
process.once("SIGTERM", requestShutdown);
