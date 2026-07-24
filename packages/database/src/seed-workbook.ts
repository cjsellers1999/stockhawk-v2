import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { readSheet } from "read-excel-file/node";

export const SEED_WORKBOOK_SHA256 =
  "0c4d846c6547e4d36d49de7c4aff250b63ec2cec9b39bfa166aa648586f53bbf";
export const SEED_WORKSHEET_NAME = "Sites";
export const SEED_SOURCE_RECORD_COUNT = 2_712;
export const SEED_SOURCE_COLUMN_COUNT = 23;
export const SEED_NORMALIZATION_RULE_VERSION = 1;

export const seedHeaders = [
  "ID",
  "Name",
  "Base URL",
  "Connector Type",
  "Catalog Classification",
  "Catalog Coverage Scope",
  "Catalog Certification State",
  "Active",
  "Suspended",
  "Check Interval (sec)",
  "Rate Limit (RPM)",
  "Consecutive Failures",
  "Last Success (UTC)",
  "Last Error At (UTC)",
  "Last Error",
  "Suspended At (UTC)",
  "Suspend Reason",
  "Catalog Last Certified (UTC)",
  "Catalog Freeze Reason",
  "Catalog Policy Updated (UTC)",
  "Created At (UTC)",
  "Updated At (UTC)",
  "Connector Config",
] as const;

type JsonCellValue = boolean | number | string | null;
type SeedCellValue = Date | boolean | number | string | null;

export type SeedSiteRecordInput = {
  baseUrl: string;
  identity: string;
  legacyConnectorLabel: string;
  name: string;
  rawRecordHash: string;
  rawValues: JsonCellValue[];
  sourceRecordId: number;
  sourceRowNumber: number;
};

export type CandidateSiteInput = {
  comparisonEndpointKey: string;
  identity: string;
  name: string;
  sourceRecordIdentities: string[];
  url: string;
};

export type SeedWorkbookInput = {
  candidates: CandidateSiteInput[];
  columnCount: number;
  fileName: string;
  fileSha256: string;
  headers: string[];
  importIdentity: string;
  sourceRecords: SeedSiteRecordInput[];
  worksheetName: string;
};

const sha256 = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");

const identity = (prefix: "cnd" | "sim" | "ssr", value: string) =>
  `${prefix}_${sha256(value).slice(0, 32)}`;

const sorted = <Value>(
  values: readonly Value[],
  compare: (left: Value, right: Value) => number,
) => {
  const result: Value[] = [];
  for (const value of values) {
    const insertionIndex = result.findIndex(
      (candidate) => compare(value, candidate) < 0,
    );
    if (insertionIndex === -1) {
      result.push(value);
    } else {
      result.splice(insertionIndex, 0, value);
    }
  }
  return result;
};

const cellValueForJson = (value: SeedCellValue): JsonCellValue =>
  value instanceof Date ? value.toISOString() : value;

const decodeRows = (unparsedRows: unknown): SeedCellValue[][] => {
  if (!Array.isArray(unparsedRows)) {
    throw new TypeError("Seed workbook Sites worksheet must contain rows");
  }
  return unparsedRows.map((unparsedRow, rowIndex) => {
    if (!Array.isArray(unparsedRow)) {
      throw new TypeError(
        `Seed workbook row ${rowIndex + 1} must contain cells`,
      );
    }
    return unparsedRow.map((value, columnIndex) => {
      if (
        value === null ||
        typeof value === "boolean" ||
        typeof value === "number" ||
        typeof value === "string" ||
        value instanceof Date
      ) {
        return value;
      }
      throw new TypeError(
        `Seed workbook cell ${rowIndex + 1}:${columnIndex + 1} has an unsupported value`,
      );
    });
  });
};

const trackingParameter = (key: string) =>
  /^(utm_.+|gclid|dclid|fbclid|msclkid|mc_cid|mc_eid|_hsenc|_hsmi)$/i.test(key);

export const comparisonEndpointKey = (rawValue: string) => {
  const parsed = new URL(rawValue.trim());
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new TypeError("Seed Site Record requires an absolute HTTP(S) URL");
  }

  const hostname = parsed.hostname
    .toLowerCase()
    .replace(/\.$/, "")
    .replace(/^www\./, "");
  const isDefaultPort =
    (parsed.protocol === "http:" && parsed.port === "80") ||
    (parsed.protocol === "https:" && parsed.port === "443");
  const port = isDefaultPort ? "" : parsed.port;
  let pathname = parsed.pathname.replace(/\/{2,}/g, "/");
  if (pathname !== "/") {
    pathname = pathname.replace(/\/+$/, "");
  }
  pathname ||= "/";

  const retainedParameters = sorted(
    [...parsed.searchParams.entries()].filter(
      ([key]) => !trackingParameter(key),
    ),
    ([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue),
  );
  const query = new URLSearchParams(retainedParameters).toString();

  return `${hostname}${port === "" ? "" : `:${port}`}${pathname}${
    query === "" ? "" : `?${query}`
  }`;
};

