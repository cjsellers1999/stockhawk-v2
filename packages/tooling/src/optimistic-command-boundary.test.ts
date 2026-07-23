import { readdir, readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  auditOptimisticCommandBoundary,
  type BoundarySource,
} from "./optimistic-command-boundary.js";

const repositoryRoot = resolve(process.cwd(), "../..");
const webSourceDirectory = join(repositoryRoot, "apps/web/src");
const boundaryDirectory = join(webSourceDirectory, "features/command-boundary");
const registryPath = join(boundaryDirectory, "owner-command-registry.ts");

const listFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? listFiles(path) : [path];
    }),
  );
  return nested.flat();
};

const readWebSources = async (): Promise<BoundarySource[]> =>
  Promise.all(
    (await listFiles(webSourceDirectory))
      .filter(
        (file) =>
          [".ts", ".tsx"].includes(extname(file)) && !file.includes(".test."),
      )
      .map(async (file) => ({ file, source: await readFile(file, "utf8") })),
  );

const audit = (sources: BoundarySource[]) =>
  auditOptimisticCommandBoundary({
    boundaryDirectory,
    registryPath,
    repositoryRoot,
    sources,
  });

describe("optimistic command boundary", () => {
  it("owns all mutation imports, calls, and registered families", async () => {
    expect(audit(await readWebSources())).toEqual({
      mutationFetches: [],
      mutationImports: [],
      unregisteredFamilies: [],
    });
  });

  it("rejects aliased mutations, constructed endpoints, and variable families", () => {
    const featurePath = join(webSourceDirectory, "features/example.ts");
    const violations = audit([
      {
        file: registryPath,
        source:
          "export const ownerCommandRegistry = { refresh_health: {} } as const;",
      },
      {
        file: featurePath,
        source: `
          import { useMutation as mutate } from "@tanstack/react-query";
          const endpoint = ["/api", "unsafe"].join("/");
          const method = "POST";
          const family = "unregistered_command";
          mutate();
          fetch(endpoint, { method });
          export const command = { family };
        `,
      },
    ]);

    expect(violations).toEqual({
      mutationFetches: ["apps/web/src/features/example.ts"],
      mutationImports: ["apps/web/src/features/example.ts"],
      unregisteredFamilies: [
        "apps/web/src/features/example.ts:unregistered_command",
      ],
    });
  });
});
