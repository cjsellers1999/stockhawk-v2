import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(process.cwd(), "../..");

const readCompilerOption = async (path: string, option: string) => {
  const config: unknown = JSON.parse(
    await readFile(join(repositoryRoot, path), "utf8"),
  );
  if (typeof config !== "object" || config === null) {
    throw new Error(`${path} must contain an object`);
  }
  const compilerOptions = Reflect.get(config, "compilerOptions");
  if (typeof compilerOptions !== "object" || compilerOptions === null) {
    throw new Error(`${path} must define compilerOptions`);
  }
  return Reflect.get(compilerOptions, option);
};

describe("TypeScript configuration policy", () => {
  it("uses the shared strictness recommendations", async () => {
    await expect(
      readCompilerOption("tsconfig.base.json", "moduleDetection"),
    ).resolves.toBe("force");
    await expect(
      readCompilerOption("tsconfig.base.json", "noImplicitOverride"),
    ).resolves.toBe(true);
    await expect(
      readCompilerOption("tsconfig.base.json", "noUncheckedIndexedAccess"),
    ).resolves.toBe(true);
    await expect(
      readCompilerOption("tsconfig.base.json", "verbatimModuleSyntax"),
    ).resolves.toBe(true);
  });

  it.each([
    "apps/web/tsconfig.app.json",
    "apps/web/tsconfig.node.json",
    "packages/tooling/tsconfig.json",
    "packages/ui/tsconfig.json",
  ])("uses Preserve without TypeScript emit for %s", async (path) => {
    await expect(readCompilerOption(path, "module")).resolves.toBe("Preserve");
    await expect(readCompilerOption(path, "noEmit")).resolves.toBe(true);
  });

  it.each([
    "apps/api/tsconfig.json",
    "apps/worker/tsconfig.json",
    "packages/contracts/tsconfig.json",
    "packages/database/tsconfig.json",
  ])("uses NodeNext for TypeScript-emitted Node code in %s", async (path) => {
    await expect(readCompilerOption(path, "module")).resolves.toBe("NodeNext");
    await expect(readCompilerOption(path, "noEmit")).resolves.toBe(true);
  });
});
