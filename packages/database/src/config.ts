import { z } from "zod";

const loopbackHosts = new Set(["127.0.0.1", "::1", "localhost"]);

const databaseEnvironmentSchema = z
  .object({
    DATABASE_URL: z.url().refine((value) => {
      const url = new URL(value);
      return (
        (url.protocol === "postgres:" || url.protocol === "postgresql:") &&
        loopbackHosts.has(url.hostname)
      );
    }, "PostgreSQL must use a loopback host"),
  })
  .loose();

export type DatabaseConfig = { url: string };

export const decodeDatabaseConfig = (
  environment: Record<string, string | undefined>,
): DatabaseConfig => {
  const parsed = databaseEnvironmentSchema.parse(environment);
  return { url: parsed.DATABASE_URL };
};
