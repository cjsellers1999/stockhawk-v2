import { describe, expect, it } from "vitest";

import {
  healthRefreshCommandSchema,
  ownerCommandJobSchema,
  ownerCommandReceiptSchema,
} from "./owner-command.js";

const idempotencyKey = "d8857fd0-b531-4a20-a08d-8f72727d4e0f";
const receiptId = "2e847567-14e4-49a9-a08c-92151429be8e";

describe("owner command contracts", () => {
  it("keeps optimistic health intent queued until completion is proven", () => {
    const command = healthRefreshCommandSchema.parse({
      family: "refresh_health",
      idempotencyKey,
    });
    const queued = ownerCommandReceiptSchema.parse({
      command,
      completedAt: null,
      failedAt: null,
      receiptId,
      requestedAt: "2026-07-23T17:00:00.000Z",
      status: "queued",
    });
    const job = ownerCommandJobSchema.parse({
      receiptId,
      schemaVersion: 1,
    });

    expect(queued.status).toBe("queued");
    expect(job).toEqual({ receiptId, schemaVersion: 1 });
    expect(
      ownerCommandReceiptSchema.parse({
        ...queued,
        failedAt: "2026-07-23T17:00:01.000Z",
        status: "failed",
      }).status,
    ).toBe("failed");
    expect(() =>
      ownerCommandReceiptSchema.parse({
        ...queued,
        completedAt: "2026-07-23T17:00:01.000Z",
      }),
    ).toThrow(/queued/i);
    expect(() =>
      ownerCommandReceiptSchema.parse({
        ...queued,
        status: "completed",
      }),
    ).toThrow(/completed/i);
    expect(() =>
      ownerCommandReceiptSchema.parse({
        ...queued,
        completedAt: "2026-07-23T17:00:01.000Z",
        failedAt: "2026-07-23T17:00:01.000Z",
        status: "failed",
      }),
    ).toThrow(/failed/i);
  });
});
