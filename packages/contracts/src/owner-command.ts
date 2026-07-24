import { z } from "zod";

export const healthRefreshCommandSchema = z
  .object({
    family: z.literal("refresh_health"),
    idempotencyKey: z.uuid(),
    schemaVersion: z.literal(1).default(1),
  })
  .strict();

export type HealthRefreshCommand = z.infer<typeof healthRefreshCommandSchema>;

export const ownerCommandReceiptSchema = z
  .object({
    command: healthRefreshCommandSchema,
    completedAt: z.iso.datetime({ offset: true }).nullable(),
    failedAt: z.iso.datetime({ offset: true }).nullable(),
    receiptId: z.uuid(),
    requestedAt: z.iso.datetime({ offset: true }),
    status: z.enum(["queued", "completed", "failed"]),
  })
  .strict()
  .superRefine((receipt, context) => {
    if (
      receipt.status === "queued" &&
      (receipt.completedAt !== null || receipt.failedAt !== null)
    ) {
      context.addIssue({
        code: "custom",
        message: "Queued owner command cannot have a terminal time",
        path: [receipt.completedAt === null ? "failedAt" : "completedAt"],
      });
    }
    if (
      receipt.status === "completed" &&
      (receipt.completedAt === null || receipt.failedAt !== null)
    ) {
      context.addIssue({
        code: "custom",
        message: "Completed owner command requires only a completion timestamp",
        path: [receipt.completedAt === null ? "completedAt" : "failedAt"],
      });
    }
    if (
      receipt.status === "failed" &&
      (receipt.failedAt === null || receipt.completedAt !== null)
    ) {
      context.addIssue({
        code: "custom",
        message: "Failed owner command requires only a failure timestamp",
        path: [receipt.failedAt === null ? "failedAt" : "completedAt"],
      });
    }
  });

export type OwnerCommandReceipt = z.infer<typeof ownerCommandReceiptSchema>;

export const latestOwnerCommandResponseSchema = z
  .object({
    receipt: ownerCommandReceiptSchema.nullable(),
  })
  .strict();

export type LatestOwnerCommandResponse = z.infer<
  typeof latestOwnerCommandResponseSchema
>;

export const ownerCommandJobSchema = z
  .object({
    receiptId: z.uuid(),
    schemaVersion: z.literal(1),
  })
  .strict();

export type OwnerCommandJob = z.infer<typeof ownerCommandJobSchema>;
