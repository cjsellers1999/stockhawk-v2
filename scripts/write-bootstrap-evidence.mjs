import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const workspace = resolve(import.meta.dirname, "..");
const git = (...arguments_) =>
  execFileSync("git", arguments_, { cwd: workspace, encoding: "utf8" }).trim();
const sha256 = async (path) =>
  createHash("sha256")
    .update(await readFile(resolve(workspace, path)))
    .digest("hex");

const commit = git("rev-parse", "HEAD");
const evidenceDirectory = resolve(workspace, "artifacts/evidence", commit);
const packageManifest = JSON.parse(
  await readFile(resolve(workspace, "package.json"), "utf8"),
);
const webManifest = JSON.parse(
  await readFile(resolve(workspace, "apps/web/package.json"), "utf8"),
);

const evidence = {
  command: "corepack pnpm verify",
  commit,
  designSha256: await sha256(
    ".scratch/stockhawk-v1/design/stockhawk-v1-design-prototype.html",
  ),
  lockfileSha256: await sha256("pnpm-lock.yaml"),
  migrationSha256: await sha256(
    "packages/database/migrations/0001_bootstrap.sql",
  ),
  node: process.version,
  packageManager: packageManifest.packageManager,
  schemaVersion: "0001_bootstrap",
  testMetadata: {
    runner: "vitest@4.1.10",
    suites: [
      "contracts",
      "startup-config",
      "readiness",
      "shell",
      "tooling",
      "database",
    ],
  },
  versions: {
    baseUi: webManifest.dependencies["@base-ui/react"],
    query: webManifest.dependencies["@tanstack/react-query"],
    shadcn: webManifest.devDependencies.shadcn,
    table: webManifest.dependencies["@tanstack/react-table"],
    tailwind: webManifest.devDependencies.tailwindcss,
    turbo: packageManifest.devDependencies.turbo,
    typescript: packageManifest.devDependencies.typescript,
  },
};

await mkdir(evidenceDirectory, { recursive: true });
await writeFile(
  resolve(evidenceDirectory, "runtime.json"),
  `${JSON.stringify(evidence, null, 2)}\n`,
  "utf8",
);
