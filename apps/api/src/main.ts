import { randomBytes } from "node:crypto";

import { createDatabase } from "@stockhawk/database";

import { createAdminPasswordVerifier } from "./admin-password.js";
import { buildApp } from "./app.js";
import { decodeApiConfig } from "./config.js";

const config = decodeApiConfig(process.env);
const database = createDatabase(config.databaseUrl);
await database.startJobQueue();
const app = buildApp({
  database,
  security: {
    allowedOrigins: new Set(config.allowedOrigins),
    cookieSecure: config.cookieSecure,
    createOpaqueToken: () => randomBytes(32).toString("base64url"),
    now: () => new Date(),
    passwordVerifier: createAdminPasswordVerifier(config.adminPasswordHash),
    sessionTtlMs: config.sessionTtlMs,
    trustLoopbackProxy: config.trustLoopbackProxy,
  },
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
