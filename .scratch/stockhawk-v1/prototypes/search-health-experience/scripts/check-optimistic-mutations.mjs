import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import process from "node:process";

const sourceRoot = new URL("../src/", import.meta.url);
const allowedFile = "data/use-optimistic-command-mutation.ts";
const violations = [];

async function inspectDirectory(directoryUrl) {
  const entries = await readdir(directoryUrl, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const entryUrl = new URL(entry.name, directoryUrl);

      if (entry.isDirectory()) {
        await inspectDirectory(new URL(`${entry.name}/`, directoryUrl));
        return;
      }

      if (![".ts", ".tsx"].includes(extname(entry.name))) return;

      const pathname = join(entryUrl.pathname);
      const projectPath = relative(sourceRoot.pathname, pathname);
      if (projectPath === allowedFile) return;

      const source = await readFile(entryUrl, "utf8");
      const importsUseMutation = /import\s*\{[^}]*\buseMutation\b[^}]*\}\s*from\s*["']@tanstack\/react-query["']/s.test(
        source,
      );
      const namespaceUseMutation = /\.useMutation\s*\(/.test(source);

      if (importsUseMutation || namespaceUseMutation) {
        violations.push(projectPath);
      }
    }),
  );
}

await inspectDirectory(sourceRoot);

if (violations.length > 0) {
  console.error(
    `Direct mutations are forbidden. Use useOptimisticCommandMutation.\n${violations.join("\n")}`,
  );
  process.exit(1);
}

console.log("Optimistic mutation boundary enforced.");
