import { resolve } from "node:path";

import { decodeDatabaseConfig } from "@stockhawk/database";
import { z } from "zod";

const loopbackHostSchema = z.enum(["127.0.0.1", "::1", "localhost"], {
  error: "API host must be loopback-only",
});

const apiEnvironmentSchema = z
  .object({
    DATABASE_URL: z.url(),
    HOST: loopbackHostSchema.default("127.0.0.1"),
    PORT: z.coerce.number().int().min(1024).max(65_535).default(3100),
    WEB_DIST_PATH: z.string().min(1).optional(),
  })
  .loose();

export type ApiConfig = {
  databaseUrl: string;
  host: "127.0.0.1" | "::1" | "localhost";
  port: number;
  webDistPath: string;
};

export const decodeApiConfig = (
  environment: Record<string, string | undefined>,
): ApiConfig => {
  const parsed = apiEnvironmentSchema.parse(environment);
  const database = decodeDatabaseConfig(environment);
  return {
    databaseUrl: database.url,
    host: parsed.HOST,
    port: parsed.PORT,
    webDistPath: resolve(process.cwd(), parsed.WEB_DIST_PATH ?? "../web/dist"),
  };
};
