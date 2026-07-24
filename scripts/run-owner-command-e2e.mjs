import { execFile, execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const workspace = resolve(fileURLToPath(new URL("..", import.meta.url)));
const databaseName = `stockhawk_e2e_${process.pid}_${randomBytes(6).toString("hex")}`;
const baseDatabaseUrl = new URL(
  process.env.DATABASE_URL ?? "postgres://127.0.0.1:5432/postgres",
);
const host =
  baseDatabaseUrl.hostname === "[::1]" ? "::1" : baseDatabaseUrl.hostname;
if (!["127.0.0.1", "::1", "localhost"].includes(host)) {
  throw new Error("Owner-command E2E requires loopback PostgreSQL");
}
const testDatabaseUrl = new URL(baseDatabaseUrl);
testDatabaseUrl.pathname = `/${databaseName}`;
testDatabaseUrl.search = "";
const processes = [];
let databaseCreated = false;
let databaseCredentialDirectory;
let databaseToolEnvironment;

const escapePgPass = (value) =>
  value.replaceAll("\\", "\\\\").replaceAll(":", "\\:");

const run = (command, arguments_, options = {}) =>
  new Promise((resolveRun, rejectRun) => {
    const child = execFile(
      command,
      arguments_,
      {
        cwd: workspace,
        env: { ...process.env, ...options.env },
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (stdout !== "") {
          process.stdout.write(stdout);
        }
        if (stderr !== "") {
          process.stderr.write(stderr);
        }
        if (error === null) {
          resolveRun();
        } else {
          rejectRun(error);
        }
      },
    );
    child.stdin?.end();
  });

const availablePort = async () => {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Could not reserve an E2E API port");
  }
  await new Promise((resolveClose) => server.close(resolveClose));
  return address.port;
};

const start = (label, script, environment) => {
  const child = spawn(process.execPath, [resolve(workspace, script)], {
    cwd: workspace,
    env: { ...process.env, ...environment },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = [];
  child.stdout.on("data", (chunk) => output.push(String(chunk)));
  child.stderr.on("data", (chunk) => output.push(String(chunk)));
  processes.push({ child, label, output });
};

const waitForApplication = async (url) => {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    for (const processRecord of processes) {
      if (processRecord.child.exitCode !== null) {
        throw new Error(
          `${processRecord.label} exited before readiness\n${processRecord.output.join("")}`,
        );
      }
    }
    try {
      const response = await fetch(`${url}/api/readiness`);
      if (response.ok) {
        return;
      }
    } catch {
      // Services are still starting.
    }
    await setTimeout(100);
  }
  throw new Error("Built StockHawk services did not become ready");
};

const stopProcesses = async () => {
  await Promise.all(
    processes.map(async ({ child }) => {
      if (child.exitCode !== null) {
        return;
      }
      await new Promise((resolveExit) => {
        const timeout = globalThis.setTimeout(resolveExit, 5_000);
        child.once("exit", () => {
          globalThis.clearTimeout(timeout);
          resolveExit();
        });
        child.kill("SIGTERM");
      });
      if (child.exitCode === null) {
        child.kill("SIGKILL");
        await once(child, "exit");
      }
    }),
  );
};

try {
  databaseToolEnvironment = Object.fromEntries(
    Object.entries(process.env).filter(
      ([name]) => name !== "DATABASE_URL" && !name.startsWith("PG"),
    ),
  );
  Object.assign(databaseToolEnvironment, {
    PGHOST: host,
    PGPORT: baseDatabaseUrl.port || "5432",
  });
  if (baseDatabaseUrl.username !== "") {
    const decodedUser = decodeURIComponent(baseDatabaseUrl.username);
    if (/[\r\n]/u.test(decodedUser)) {
      throw new Error(
        "Owner-command E2E database username cannot contain line breaks",
      );
    }
    databaseToolEnvironment.PGUSER = decodedUser;
  }
  if (baseDatabaseUrl.password !== "") {
    const decodedValue = decodeURIComponent(baseDatabaseUrl.password);
    if (/[\r\n]/u.test(decodedValue)) {
      throw new Error(
        "Owner-command E2E database credential cannot contain line breaks",
      );
    }
    databaseCredentialDirectory = await mkdtemp(
      join(tmpdir(), "stockhawk-e2e-pgpass-"),
    );
    const passwordFile = join(databaseCredentialDirectory, "pgpass");
    await writeFile(passwordFile, `*:*:*:*:${escapePgPass(decodedValue)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    databaseToolEnvironment.PGPASSFILE = passwordFile;
  }

  execFileSync("createdb", ["--maintenance-db=postgres", databaseName], {
    cwd: workspace,
    env: databaseToolEnvironment,
    stdio: "inherit",
  });
  databaseCreated = true;
  await run("pnpm", ["--filter", "@stockhawk/database", "migrate"], {
    env: { DATABASE_URL: testDatabaseUrl.toString() },
  });

  const port = await availablePort();
  const applicationUrl = `http://127.0.0.1:${port}`;
  const serviceEnvironment = {
    DATABASE_URL: testDatabaseUrl.toString(),
  };
  start("worker", "apps/worker/dist/main.js", serviceEnvironment);
  start("api", "apps/api/dist/main.js", {
    ...serviceEnvironment,
    APP_ORIGINS: applicationUrl,
    HOST: "127.0.0.1",
    PORT: String(port),
    WEB_DIST_PATH: resolve(workspace, "apps/web/dist"),
  });
  await waitForApplication(applicationUrl);
  await run(
    "pnpm",
    ["exec", "playwright", "test", "--config", "playwright.config.mjs"],
    { env: { STOCKHAWK_E2E_BASE_URL: applicationUrl } },
  );
} finally {
  try {
    await stopProcesses();
    if (databaseCreated) {
      execFileSync(
        "dropdb",
        ["--maintenance-db=postgres", "--if-exists", "--force", databaseName],
        {
          cwd: workspace,
          env: databaseToolEnvironment,
          stdio: "inherit",
        },
      );
    }
  } finally {
    if (databaseCredentialDirectory !== undefined) {
      await rm(databaseCredentialDirectory, { force: true, recursive: true });
    }
  }
}
