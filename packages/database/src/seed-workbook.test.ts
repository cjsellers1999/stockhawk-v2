import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildSeedWorkbookInput,
  comparisonEndpointKey,
  readSeedWorkbook,
  SEED_WORKBOOK_SHA256,
} from "./seed-workbook.js";

const workbookPath = resolve(
  import.meta.dirname,
  "../../../data/seed/stockhawk-sites.xlsx",
);

describe("Seed workbook import", () => {
  it("reconciles every immutable source row to the approved Candidate identities", async () => {
    const seed = await readSeedWorkbook(workbookPath);

    expect(seed.fileSha256).toBe(SEED_WORKBOOK_SHA256);
    expect(seed.sourceRecords).toHaveLength(2_712);
    expect(seed.candidates).toHaveLength(2_489);
    expect(
      seed.candidates.reduce(
        (total, candidate) => total + candidate.sourceRecordIdentities.length,
        0,
      ),
    ).toBe(2_712);
    expect(seed.sourceRecords[0]).toMatchObject({
      baseUrl: "https://www.101westvine.store/",
      legacyConnectorLabel: "shopify",
      name: "101 West Vine",
      rawValues: [
        1487,
        "101 West Vine",
        "https://www.101westvine.store/",
        "shopify",
        "authoritative",
        "full_site",
        "certified",
        true,
        false,
        60,
        60,
        0,
        "2026-05-10T03:33:56.104Z",
        null,
        null,
        null,
        null,
        "2026-05-24T23:53:48.808Z",
        null,
        "2026-05-25T02:22:49.542Z",
        "2026-02-05T04:37:00.000Z",
        "2026-05-25T02:22:49.542Z",
        "{}",
      ],
      sourceRecordId: 1487,
      sourceRowNumber: 5,
    });
  });

  it("normalizes only the approved endpoint-equivalence facts", () => {
    expect(
      [
        "http://WWW.Example.com.:80/store//?utm_source=mail&b=2&a=1#top",
        "https://example.com/store?a=1&b=2",
      ].map(comparisonEndpointKey),
    ).toEqual(["example.com/store?a=1&b=2", "example.com/store?a=1&b=2"]);
    expect(comparisonEndpointKey("https://shop.example.com/store")).not.toBe(
      comparisonEndpointKey("https://example.com/store"),
    );
    expect(
      comparisonEndpointKey("https://example.com/store?branch=2"),
    ).not.toBe(comparisonEndpointKey("https://example.com/store"));
  });

  it("fails closed before parsing a workbook with the wrong content hash", async () => {
    await expect(
      readSeedWorkbook(workbookPath, "0".repeat(64)),
    ).rejects.toThrow(/SHA-256 mismatch/);
  });

  it("rejects a changed Sites header before deriving Candidate Sites", () => {
    expect(() =>
      buildSeedWorkbookInput({
        fileName: "changed.xlsx",
        fileSha256: "0".repeat(64),
        rows: [[], [], [], ["Changed"]],
      }),
    ).toThrow(/header/);
  });
});
