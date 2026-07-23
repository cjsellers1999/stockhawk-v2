import { describe, expect, it } from "vitest";

import { readinessSchema } from "./readiness.js";

describe("readiness contract", () => {
  it("accepts independent service states", () => {
    expect(
      readinessSchema.parse({
        api: "ready",
        database: "ready",
        worker: "unavailable",
      }),
    ).toEqual({ api: "ready", database: "ready", worker: "unavailable" });
  });

  it("rejects additive application fields", () => {
    expect(() =>
      readinessSchema.parse({
        api: "ready",
        database: "ready",
        detail: "not part of the public contract",
        worker: "ready",
      }),
    ).toThrow(/unrecognized/i);
  });
});
