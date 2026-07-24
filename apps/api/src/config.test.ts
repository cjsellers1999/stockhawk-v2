import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { decodeApiConfig } from "./config.js";

describe("API startup configuration", () => {
  it("decodes one trusted configuration", () => {
    expect(
      decodeApiConfig({
        APP_ORIGINS: "https://stockhawk.tailnet.example",
        DATABASE_URL: "postgres://127.0.0.1:5432/stockhawk",
        HOST: "127.0.0.1",
        PORT: "3100",
        WEB_DIST_PATH: "/tmp/stockhawk-web",
      }),
    ).toEqual({
      allowedOrigins: ["https://stockhawk.tailnet.example"],
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

  it("rejects a non-origin mutation boundary", () => {
    expect(() =>
      decodeApiConfig({
        APP_ORIGINS: "https://stockhawk.test/unsafe-path",
        DATABASE_URL: "postgres://127.0.0.1:5432/stockhawk",
      }),
    ).toThrow(/origin/i);
  });

  it("rejects non-loopback HTTP application origins", () => {
    expect(() =>
      decodeApiConfig({
        APP_ORIGINS: "http://stockhawk.local",
        DATABASE_URL: "postgres://127.0.0.1:5432/stockhawk",
      }),
    ).toThrow(/HTTPS/i);
  });

  it("accepts loopback HTTP origins for local development", () => {
    expect(
      decodeApiConfig({
        APP_ORIGINS:
          "http://127.0.0.1:3100,http://localhost:3100,http://[::1]:3100",
        DATABASE_URL: "postgres://127.0.0.1:5432/stockhawk",
      }).allowedOrigins,
    ).toEqual([
      "http://127.0.0.1:3100",
      "http://localhost:3100",
      "http://[::1]:3100",
    ]);
  });
});
