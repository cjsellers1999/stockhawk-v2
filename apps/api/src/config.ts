import { resolve } from "node:path";

import { decodeDatabaseConfig } from "@stockhawk/database";
import { z } from "zod";

const loopbackHostSchema = z.enum(["127.0.0.1", "::1", "localhost"], {
  error: "API host must be loopback-only",
});
const loopbackOriginHosts = new Set(["127.0.0.1", "[::1]", "localhost"]);
const allowedOriginsSchema = z
  .string()
  .default("http://127.0.0.1:3100")
  .transform((value, context) => {
    const origins: string[] = [];
    for (const candidate of value.split(",")) {
      try {
        const url = new URL(candidate.trim());
        if (
          (url.protocol !== "http:" && url.protocol !== "https:") ||
          (url.protocol === "http:" &&
            !loopbackOriginHosts.has(url.hostname)) ||
          url.username !== "" ||
          url.password !== "" ||
          url.pathname !== "/" ||
          url.search !== "" ||
          url.hash !== ""
        ) {
          throw new Error("Not an HTTP origin");
        }
        if (!origins.includes(url.origin)) {
          origins.push(url.origin);
        }
      } catch {
        context.addIssue({
          code: "custom",
          message:
            "APP_ORIGINS must contain exact HTTPS or loopback HTTP origins",
        });
        return z.NEVER;
      }
    }
    if (origins.length === 0) {
      context.addIssue({
        code: "custom",
        message: "APP_ORIGINS must contain at least one exact HTTP origin",
      });
      return z.NEVER;
    }
    return origins;
  });

const apiEnvironmentSchema = z
  .object({
    APP_ORIGINS: allowedOriginsSchema,
    DATABASE_URL: z.url(),
    HOST: loopbackHostSchema.default("127.0.0.1"),
    PORT: z.coerce.number().int().min(1024).max(65_535).default(3100),
    WEB_DIST_PATH: z.string().min(1).optional(),
  })
  .loose();

export type ApiConfig = {
  allowedOrigins: string[];
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
    allowedOrigins: parsed.APP_ORIGINS,
    databaseUrl: database.url,
    host: parsed.HOST,
    port: parsed.PORT,
    webDistPath: resolve(process.cwd(), parsed.WEB_DIST_PATH ?? "../web/dist"),
  };
};
