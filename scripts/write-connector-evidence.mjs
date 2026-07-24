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
const verify = (command, arguments_) => {
  const startedAt = Date.now();
  execFileSync(command, arguments_, {
    cwd: workspace,
    env: process.env,
    stdio: "inherit",
  });
  return {
    command: [command, ...arguments_].join(" "),
    durationMilliseconds: Date.now() - startedAt,
    outcome: "passed",
  };
};

const commit = git("rev-parse", "HEAD");
if (git("status", "--porcelain") !== "") {
  throw new Error("Connector evidence requires a clean working tree");
}

const evidenceDirectory = resolve(workspace, "artifacts/evidence", commit);
const packageManifest = JSON.parse(
  await readFile(resolve(workspace, "package.json"), "utf8"),
);
const connectorManifest = JSON.parse(
  await readFile(
    resolve(workspace, "packages/connectors/package.json"),
    "utf8",
  ),
);
const migrationEvidence = await collectMigrationEvidence(sha256);
const verificationResults = [
  verify("pnpm", ["verify"]),
  verify("pnpm", ["--filter", "@stockhawk/connectors", "test"]),
  verify("pnpm", ["--filter", "@stockhawk/database", "test:integration"]),
];

const evidence = {
  commit,
  connector: {
    adapter: "fixture-http@1.0.0",
    jobs: ["catalog_discovery", "stock_monitoring"],
    resumeModes: ["checkpoint", "restart_only"],
    schemaVersion: 1,
  },
  lockfileSha256: await sha256("pnpm-lock.yaml"),
  ...migrationEvidence,
  environment: {
    architecture: process.arch,
    node: process.version,
    platform: process.platform,
  },
  fixture: {
    deterministicSeed: null,
    version: "fixture-http@1.0.0",
  },
  packageManager: packageManifest.packageManager,
  testMetadata: {
    boundaries: [
      "strict versioned Integration and common Connector output contracts",
      "retailer envelope additive-field tolerance with consumed-field validation",
      "global and Storefront permits, cache, backoff, redirect/origin, SSRF, image, and browser governance",
      "pagination, duplicate identities, checkpoint resume, restart-only replay, cancellation, and typed failure conformance",
      "complete Stock Monitoring target accounting and Adapter-neutral registry resolution",
      "atomic monotonic PostgreSQL batch, raw evidence, raw listing observation, and opaque checkpoint persistence",
      "static rejection of direct server-side outbound network primitives",
    ],
    runners: ["vitest@4.1.10"],
  },
  verificationCommands: [
    "pnpm format:check",
    "pnpm lint:check",
    "pnpm typecheck",
    "pnpm test",
    "pnpm build",
    "DATABASE_URL=postgres://127.0.0.1:5432/<temporary-database> pnpm test:integration",
  ],
  verificationResults,
  versions: {
    typescript: packageManifest.devDependencies.typescript,
    zod: connectorManifest.dependencies.zod,
  },
};

await mkdir(evidenceDirectory, { recursive: true });
const formattedEvidence = await format(JSON.stringify(evidence), {
  parser: "json",
});
await writeFile(
  resolve(evidenceDirectory, "connector.json"),
  formattedEvidence,
  "utf8",
);
