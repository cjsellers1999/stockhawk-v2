import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execute = promisify(execFile);
const repositoryRoot = resolve(process.cwd(), "../..");
const uiSourceDirectory = resolve(repositoryRoot, "packages/ui/src");
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

const listFrontendSources = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const sources = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        return listFrontendSources(path);
      }
      return /\.(?:ts|tsx)$/.test(path) ? [path] : [];
    }),
  );
  return sources.flat();
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
  it("allows only the UI theme and web Tailwind entrypoint stylesheets", async () => {
    const [uiStylesheets, webStylesheets] = await Promise.all([
      listStylesheets(uiSourceDirectory),
      listStylesheets(webSourceDirectory),
    ]);

    expect(
      uiStylesheets
        .map((stylesheet) => relative(uiSourceDirectory, stylesheet))
        .toSorted(),
    ).toEqual(["styles.css"]);
    expect(
      webStylesheets
        .map((stylesheet) => relative(webSourceDirectory, stylesheet))
        .toSorted(),
    ).toEqual(["styles.css"]);
  });

  it("keeps theme declarations in the UI package", async () => {
    const webStyles = await readFile(
      join(webSourceDirectory, "styles.css"),
      "utf8",
    );

    expect(webStyles).toContain('@import "@stockhawk/ui/styles.css";');
    expect(webStyles).not.toMatch(
      /@theme|:root|--breakpoint-|--color-|--radius-|--text-/,
    );
  });

  it("owns typography and breakpoints in the UI theme", async () => {
    const uiStyles = await readFile(
      join(uiSourceDirectory, "styles.css"),
      "utf8",
    );

    expect(uiStyles).toMatch(/--breakpoint-sm:\s*40rem/);
    expect(uiStyles).toMatch(/--breakpoint-md:\s*48rem/);
    expect(uiStyles).toMatch(/--breakpoint-lg:\s*64rem/);
    expect(uiStyles).toMatch(/--breakpoint-xl:\s*80rem/);
    expect(uiStyles).toMatch(/--breakpoint-2xl:\s*96rem/);
    expect(uiStyles).toContain("@utility text-display");
    expect(uiStyles).toContain("@utility text-heading-1");
    expect(uiStyles).toContain("@utility text-body");
    expect(uiStyles).toContain("@utility text-body-strong");
    expect(uiStyles).toContain("@utility text-label");
    expect(uiStyles).toContain("@utility text-caption");
  });

  it("uses semantic typography classes in frontend components", async () => {
    const sourcePaths = (
      await Promise.all([
        listFrontendSources(uiSourceDirectory),
        listFrontendSources(webSourceDirectory),
      ])
    ).flat();
    const sources = await Promise.all(
      sourcePaths.map(async (path) => readFile(path, "utf8")),
    );

    expect(sources.join("\n")).not.toMatch(
      /(?:^|[\s"'`])(?:[a-z-]+:)*(?:font-(?:black|bold|extralight|extrabold|light|medium|normal|semibold|thin)|leading-[a-z0-9.-]+|text-(?:2xs|xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl))(?=$|[\s"'`])/m,
    );
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
