import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const sourcePath = "/Users/justinsingh/Desktop/stockhawk-sites-2026-07-18.xlsx";
const input = await FileBlob.load(sourcePath);
const workbook = await SpreadsheetFile.importXlsx(input);

const overview = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 12000,
  tableMaxRows: 8,
  tableMaxCols: 12,
  tableMaxCellChars: 120,
});

console.log(overview.ndjson);

const sheet = workbook.worksheets.getItem("Sites");
const values = sheet.getRange("A4:W2716").values;
const [headers, ...rows] = values;
const index = Object.fromEntries(headers.map((header, column) => [header, column]));

const countBy = (column) => {
  const counts = new Map();
  for (const row of rows) {
    const value = String(row[index[column]] ?? "(blank)");
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1]));
};

const normalizeHost = (rawUrl) => {
  try {
    return new URL(String(rawUrl)).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
};

const hosts = rows.map((row) => normalizeHost(row[index["Base URL"]])).filter(Boolean);
const hostCounts = new Map();
for (const host of hosts) hostCounts.set(host, (hostCounts.get(host) ?? 0) + 1);
const duplicateHosts = [...hostCounts.entries()]
  .filter(([, count]) => count > 1)
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

console.log(JSON.stringify({
  headers,
  dataRows: rows.length,
  distinctHosts: hostCounts.size,
  duplicateHostCount: duplicateHosts.length,
  duplicateRowsBeyondFirst: rows.length - hostCounts.size,
  topDuplicateHosts: duplicateHosts.slice(0, 20),
  connectorTypes: countBy("Connector Type"),
  catalogClassifications: countBy("Catalog Classification"),
  catalogCoverageScopes: countBy("Catalog Coverage Scope"),
  catalogCertificationStates: countBy("Catalog Certification State"),
  active: countBy("Active"),
  suspended: countBy("Suspended"),
}, null, 2));

const representativeHosts = new Set(["101westvine.store", "nordstrom.com", "bloomingdales.com"]);
const representativeColumns = [
  "ID",
  "Name",
  "Base URL",
  "Connector Type",
  "Catalog Classification",
  "Catalog Coverage Scope",
  "Catalog Certification State",
  "Active",
];
const representativeRows = rows
  .filter((row) => representativeHosts.has(normalizeHost(row[index["Base URL"]])))
  .map((row) => Object.fromEntries(representativeColumns.map((column) => [column, row[index[column]]])));

console.log(JSON.stringify({ representativeRows }, null, 2));
