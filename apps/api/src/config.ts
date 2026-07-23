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
    ADMIN_PASSWORD_HASH: z.string().min(1),
    APP_ORIGINS: allowedOriginsSchema,
    DATABASE_URL: z.url(),
    HOST: loopbackHostSchema.default("127.0.0.1"),
    PORT: z.coerce.number().int().min(1024).max(65_535).default(3100),
    SESSION_COOKIE_SECURE: z
      .enum(["true", "false"])
      .default("true")
      .transform((value) => value === "true"),
    TRUST_LOOPBACK_PROXY: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    WEB_DIST_PATH: z.string().min(1).optional(),
  })
  .loose()
  .superRefine((value, context) => {
    if (
      !value.SESSION_COOKIE_SECURE &&
      value.APP_ORIGINS.some(
        (origin) => !loopbackOriginHosts.has(new URL(origin).hostname),
      )
    ) {
      context.addIssue({
        code: "custom",
        message:
          "SESSION_COOKIE_SECURE=false requires loopback-only APP_ORIGINS",
        path: ["SESSION_COOKIE_SECURE"],
      });
    }
  });

export type ApiConfig = {
  adminPasswordHash: string;
  allowedOrigins: string[];
  cookieSecure: boolean;
  databaseUrl: string;
  host: "127.0.0.1" | "::1" | "localhost";
  port: number;
  sessionTtlMs: number;
  trustLoopbackProxy: boolean;
  webDistPath: string;
};

export const decodeApiConfig = (
  environment: Record<string, string | undefined>,
): ApiConfig => {
  const parsed = apiEnvironmentSchema.parse(environment);
  const database = decodeDatabaseConfig(environment);
  return {
    adminPasswordHash: parsed.ADMIN_PASSWORD_HASH,
    allowedOrigins: parsed.APP_ORIGINS,
    cookieSecure: parsed.SESSION_COOKIE_SECURE,
    databaseUrl: database.url,
    host: parsed.HOST,
    port: parsed.PORT,
    sessionTtlMs: 12 * 60 * 60 * 1_000,
    trustLoopbackProxy: parsed.TRUST_LOOPBACK_PROXY,
    webDistPath: resolve(process.cwd(), parsed.WEB_DIST_PATH ?? "../web/dist"),
  };
};
