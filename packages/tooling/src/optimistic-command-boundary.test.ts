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
      {
        file: join(webSourceDirectory, "features/assigned-family.ts"),
        source:
          'const command = {}; command.family = "assigned_unregistered_command";',
      },
    ]);

    expect(violations).toEqual({
      mutationFetches: ["apps/web/src/features/example.ts"],
      mutationImports: ["apps/web/src/features/example.ts"],
      unregisteredFamilies: [
        "apps/web/src/features/assigned-family.ts:assigned_unregistered_command",
        "apps/web/src/features/example.ts:unregistered_command",
      ],
    });
  });

  it("fails closed when fetch behavior cannot be proven read-only", () => {
    const source = (file: string, body: string): BoundarySource => ({
      file: join(webSourceDirectory, "features", file),
      source: body,
    });
    const violations = audit([
      {
        file: registryPath,
        source:
          "export const ownerCommandRegistry = { refresh_health: {} } as const;",
      },
      source(
        "array-fetch.ts",
        'const transports = [fetch]; transports[0]("/api/unsafe", { method: "POST" });',
      ),
      source(
        "bound-fetch.ts",
        'const send = fetch.bind(globalThis); send("/api/unsafe", { method: "POST" });',
      ),
      source(
        "conditional.ts",
        'fetch("/api/unsafe", { method: condition ? "POST" : "GET" });',
      ),
      source(
        "composite-callee.ts",
        '(0, globalThis.fetch)("/api/unsafe", { method: "POST" }); (condition && fetch)("/api/unsafe", { method: "POST" });',
      ),
      source(
        "computed-fetch.ts",
        'const key = "fetch"; globalThis[key]("/api/unsafe", { method: "POST" });',
      ),
      source(
        "destructured-fetch.ts",
        'const { fetch: send } = globalThis; send("/api/unsafe", { method: "POST" });',
      ),
      source(
        "fetch-alias.ts",
        'const send = fetch; send("/api/unsafe", { method: "POST" });',
      ),
      source(
        "fetch-apply.ts",
        'fetch.apply(globalThis, ["/api/unsafe", { method: "POST" }]);',
      ),
      source(
        "fetch-call.ts",
        'fetch.call(globalThis, "/api/unsafe", { method: "POST" });',
      ),
      source(
        "method-reassignment.ts",
        'let method = "GET"; method = "POST"; fetch("/api/unsafe", { method });',
      ),
      source(
        "mutated-options.ts",
        'const options = { method: "GET" }; options.method = "POST"; fetch("/api/unsafe", options);',
      ),
      source(
        "object-fetch.ts",
        'const transport = { send: fetch }; transport.send("/api/unsafe", { method: "POST" });',
      ),
      source(
        "reassigned-fetch.ts",
        'let send = () => undefined; send = fetch; send("/api/unsafe", { method: "POST" });',
      ),
      source("dynamic-input.ts", "fetch(buildRequestFromUntrustedInput());"),
      source(
        "request.ts",
        'fetch(new Request("/api/unsafe", { method: "POST" }));',
      ),
      source(
        "shadowed-method.ts",
        'const method = "POST"; function shadow() { const method = "GET"; } fetch("/api/unsafe", { method });',
      ),
      source(
        "spread.ts",
        'const options = { method: "POST" }; fetch("/api/unsafe", { ...options });',
      ),
      source(
        "safe.ts",
        'const method = "GET"; fetch("/api/read-only"); fetch("/api/read-only", { method });',
      ),
    ]);

    expect(violations).toEqual({
      mutationFetches: [
        "apps/web/src/features/array-fetch.ts",
        "apps/web/src/features/bound-fetch.ts",
        "apps/web/src/features/composite-callee.ts",
        "apps/web/src/features/computed-fetch.ts",
        "apps/web/src/features/conditional.ts",
        "apps/web/src/features/destructured-fetch.ts",
        "apps/web/src/features/dynamic-input.ts",
        "apps/web/src/features/fetch-alias.ts",
        "apps/web/src/features/fetch-apply.ts",
        "apps/web/src/features/fetch-call.ts",
        "apps/web/src/features/method-reassignment.ts",
        "apps/web/src/features/mutated-options.ts",
        "apps/web/src/features/object-fetch.ts",
        "apps/web/src/features/reassigned-fetch.ts",
        "apps/web/src/features/request.ts",
        "apps/web/src/features/shadowed-method.ts",
        "apps/web/src/features/spread.ts",
      ],
      mutationImports: [],
      unregisteredFamilies: [],
    });
  });

  it("rejects useMutation re-exports and namespace aliases", () => {
    const violations = audit([
      {
        file: registryPath,
        source:
          "export const ownerCommandRegistry = { refresh_health: {} } as const;",
      },
      {
        file: join(webSourceDirectory, "features/direct-barrel.ts"),
        source:
          'export { useMutation as useCommand } from "@tanstack/react-query";',
      },
      {
        file: join(webSourceDirectory, "features/dynamic-import.ts"),
        source: `
          const { useMutation } = await import("@tanstack/react-query");
          useMutation();
        `,
      },
      {
        file: join(webSourceDirectory, "features/computed-namespace.ts"),
        source: `
          import * as Query from "@tanstack/react-query";
          const key = "useMutation";
          Query[key]();
        `,
      },
      {
        file: join(webSourceDirectory, "features/local-barrel.ts"),
        source: `
          import { useMutation as mutate } from "@tanstack/react-query";
          export { mutate as useCommand };
        `,
      },
      {
        file: join(webSourceDirectory, "features/namespace-destructure.ts"),
        source: `
          import * as Query from "@tanstack/react-query";
          const QueryAlias = Query;
          const { useMutation: mutate } = QueryAlias;
          mutate();
        `,
      },
      {
        file: join(webSourceDirectory, "features/namespace-barrel.ts"),
        source: `
          import * as Query from "@tanstack/react-query";
          export { Query };
        `,
      },
      {
        file: join(webSourceDirectory, "features/namespace-reassignment.ts"),
        source: `
          import * as Query from "@tanstack/react-query";
          let QueryAlias = {};
          QueryAlias = Query;
          const { useMutation: mutate } = QueryAlias;
          mutate();
        `,
      },
      {
        file: join(webSourceDirectory, "features/star-barrel.ts"),
        source: 'export * from "@tanstack/react-query";',
      },
    ]);

    expect(violations).toEqual({
      mutationFetches: [],
      mutationImports: [
        "apps/web/src/features/computed-namespace.ts",
        "apps/web/src/features/direct-barrel.ts",
        "apps/web/src/features/dynamic-import.ts",
        "apps/web/src/features/local-barrel.ts",
        "apps/web/src/features/namespace-barrel.ts",
        "apps/web/src/features/namespace-destructure.ts",
        "apps/web/src/features/namespace-reassignment.ts",
        "apps/web/src/features/star-barrel.ts",
      ],
      unregisteredFamilies: [],
    });
  });
});
