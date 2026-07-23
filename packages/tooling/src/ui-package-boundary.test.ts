import { readdir, readFile } from "node:fs/promises";
import { basename, extname, join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(process.cwd(), "../..");
const uiSourceDirectory = join(repositoryRoot, "packages/ui/src");
const webSourceDirectory = join(repositoryRoot, "apps/web/src");

const listFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? listFiles(path) : [path];
    }),
  );
  return files.flat();
};

const decodeExportKeys = (source: string) => {
  const packageJson: unknown = JSON.parse(source);
  if (typeof packageJson !== "object" || packageJson === null) {
    throw new Error("UI package manifest must be an object");
  }
  const packageExports = Reflect.get(packageJson, "exports");
  if (typeof packageExports !== "object" || packageExports === null) {
    throw new Error("UI package manifest must define exports");
  }
  return Object.keys(packageExports);
};

describe("UI package boundary", () => {
  it("keeps reusable UI out of the web app's shared component folder", async () => {
    const webFiles = await listFiles(webSourceDirectory);

    expect(
      webFiles
        .map((file) => relative(webSourceDirectory, file))
        .filter((file) => file.startsWith("components/ui/")),
    ).toEqual([]);
  });

  it("keeps UI modules app-agnostic and explicitly exported", async () => {
    const uiFiles = (await listFiles(uiSourceDirectory)).filter((file) =>
      [".ts", ".tsx"].includes(extname(file)),
    );
    const sources = await Promise.all(
      uiFiles.map(async (file) => readFile(file, "utf8")),
    );
    const exportKeys = decodeExportKeys(
      await readFile(join(repositoryRoot, "packages/ui/package.json"), "utf8"),
    );
    const expectedExports = uiFiles
      .map((file) => `./${basename(file, extname(file))}`)
      .toSorted();

    expect(exportKeys.toSorted()).toEqual(expectedExports);
    expect(sources.join("\n")).not.toMatch(
      /@stockhawk\/contracts|apps\/web|features\//,
    );
    expect(expectedExports).not.toContain("./index");
  });
});
