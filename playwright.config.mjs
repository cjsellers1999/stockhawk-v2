import { defineConfig } from "@playwright/test";

const baseURL = process.env.STOCKHAWK_E2E_BASE_URL ?? "http://127.0.0.1:3197";

export default defineConfig({
  expect: { timeout: 10_000 },
  fullyParallel: false,
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  reporter: "line",
  testDir: "./e2e",
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  workers: 1,
});
