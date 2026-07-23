import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { decodeApiConfig } from "./config.js";

describe("API startup configuration", () => {
  it("decodes one trusted configuration", () => {
    expect(
      decodeApiConfig({
        DATABASE_URL: "postgres://127.0.0.1:5432/stockhawk",
        HOST: "127.0.0.1",
        PORT: "3100",
        WEB_DIST_PATH: "/tmp/stockhawk-web",
      }),
    ).toEqual({
      databaseUrl: "postgres://127.0.0.1:5432/stockhawk",
      host: "127.0.0.1",
      port: 3100,
      webDistPath: "/tmp/stockhawk-web",
    });
  });

  it("rejects an unsafe public bind", () => {
    expect(() =>
      decodeApiConfig({
        DATABASE_URL: "postgres://127.0.0.1:5432/stockhawk",
        HOST: "0.0.0.0",
        PORT: "3100",
        WEB_DIST_PATH: "/tmp/stockhawk-web",
      }),
    ).toThrow(/loopback/i);
  });

  it("rejects a database outside the loopback PostgreSQL boundary", () => {
    expect(() =>
      decodeApiConfig({
        DATABASE_URL: "postgres://database.example/stockhawk",
      }),
    ).toThrow(/loopback/i);
  });

  it("resolves a configured web build path from the API working directory", () => {
    expect(
      decodeApiConfig({
        DATABASE_URL: "postgres://127.0.0.1:5432/stockhawk",
        WEB_DIST_PATH: "../web/dist",
      }).webDistPath,
    ).toBe(resolve(process.cwd(), "../web/dist"));
  });
});
