import { describe, expect, it } from "vitest";

import { decodeDatabaseConfig } from "./config.js";

describe("database startup configuration", () => {
  it("accepts a loopback PostgreSQL URL", () => {
    expect(
      decodeDatabaseConfig({
        DATABASE_URL: "postgres://127.0.0.1:5432/stockhawk",
      }),
    ).toEqual({
      url: "postgres://127.0.0.1:5432/stockhawk",
    });
  });

  it("rejects a remote PostgreSQL URL", () => {
    expect(() =>
      decodeDatabaseConfig({
        DATABASE_URL: "postgres://db.example.com/stockhawk",
      }),
    ).toThrow(/loopback/i);
  });

  it("accepts bracketed IPv6 loopback URLs", () => {
    expect(
      decodeDatabaseConfig({
        DATABASE_URL: "postgres://[::1]:5432/stockhawk",
      }),
    ).toEqual({ url: "postgres://[::1]:5432/stockhawk" });
  });
});