const readRequiredText = (
  value: Date | boolean | number | string | null | undefined,
  column: string,
  sourceRowNumber: number,
) => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(
      `Seed workbook ${column} must be text at row ${sourceRowNumber}`,
    );
  }
  return value;
};

const readRequiredInteger = (
  value: Date | boolean | number | string | null | undefined,
  column: string,
  sourceRowNumber: number,
) => {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new TypeError(
      `Seed workbook ${column} must be an integer at row ${sourceRowNumber}`,
    );
  }
  return value;
};

export const buildSeedWorkbookInput = ({
  fileName,
  fileSha256,
  rows,
}: {
  fileName: string;
  fileSha256: string;
  rows: unknown;
}): SeedWorkbookInput => {
  const decodedRows = decodeRows(rows);
  const headers = decodedRows[3]?.map((value) =>
    typeof value === "string" ? value : "",
  );
  if (
    headers === undefined ||
    JSON.stringify(headers) !== JSON.stringify(seedHeaders)
  ) {
    throw new TypeError(
      "Seed workbook Sites header does not match the contract",
    );
  }

  const dataRows = decodedRows.slice(4);
  if (dataRows.length !== SEED_SOURCE_RECORD_COUNT) {
    throw new TypeError(
      `Seed workbook must contain ${SEED_SOURCE_RECORD_COUNT} source records`,
    );
  }

  const sourceRecords = dataRows.map((row, index) => {
    const sourceRowNumber = index + 5;
    if (row.length !== SEED_SOURCE_COLUMN_COUNT) {
      throw new TypeError(
        `Seed workbook row ${sourceRowNumber} must contain ${SEED_SOURCE_COLUMN_COUNT} cells`,
      );
    }
    const rawValues = row.map(cellValueForJson);
    const sourceRecordId = readRequiredInteger(row[0], "ID", sourceRowNumber);
    return {
      baseUrl: readRequiredText(row[2], "Base URL", sourceRowNumber),
      identity: identity(
        "ssr",
        `${fileSha256}:${SEED_WORKSHEET_NAME}:${sourceRowNumber}`,
      ),
      legacyConnectorLabel: readRequiredText(
        row[3],
        "Connector Type",
        sourceRowNumber,
      ),
      name: readRequiredText(row[1], "Name", sourceRowNumber),
      rawRecordHash: sha256(JSON.stringify(rawValues)),
      rawValues,
      sourceRecordId,
      sourceRowNumber,
    };
  });

  const candidateGroups = new Map<string, SeedSiteRecordInput[]>();
  for (const record of sourceRecords) {
    const key = comparisonEndpointKey(record.baseUrl);
    const group = candidateGroups.get(key) ?? [];
    group.push(record);
    candidateGroups.set(key, group);
  }

  const candidates = sorted([...candidateGroups.entries()], ([left], [right]) =>
    left.localeCompare(right),
  ).map(([key, records]) => {
    const representative = records[0];
    if (representative === undefined) {
      throw new TypeError("Candidate Site requires source provenance");
    }
    return {
      comparisonEndpointKey: key,
      identity: identity("cnd", `${SEED_NORMALIZATION_RULE_VERSION}:${key}`),
      name: representative.name,
      sourceRecordIdentities: records.map((record) => record.identity),
      url: representative.baseUrl,
    };
  });

  return {
    candidates,
    columnCount: SEED_SOURCE_COLUMN_COUNT,
    fileName,
    fileSha256,
    headers,
    importIdentity: identity("sim", `${fileSha256}:${SEED_WORKSHEET_NAME}`),
    sourceRecords,
    worksheetName: SEED_WORKSHEET_NAME,
  };
};

export const readSeedWorkbook = async (
  path: string,
  expectedSha256 = SEED_WORKBOOK_SHA256,
) => {
  const bytes = await readFile(path);
  const fileSha256 = sha256(bytes);
  if (fileSha256 !== expectedSha256) {
    throw new TypeError(
      `Seed workbook SHA-256 mismatch: expected ${expectedSha256}, received ${fileSha256}`,
    );
  }
  const rows = await readSheet(path, SEED_WORKSHEET_NAME);
  const fileName = path.split(/[\\/]/).at(-1);
  if (fileName === undefined || fileName === "") {
    throw new TypeError("Seed workbook path requires a file name");
  }
  return buildSeedWorkbookInput({ fileName, fileSha256, rows });
};
