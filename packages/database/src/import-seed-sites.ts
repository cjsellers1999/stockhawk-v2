import { resolve } from "node:path";

import { createDatabase } from "./database.js";
import { decodeDatabaseConfig } from "./config.js";
import { readSeedWorkbook } from "./seed-workbook.js";

const config = decodeDatabaseConfig(process.env);
const workbookPath = resolve(
  import.meta.dirname,
  "../../../data/seed/stockhawk-sites.xlsx",
);
const database = createDatabase(config.url);

try {
  const seed = await readSeedWorkbook(workbookPath);
  const result = await database.importSeedWorkbook(seed);
  process.stdout.write(`${JSON.stringify(result)}\n`);
} finally {
  await database.close();
}
