import { execFile } from "node:child_process";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execute = promisify(execFile);
const webSourceDirectory = resolve(process.cwd(), "../../apps/web/src");

const listStylesheets = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const stylesheets = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        return listStylesheets(path);
      }
      return path.endsWith(".css") ? [path] : [];
    }),
  );
  return stylesheets.flat();
};

const lintSource = async (source: string) => {
  const fixtureDirectory = await mkdtemp(
    join(resolve(process.cwd(), "../../apps/web/src"), ".tailwind-policy-"),
  );
  const fixture = join(fixtureDirectory, "fixture.tsx");
  await writeFile(fixture, source);

  try {
    await execute(
      join(process.cwd(), "../../node_modules/.bin/oxlint"),
      ["--deny-warnings", "--config", "../../.oxlintrc.json", fixture],
      { cwd: process.cwd() },
    );
    return "";
  } catch (error) {
    return typeof error === "object" && error !== null
      ? `${String(Reflect.get(error, "stdout"))}\n${String(Reflect.get(error, "stderr"))}`
      : String(error);
  } finally {
    await rm(fixtureDirectory, { recursive: true });
  }
};

const lint = async (className: string) => {
  const output = await lintSource(
    `export const Example = () => <div className="${className}" />;`,
  );
  return [...output.matchAll(/tailwindcss\(([a-z-]+)\)/g)].map(
    ([, ruleName]) => `tailwindcss/${ruleName}`,
  );
};

describe("Tailwind policy", () => {
  it("allows only the Tailwind entry stylesheet", async () => {
    const stylesheets = await listStylesheets(webSourceDirectory);

    expect(
      stylesheets
        .map((stylesheet) => relative(webSourceDirectory, stylesheet))
        .toSorted(),
    ).toEqual(["styles.css"]);
  });

  it("rejects component stylesheet imports", async () => {
    await expect(
      lintSource('import "./component.css";\nexport const Example = 1;'),
    ).resolves.toContain("no-restricted-imports");
  });

  it("rejects JavaScript extensions in browser imports", async () => {
    await expect(
      lintSource('import "./module.js";\nexport const Example = 1;'),
    ).resolves.toContain("no-restricted-imports");
  });

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
