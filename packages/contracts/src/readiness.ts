import { z } from "zod";

const serviceStateSchema = z.enum(["ready", "unavailable"]);

export const readinessSchema = z
  .object({
    api: z.literal("ready"),
    database: serviceStateSchema,
    worker: serviceStateSchema,
  })
  .strict();

export type Readiness = z.infer<typeof readinessSchema>;
