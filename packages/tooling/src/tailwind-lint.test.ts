import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execute = promisify(execFile);

const lint = async (className: string) => {
  const fixtureDirectory = await mkdtemp(
    join(resolve(process.cwd(), "../../apps/web/src"), ".tailwind-policy-"),
  );
  const fixture = join(fixtureDirectory, "fixture.tsx");
  await writeFile(
    fixture,
    `export const Example = () => <div className="${className}" />;`,
  );

  try {
    await execute(
      join(process.cwd(), "../../node_modules/.bin/oxlint"),
      ["--deny-warnings", "--config", "../../.oxlintrc.json", fixture],
      { cwd: process.cwd() },
    );
    return [];
  } catch (error) {
    const output =
      typeof error === "object" && error !== null
        ? `${String(Reflect.get(error, "stdout"))}\n${String(Reflect.get(error, "stderr"))}`
        : String(error);
    return [...output.matchAll(/tailwindcss\(([a-z-]+)\)/g)].map(
      ([, ruleName]) => `tailwindcss/${ruleName}`,
    );
  } finally {
    await rm(fixtureDirectory, { recursive: true });
  }
};

describe("Tailwind policy", () => {
  it("accepts ordered semantic utilities and state variants", async () => {
    await expect(
      lint("rounded-md bg-background text-foreground hover:bg-accent"),
    ).resolves.toEqual([]);
  });

  it("rejects arbitrary values", async () => {
    await expect(lint("w-[13px]")).resolves.toContain(
      "tailwindcss/no-arbitrary-value",
    );
  });

  it("rejects unknown classes", async () => {
    await expect(lint("stockhawk-mystery-class")).resolves.toContain(
      "tailwindcss/no-custom-classname",
    );
  });
});
