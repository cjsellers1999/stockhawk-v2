import { afterAll, describe, expect, it } from "vitest";

import { decodeDatabaseConfig } from "./config.js";
import { createDatabase } from "./database.js";

const config = decodeDatabaseConfig(process.env);
const database = createDatabase(config.url);

afterAll(async () => database.close());

describe("migrated PostgreSQL", () => {
  it("persists and reads the worker heartbeat", async () => {
    await database.markWorkerReady();

    await expect(database.check()).resolves.toBe(true);
    await expect(database.workerIsReady()).resolves.toBe(true);
  });
});
