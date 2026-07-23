import { describe, expect, it } from "vitest";

import { decodeDatabaseConfig } from "./config.js";

describe("database startup configuration", () => {
  it("accepts a loopback PostgreSQL URL", () => {
    expect(
      decodeDatabaseConfig({
        DATABASE_URL: "postgres://stockhawk:stockhawk@127.0.0.1:5432/stockhawk",
      }),
    ).toEqual({
      url: "postgres://stockhawk:stockhawk@127.0.0.1:5432/stockhawk",
    });
  });

  it("rejects a remote PostgreSQL URL", () => {
    expect(() =>
      decodeDatabaseConfig({
        DATABASE_URL: "postgres://user:secret@db.example.com/stockhawk",
      }),
    ).toThrow(/loopback/i);
  });
});
