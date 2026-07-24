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
  throw new Error("Onboarding evidence requires a clean working tree");
}

const evidenceDirectory = resolve(workspace, "artifacts/evidence", commit);
const packageManifest = JSON.parse(
  await readFile(resolve(workspace, "package.json"), "utf8"),
);
const databaseManifest = JSON.parse(
  await readFile(resolve(workspace, "packages/database/package.json"), "utf8"),
);
const migrationEvidence = await collectMigrationEvidence(sha256);

const evidence = {
  commit,
  lockfileSha256: await sha256("pnpm-lock.yaml"),
  ...migrationEvidence,
  node: process.version,
  packageManager: packageManifest.packageManager,
  seedList: {
    candidateSites: 2_489,
    normalizationRuleVersion: 1,
    sourceColumns: 23,
    sourceRecords: 2_712,
    workbook: "data/seed/stockhawk-sites.xlsx",
    workbookSha256: await sha256("data/seed/stockhawk-sites.xlsx"),
    worksheet: "Sites",
  },
  testMetadata: {
    boundaries: [
      "immutable workbook hash, header, row count, and semantic row preservation",
      "approved endpoint-equivalence normalization and exact source reconciliation",
      "atomic idempotent PostgreSQL Seed List import",
      "durable Onboarding Case pause, queued resume, revision guard, and replay",
      "exact-Origin and same-origin Fetch Metadata command checks",
      "optimistic queued intent, duplicate-click suppression, and refresh recovery",
    ],
    runners: ["vitest@4.1.10"],
  },
  verificationCommands: [
    "pnpm format:check",
    "pnpm lint:check",
    "pnpm typecheck",
    "pnpm test",
    "pnpm build",
    "pnpm validate:react-doctor",
    "pnpm validate:shadscan",
    "pnpm test:e2e",
    "DATABASE_URL=postgres://127.0.0.1:5432/<temporary-database> pnpm test:integration",
    "DATABASE_URL=postgres://127.0.0.1:5432/<temporary-database> pnpm seed:sites",
  ],
  versions: {
    drizzleOrm: databaseManifest.dependencies["drizzle-orm"],
    readExcelFile: databaseManifest.dependencies["read-excel-file"],
    typescript: packageManifest.devDependencies.typescript,
    zod: databaseManifest.dependencies.zod,
  },
};

await mkdir(evidenceDirectory, { recursive: true });
const formattedEvidence = await format(JSON.stringify(evidence), {
  parser: "json",
});
await writeFile(
  resolve(evidenceDirectory, "onboarding.json"),
  formattedEvidence,
  "utf8",
);
