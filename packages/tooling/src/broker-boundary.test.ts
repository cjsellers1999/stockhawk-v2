import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(process.cwd(), "../..");
const productionRoots = [
  "apps/api/src",
  "apps/worker/src",
  "packages/connectors/src",
  "packages/database/src",
];
const forbiddenNetworkPatterns = [
  /(?<![.\w])fetch\s*(?:<[^>]+>)?\s*\(/,
  /\bglobalThis\.fetch\b/,
  /\b(?:from|import)\s*(?:\(\s*)?["'](?:node:)?(?:dgram|http|http2|https|net|tls)["']/,
  /\brequire\s*\(\s*["'](?:node:)?(?:dgram|http|http2|https|net|tls)["']/,
  /["'](?:axios|got|undici)["']/,
  /["'](?:playwright|playwright-core|puppeteer)["']/,
  /\b(?:EventSource|WebSocket)\b/,
];

const sourceFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        return sourceFiles(path);
      }
      if (
        extname(entry.name) === ".ts" &&
        !entry.name.endsWith(".test.ts") &&
        !entry.name.endsWith(".config.ts")
      ) {
        return [path];
      }
      return [];
    }),
  );
  return files.flat();
};

describe("Crawl Request Broker boundary", () => {
  it("rejects direct outbound network primitives from production Modules", async () => {
    const files = (
      await Promise.all(
        productionRoots.map((root) => sourceFiles(join(repositoryRoot, root))),
      )
    ).flat();
    const inspected = await Promise.all(
      files.map(async (file) => ({
        file,
        source: await readFile(file, "utf8"),
      })),
    );
    const violations = inspected
      .filter(({ source }) =>
        forbiddenNetworkPatterns.some((pattern) => pattern.test(source)),
      )
      .map(({ file }) => relative(repositoryRoot, file));

    expect(violations).toEqual([]);
  });
});
