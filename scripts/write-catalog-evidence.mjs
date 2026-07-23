import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const workspace = resolve(import.meta.dirname, "..");
const git = (...arguments_) =>
  execFileSync("git", arguments_, { cwd: workspace, encoding: "utf8" }).trim();
const sha256 = async (path) =>
  createHash("sha256")
    .update(await readFile(resolve(workspace, path)))
    .digest("hex");

const commit = git("rev-parse", "HEAD");
if (git("status", "--porcelain") !== "") {
  throw new Error("Catalog evidence requires a clean working tree");
}

const evidenceDirectory = resolve(workspace, "artifacts/evidence", commit);
const packageManifest = JSON.parse(
  await readFile(resolve(workspace, "package.json"), "utf8"),
);
const webManifest = JSON.parse(
  await readFile(resolve(workspace, "apps/web/package.json"), "utf8"),
);
const databaseManifest = JSON.parse(
  await readFile(resolve(workspace, "packages/database/package.json"), "utf8"),
);

const evidence = {
  commit,
  designSha256: await sha256(
    ".scratch/stockhawk-v1/design/stockhawk-v1-design-prototype.html",
  ),
  lockfileSha256: await sha256("pnpm-lock.yaml"),
  migrationSha256: {
    catalogPersistence: await sha256(
      "packages/database/migrations/0001_catalog_persistence.sql",
    ),
    catalogInvariants: await sha256(
      "packages/database/migrations/0002_strengthen_catalog_invariants.sql",
    ),
    searchDocumentSource: await sha256(
      "packages/database/migrations/0003_search_document_source.sql",
    ),
  },
  node: process.version,
  packageManager: packageManifest.packageManager,
  schemaVersion: "0003_search_document_source",
  testMetadata: {
    database: [
      "atomic rollback",
      "idempotent replay",
      "stale observation history",
      "concurrent out-of-order serialization",
      "one active catalog match",
      "evidence-backed catalog match",
      "current-state observation consistency",
      "causal event uniqueness",
      "search-document rebuild equivalence",
    ],
    interfaces: [
      "Fastify Offer API against PostgreSQL",
      "server-backed match-any Offer search and filters",
      "TanStack Table v9 Search composition",
    ],
    runner: "vitest@4.1.10",
  },
  verificationCommands: [
    "pnpm format:check",
    "pnpm lint:check",
    "pnpm typecheck",
    "pnpm test",
    "pnpm build",
    "DATABASE_URL=postgres://127.0.0.1:5432/stockhawk pnpm test:integration",
  ],
  versions: {
    baseUi: webManifest.dependencies["@base-ui/react"],
    drizzleKit: databaseManifest.devDependencies["drizzle-kit"],
    drizzleOrm: databaseManifest.dependencies["drizzle-orm"],
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
  resolve(evidenceDirectory, "catalog.json"),
  `${JSON.stringify(evidence, null, 2)}\n`,
  "utf8",
);
