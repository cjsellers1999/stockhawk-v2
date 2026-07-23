import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { buildApp } from "./app.js";

describe("readiness endpoint", () => {
  it("reports the API, database, and worker truth independently", async () => {
    const app = buildApp({
      database: {
        check: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
      },
      webDistPath: undefined,
      worker: {
        check: vi.fn<() => Promise<boolean>>().mockResolvedValue(false),
      },
    });

    const response = await app.inject({ method: "GET", url: "/api/readiness" });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      api: "ready",
      database: "ready",
      worker: "unavailable",
    });
    await app.close();
  });

  it("uses the browser fallback only for HTML navigation", async () => {
    const webDistPath = await mkdtemp(join(tmpdir(), "stockhawk-web-"));
    await writeFile(
      join(webDistPath, "index.html"),
      "<title>StockHawk</title>",
    );
    const app = buildApp({
      database: { check: vi.fn<() => Promise<boolean>>() },
      webDistPath,
      worker: { check: vi.fn<() => Promise<boolean>>() },
    });

    const apiResponse = await app.inject({
      headers: { accept: "application/json" },
      method: "GET",
      url: "/api/missing",
    });
    const navigationResponse = await app.inject({
      headers: { accept: "text/html" },
      method: "GET",
      url: "/health",
    });

    expect(apiResponse.statusCode).toBe(404);
    expect(apiResponse.headers["content-type"]).toContain("application/json");
    expect(navigationResponse.statusCode).toBe(200);
    expect(navigationResponse.body).toContain("StockHawk");
    await app.close();
    await rm(webDistPath, { recursive: true });
  });
});
