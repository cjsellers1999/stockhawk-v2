import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { serviceHeartbeat } from "./schema.js";

describe("Drizzle schema", () => {
  it("owns the worker heartbeat relation", () => {
    expect(getTableName(serviceHeartbeat)).toBe("service_heartbeat");
  });
});
