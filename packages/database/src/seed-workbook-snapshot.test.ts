import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

type WorkbookCell = boolean | number | string | null;

const workbookBoundaries = vi.hoisted(() => ({
  readFile: vi.fn<(path: string) => Promise<Buffer>>(),
  readSheet:
    vi.fn<
      (
        input: Buffer | string,
        sheet?: number | string,
      ) => Promise<WorkbookCell[][]>
    >(),
}));

vi.mock("node:fs/promises", () => ({
  readFile: workbookBoundaries.readFile,
}));
vi.mock("read-excel-file/node", () => ({
  readSheet: workbookBoundaries.readSheet,
}));

import { readSeedWorkbook, seedHeaders } from "./seed-workbook.js";

const workbookRows = () => {
  const rows: WorkbookCell[][] = [[], [], [], [...seedHeaders]];
  for (let index = 0; index < 2_712; index += 1) {
    const row = Array<WorkbookCell>(23).fill(null);
    row[0] = index + 1;
    row[1] = `Seed Site ${index + 1}`;
    row[2] = "https://example.com/store";
    row[3] = "shopify";
    rows.push(row);
  }
  return rows;
};

describe("Seed workbook snapshot", () => {
  it("parses the exact workbook bytes whose hash was verified", async () => {
    const trustedBytes = Buffer.from("trusted workbook snapshot");
    const trustedHash = createHash("sha256").update(trustedBytes).digest("hex");
    workbookBoundaries.readFile.mockResolvedValue(trustedBytes);
    workbookBoundaries.readSheet.mockImplementation(async (input) => {
      if (!Buffer.isBuffer(input)) {
        throw new TypeError("Workbook path was reopened after verification");
      }
      return workbookRows();
    });

    const seed = await readSeedWorkbook("stockhawk-sites.xlsx", trustedHash);

    expect(seed.sourceRecords).toHaveLength(2_712);
    expect(seed.fileSha256).toBe(trustedHash);
  });
});
