import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { format } from "prettier";

import { collectMigrationEvidence } from "./migration-evidence.mjs";

const workspace = resolve(import.meta.dirname, "..");
const git = (...arguments_) =>
  execFileSync("git", arguments_, { cwd: workspace, encoding: "utf8" }).trim();
const sha256 = async (path) =>
  createHash("sha256")
    .update(await readFile(resolve(workspace, path)))
    .digest("hex");

const commit = git("rev-parse", "HEAD");
if (git("status", "--porcelain") !== "") {
  throw new Error("Owner-command evidence requires a clean working tree");
}

const evidenceDirectory = resolve(workspace, "artifacts/evidence", commit);
const packageManifest = JSON.parse(
  await readFile(resolve(workspace, "package.json"), "utf8"),
);
const databaseManifest = JSON.parse(
  await readFile(resolve(workspace, "packages/database/package.json"), "utf8"),
);
const webManifest = JSON.parse(
  await readFile(resolve(workspace, "apps/web/package.json"), "utf8"),
);
const migrationEvidence = await collectMigrationEvidence(sha256);

const evidence = {
  commit,
  lockfileSha256: await sha256("pnpm-lock.yaml"),
  ...migrationEvidence,
  node: process.version,
  packageManager: packageManifest.packageManager,
  testMetadata: {
    boundaries: [
      "Tailscale-only ingress architecture and exact-origin/Fetch-Metadata mutation checks",
      "atomic idempotent receipt and pg-boss wakeup",
      "terminal job failure and transactional health-refresh checkpoint",
      "optimistic refresh, duplicate clicks, overlap, and exact rollback",
      "static mutation ownership and command registration",
      "built Chromium queued intent, worker reconciliation, and axe",
    ],
    runners: ["vitest@4.1.10", "playwright@1.61.1"],
  },
  verificationCommands: [
    "pnpm format:check",
    "pnpm lint:check",
    "pnpm typecheck",
    "pnpm test",
    "pnpm build",
    "pnpm validate:react-doctor",
    "pnpm validate:shadscan",
    "DATABASE_URL=postgres://127.0.0.1:5432/stockhawk pnpm test:integration",
    "DATABASE_URL=postgres://127.0.0.1:5432/postgres pnpm test:e2e",
  ],
  versions: {
    axePlaywright: packageManifest.devDependencies["@axe-core/playwright"],
    drizzleOrm: databaseManifest.dependencies["drizzle-orm"],
    pgBoss: databaseManifest.dependencies["pg-boss"],
    playwright: packageManifest.devDependencies["@playwright/test"],
    query: webManifest.dependencies["@tanstack/react-query"],
    typescript: packageManifest.devDependencies.typescript,
  },
};

await mkdir(evidenceDirectory, { recursive: true });
const formattedEvidence = await format(JSON.stringify(evidence), {
  parser: "json",
});
await writeFile(
  resolve(evidenceDirectory, "owner-command.json"),
  formattedEvidence,
  "utf8",
);
