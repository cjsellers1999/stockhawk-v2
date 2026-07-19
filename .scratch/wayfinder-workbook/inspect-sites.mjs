import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";
import { createHash } from "node:crypto";

const sourcePath = "/Users/justinsingh/Desktop/stockhawk-sites-2026-07-18.xlsx";
const input = await FileBlob.load(sourcePath);
const workbook = await SpreadsheetFile.importXlsx(input);

const overview = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 6000,
  tableMaxRows: 6,
  tableMaxCols: 12,
  tableMaxCellChars: 100,
});

const sheet = workbook.worksheets.getItem("Sites");
const values = sheet.getRange("A4:W2716").values;
const [headers, ...sourceRows] = values;
const column = Object.fromEntries(headers.map((header, index) => [header, index]));

const text = (value) => String(value ?? "").trim();
const unique = (valuesToDeduplicate) => [...new Set(valuesToDeduplicate)];
const normalizeName = (value) =>
  text(value)
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/&/g, " and ")
    .replace(/[’'`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");

const groupBy = (items, keyFor) => {
  const groups = new Map();
  for (const item of items) {
    const key = keyFor(item);
    if (key === null || key === undefined || key === "") continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
};

const countBy = (items, valueFor) => {
  const counts = new Map();
  for (const item of items) {
    const value = text(valueFor(item)) || "(blank)";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Object.fromEntries(
    [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])),
  );
};

const summarizeGroups = (groups) => {
  const duplicateGroups = [...groups.values()].filter((group) => group.length > 1);
  return {
    groups: duplicateGroups.length,
    rows: duplicateGroups.reduce((sum, group) => sum + group.length, 0),
    rowsBeyondFirst: duplicateGroups.reduce((sum, group) => sum + group.length - 1, 0),
  };
};

const trackingParameter = (key) =>
  /^(utm_.+|gclid|dclid|fbclid|msclkid|mc_cid|mc_eid|_hsenc|_hsmi)$/i.test(key);

const parseUrl = (rawValue) => {
  const raw = text(rawValue);
  if (!raw) return { valid: false, raw, reason: "blank" };

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return { valid: false, raw, reason: "invalid_absolute_url" };
  }

  if (!/^https?:$/.test(parsed.protocol)) {
    return { valid: false, raw, reason: `unsupported_scheme:${parsed.protocol}` };
  }

  const scheme = parsed.protocol.toLowerCase();
  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  const comparisonHost = hostname.replace(/^www\./, "");
  const defaultPort = (scheme === "https:" && parsed.port === "443") || (scheme === "http:" && parsed.port === "80");
  const port = defaultPort ? "" : parsed.port;
  let pathname = parsed.pathname.replace(/\/{2,}/g, "/");
  if (pathname !== "/") pathname = pathname.replace(/\/+$/, "");
  pathname ||= "/";

  const retainedParams = [...parsed.searchParams.entries()]
    .filter(([key]) => !trackingParameter(key))
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue),
    );
  const query = new URLSearchParams(retainedParams).toString();
  const hostAndPort = `${comparisonHost}${port ? `:${port}` : ""}`;
  const endpointKey = `${hostAndPort}${pathname}${query ? `?${query}` : ""}`;
  const schemeEndpointKey = `${scheme}//${endpointKey}`;
  const lowerPath = pathname.toLowerCase();
  const locationDetail = [
    /\/(?:store-details?|stores?|locations?)\/.+/,
    /\/location\/.+/,
    /\/our-stores?\/.+/,
  ].some((pattern) => pattern.test(lowerPath));
  const locationLanding = [
    /^\/stores?\/?$/,
    /^\/locations?\/?$/,
    /^\/store-locator(?:\/|$)/,
    /^\/find-(?:a-)?store(?:\/|$)/,
    /^\/pages\/(?:store-locator|locations?)(?:\/|$)/,
    /\/(?:store|retail)-locations?(?:-|\/|$)/,
    /\/locations?-and-hours(?:\/|$)/,
  ].some((pattern) => pattern.test(lowerPath));

  return {
    valid: true,
    raw,
    scheme,
    hostname,
    comparisonHost,
    port,
    pathname,
    query,
    endpointKey,
    schemeEndpointKey,
    isRoot: pathname === "/" && !query,
    hasQuery: Boolean(query),
    locationDetail,
    locationLanding,
    locationRelated: locationDetail || locationLanding,
  };
};

const socialOrDirectoryHost = (host) =>
  [
    "facebook.com",
    "instagram.com",
    "linkedin.com",
    "pinterest.com",
    "tiktok.com",
    "twitter.com",
    "x.com",
    "youtube.com",
    "google.com",
    "maps.google.com",
  ].some((candidate) => host === candidate || host.endsWith(`.${candidate}`));

const importedSignalCategory = (record) => {
  const message = `${record.lastError} ${record.freezeReason}`.toLowerCase();
  if (!message.trim()) return "none";
  if (/browser[- ]blocked|blocked in browser audit/.test(message)) return "browser_blocked";
  if (/not an authoritative commerce surface/.test(message)) return "no_authoritative_commerce_surface";
  if (/no supported connector/.test(message)) return "legacy_connector_unresolved";
  if (/name_not_resolved|enotfound|dns/.test(message)) return "dns_failure";
  if (/ssl|tls|certificate/.test(message)) return "tls_failure";
  if (/password-protected|http 401/.test(message)) return "private_or_unauthorized";
  if (/http 403|forbidden/.test(message)) return "access_denied";
  if (/returned 0 products|zero products/.test(message)) return "zero_products";
  if (/catalog count dropped/.test(message)) return "suspicious_catalog_drop";
  if (/not yet proven stable|not enumerable|token not found|platform_drift/.test(message)) {
    return "platform_capability_or_drift";
  }
  if (/http 404|not found/.test(message)) return "endpoint_not_found";
  if (/timeout|aborted/.test(message)) return "timeout_or_abort";
  return "other_failure";
};

const collectConfigFacts = (rawConfig, baseHost) => {
  const raw = text(rawConfig);
  if (!raw) return { state: "blank", keys: [], urls: [], alternateHosts: [] };

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { state: "invalid_json", keys: [], urls: [], alternateHosts: [] };
  }

  const keys = new Set();
  const urls = new Set();
  const walk = (value, depth = 0) => {
    if (depth > 8 || value === null || value === undefined) return;
    if (typeof value === "string") {
      if (/^https?:\/\//i.test(value)) urls.add(value);
      return;
    }
    if (Array.isArray(value)) {
      for (const entry of value) walk(entry, depth + 1);
      return;
    }
    if (typeof value === "object") {
      for (const [key, entry] of Object.entries(value)) {
        keys.add(key);
        walk(entry, depth + 1);
      }
    }
  };
  walk(parsed);

  const alternateHosts = unique(
    [...urls]
      .map((value) => parseUrl(value))
      .filter((parsedUrl) => parsedUrl.valid && parsedUrl.comparisonHost !== baseHost)
      .map((parsedUrl) => parsedUrl.comparisonHost),
  ).sort();

  return { state: "valid_json", keys: [...keys].sort(), urls: [...urls].sort(), alternateHosts };
};

const records = sourceRows.map((row, sourceIndex) => {
  const url = parseUrl(row[column["Base URL"]]);
  const record = {
    sourceRow: sourceIndex + 5,
    id: row[column.ID],
    name: text(row[column.Name]),
    normalizedName: normalizeName(row[column.Name]),
    baseUrl: text(row[column["Base URL"]]),
    connector: text(row[column["Connector Type"]]) || "(blank)",
    classification: text(row[column["Catalog Classification"]]) || "(blank)",
    coverage: text(row[column["Catalog Coverage Scope"]]) || "(blank)",
    certification: text(row[column["Catalog Certification State"]]) || "(blank)",
    active: row[column.Active] === true,
    suspended: row[column.Suspended] === true,
    consecutiveFailures: Number(row[column["Consecutive Failures"]] ?? 0),
    lastSuccess: row[column["Last Success (UTC)"]],
    lastErrorAt: row[column["Last Error At (UTC)"]],
    lastError: text(row[column["Last Error"]]),
    freezeReason: text(row[column["Catalog Freeze Reason"]]),
    url,
  };
  record.config = collectConfigFacts(row[column["Connector Config"]], url.valid ? url.comparisonHost : null);
  return record;
});

const validRecords = records.filter((record) => record.url.valid);
const invalidRecords = records.filter((record) => !record.url.valid);
const endpointGroups = groupBy(validRecords, (record) => record.url.endpointKey);
const hostGroups = groupBy(validRecords, (record) => record.url.comparisonHost);
const rawUrlGroups = groupBy(records, (record) => record.baseUrl);
const schemeEndpointGroups = groupBy(validRecords, (record) => record.url.schemeEndpointKey);

const endpointRepresentatives = [...endpointGroups.values()].map((group) =>
  [...group].sort((left, right) => Number(left.id) - Number(right.id))[0],
);
const locationEndpoints = endpointRepresentatives.filter((record) => record.url.locationRelated);
const nonLocationEndpoints = endpointRepresentatives.filter((record) => !record.url.locationRelated);
const locationHostGroups = groupBy(locationEndpoints, (record) => record.url.comparisonHost);
const nonLocationHostSet = new Set(nonLocationEndpoints.map((record) => record.url.comparisonHost));
const locationOnlyHosts = [...locationHostGroups.keys()].filter((host) => !nonLocationHostSet.has(host));
const locationOnlyRepresentatives = locationOnlyHosts.map((host) => locationHostGroups.get(host)[0]);
const expectedCandidatesAfterLocationReview = [...nonLocationEndpoints, ...locationOnlyRepresentatives, ...invalidRecords];
const candidateHostGroups = groupBy(
  expectedCandidatesAfterLocationReview.filter((record) => record.url.valid),
  (record) => record.url.comparisonHost,
);
const ambiguousSameHostGroups = [...candidateHostGroups.entries()].filter(([, group]) => group.length > 1);

const endpointDuplicateGroups = [...endpointGroups.entries()].filter(([, group]) => group.length > 1);
const conflictingEndpointGroups = endpointDuplicateGroups.filter(([, group]) =>
  unique(group.map((record) => record.normalizedName)).length > 1 ||
  unique(group.map((record) => record.connector)).length > 1 ||
  unique(group.map((record) => record.classification)).length > 1 ||
  unique(group.map((record) => record.coverage)).length > 1 ||
  unique(group.map((record) => record.certification)).length > 1,
);

const candidateNameGroups = groupBy(expectedCandidatesAfterLocationReview, (record) => record.normalizedName);
const crossHostNameGroups = [...candidateNameGroups.entries()].filter(([, group]) => {
  const hosts = unique(group.filter((record) => record.url.valid).map((record) => record.url.comparisonHost));
  return hosts.length > 1;
});

const socialCandidates = expectedCandidatesAfterLocationReview.filter(
  (record) => record.url.valid && socialOrDirectoryHost(record.url.comparisonHost),
);
const alternateConfigHostRecords = records.filter((record) => record.config.alternateHosts.length > 0);
const frozenRecords = records.filter((record) => record.certification === "frozen");
const errorRecords = records.filter(
  (record) => record.consecutiveFailures > 0 || Boolean(record.lastError) || Boolean(record.lastErrorAt),
);
const noRecordedSuccess = records.filter((record) => !record.lastSuccess);

const stableHash = (namespace, value) =>
  createHash("sha256").update(`stockhawk-v1-seed-audit-v1|${namespace}|${value}`).digest("hex");
const stablePick = (items, count, namespace, keyFor) =>
  [...items]
    .sort((left, right) =>
      stableHash(namespace, keyFor(left)).localeCompare(stableHash(namespace, keyFor(right))),
    )
    .slice(0, Math.min(count, items.length));

const locationHostSummary = [...locationHostGroups.entries()]
  .map(([host, group]) => ({
    host,
    locationEndpoints: group.length,
    nonLocationEndpoints: nonLocationEndpoints.filter((record) => record.url.comparisonHost === host).length,
    locationOnly: !nonLocationHostSet.has(host),
    connectorHints: unique(group.map((record) => record.connector)).sort(),
    representativeIds: group.slice(0, 3).map((record) => record.id),
  }))
  .sort((left, right) => right.locationEndpoints - left.locationEndpoints || left.host.localeCompare(right.host));

const unresolvedSameHostSummary = ambiguousSameHostGroups
  .map(([host, group]) => ({
    host,
    candidateEndpoints: group.length,
    rootEndpoints: group.filter((record) => record.url.isRoot).length,
    connectorHints: unique(group.map((record) => record.connector)).sort(),
    ids: group.map((record) => record.id),
    paths: group.map((record) => record.url.pathname),
  }))
  .sort((left, right) => right.candidateEndpoints - left.candidateEndpoints || left.host.localeCompare(right.host));

const selectedAuditEndpoints = new Map();
const selectionSteps = [];
const addAuditRecords = (recordsToAdd, reason, step) => {
  const before = selectedAuditEndpoints.size;
  for (const record of recordsToAdd) {
    const key = record.url.valid ? record.url.endpointKey : `invalid:${record.id}`;
    if (!selectedAuditEndpoints.has(key)) {
      selectedAuditEndpoints.set(key, { key, records: new Map(), reasons: new Set() });
    }
    const entry = selectedAuditEndpoints.get(key);
    entry.records.set(record.id, record);
    entry.reasons.add(reason);
  }
  selectionSteps.push({ step, requestedRecords: recordsToAdd.length, newlySelectedEndpoints: selectedAuditEndpoints.size - before });
};

const connectorHostGroups = groupBy(
  validRecords,
  (record) => `${record.connector}\u0000${record.url.comparisonHost}`,
);
const connectorHostRepresentatives = [...connectorHostGroups.values()].map((group) =>
  stablePick(group, 1, "connector-host-representative", (record) => `${record.url.endpointKey}|${record.id}`)[0],
);
const connectorPools = groupBy(connectorHostRepresentatives, (record) => record.connector);
for (const [connector, pool] of [...connectorPools.entries()].sort(([left], [right]) => left.localeCompare(right))) {
  const quota = connector === "unsupported" ? 20 : pool.length >= 100 ? 6 : pool.length >= 25 ? 4 : pool.length >= 6 ? 2 : 1;
  addAuditRecords(
    stablePick(pool, quota, `connector:${connector}`, (record) => `${record.url.comparisonHost}|${record.id}`),
    `connector:${connector}`,
    `connector hint ${connector}`,
  );
}

for (const [host, group] of [...locationHostGroups.entries()].sort(([left], [right]) => left.localeCompare(right))) {
  addAuditRecords(
    stablePick(group, 1, `location-host:${host}`, (record) => `${record.url.endpointKey}|${record.id}`),
    "physical_location_host",
    `physical-location host ${host}`,
  );
}

for (const [, group] of stablePick(
  endpointDuplicateGroups,
  8,
  "safe-duplicate-groups",
  ([key]) => key,
)) {
  addAuditRecords(
    stablePick(group, 1, "safe-duplicate-representative", (record) => `${record.url.endpointKey}|${record.id}`),
    "safe_url_duplicate_validation",
    "safe URL duplicate validation",
  );
}

for (const [host, group] of stablePick(
  ambiguousSameHostGroups,
  12,
  "same-host-ambiguity-groups",
  ([key]) => key,
)) {
  addAuditRecords(
    stablePick(group, 2, `same-host:${host}`, (record) => `${record.url.endpointKey}|${record.id}`),
    "same_host_ambiguity",
    `same-host ambiguity ${host}`,
  );
}

for (const [normalizedName, group] of stablePick(
  crossHostNameGroups,
  6,
  "cross-host-name-groups",
  ([key]) => key,
)) {
  addAuditRecords(group, "cross_host_name_collision", `cross-host normalized name ${normalizedName}`);
}

addAuditRecords(socialCandidates, "social_or_directory_entry", "social or directory candidates");
addAuditRecords(invalidRecords, "invalid_url", "invalid URLs");
addAuditRecords(
  stablePick(
    expectedCandidatesAfterLocationReview.filter((record) => record.url.valid && record.url.scheme === "http:"),
    6,
    "http-scheme",
    (record) => `${record.url.endpointKey}|${record.id}`,
  ),
  "http_only_entry",
  "HTTP entries",
);
addAuditRecords(
  expectedCandidatesAfterLocationReview.filter((record) => record.url.valid && record.url.hasQuery),
  "retained_query_entry",
  "meaningful query entries",
);

const signalGroups = groupBy(records, importedSignalCategory);
for (const [signal, group] of [...signalGroups.entries()].filter(([signal]) => signal !== "none").sort(([left], [right]) => left.localeCompare(right))) {
  addAuditRecords(
    stablePick(group, 2, `imported-signal:${signal}`, (record) => `${record.url.endpointKey}|${record.id}`),
    `imported_signal:${signal}`,
    `imported signal ${signal}`,
  );
}

addAuditRecords(
  stablePick(
    expectedCandidatesAfterLocationReview.filter(
      (record) =>
        record.url.valid &&
        record.url.isRoot &&
        !record.url.locationRelated &&
        !socialOrDirectoryHost(record.url.comparisonHost) &&
        importedSignalCategory(record) === "none",
    ),
    10,
    "clean-root-baseline",
    (record) => `${record.url.endpointKey}|${record.id}`,
  ),
  "clean_root_baseline",
  "clean root baseline",
);

const auditManifest = [...selectedAuditEndpoints.values()]
  .map((entry) => {
    const selectedRecords = [...entry.records.values()];
    const representative = selectedRecords[0];
    return {
      endpointKey: entry.key,
      representativeId: representative.id,
      sourceIds: selectedRecords.map((record) => record.id).sort((left, right) => Number(left) - Number(right)),
      name: representative.name,
      baseUrl: representative.baseUrl,
      connectorHints: unique(selectedRecords.map((record) => record.connector)).sort(),
      reasons: [...entry.reasons].sort(),
    };
  })
  .sort((left, right) => left.endpointKey.localeCompare(right.endpointKey));

const sampleReasonCoverage = {};
const sampledConnectorHints = new Set();
for (const item of auditManifest) {
  for (const reason of item.reasons) sampleReasonCoverage[reason] = (sampleReasonCoverage[reason] ?? 0) + 1;
  for (const connector of item.connectorHints) sampledConnectorHints.add(connector);
}

const describeRecord = (record) => ({
  id: record.id,
  name: record.name,
  baseUrl: record.baseUrl,
  connector: record.connector,
  classification: record.classification,
  coverage: record.coverage,
  certification: record.certification,
});

const describeGroup = ([key, group]) => ({
  key,
  rows: group.length,
  ids: group.map((record) => record.id),
  names: unique(group.map((record) => record.name)),
  urls: unique(group.map((record) => record.baseUrl)),
  connectors: unique(group.map((record) => record.connector)),
});

const connectorSummary = Object.entries(countBy(records, (record) => record.connector)).map(([connector, rows]) => {
  const connectorRecords = records.filter((record) => record.connector === connector);
  return {
    connector,
    rows,
    distinctHosts: unique(
      connectorRecords.filter((record) => record.url.valid).map((record) => record.url.comparisonHost),
    ).length,
    inactive: connectorRecords.filter((record) => !record.active).length,
    frozen: connectorRecords.filter((record) => record.certification === "frozen").length,
    withErrors: connectorRecords.filter(
      (record) => record.consecutiveFailures > 0 || Boolean(record.lastError) || Boolean(record.lastErrorAt),
    ).length,
  };
});

const topHosts = [...hostGroups.entries()]
  .sort((left, right) => right[1].length - left[1].length || left[0].localeCompare(right[0]))
  .slice(0, 25)
  .map(([host, group]) => ({
    host,
    rows: group.length,
    endpointKeys: unique(group.map((record) => record.url.endpointKey)).length,
    locationRows: group.filter((record) => record.url.locationRelated).length,
    rootRows: group.filter((record) => record.url.isRoot).length,
    names: unique(group.map((record) => record.name)),
    connectors: unique(group.map((record) => record.connector)),
  }));

const configKeyCounts = new Map();
for (const record of records) {
  for (const key of record.config.keys) configKeyCounts.set(key, (configKeyCounts.get(key) ?? 0) + 1);
}

const analysis = {
  source: {
    path: sourcePath,
    sheet: "Sites",
    range: "A4:W2716",
    records: records.length,
    columns: headers.length,
  },
  reconciliation: {
    sourceRecords: records.length,
    validAbsoluteHttpUrls: validRecords.length,
    invalidOrUnsupportedUrls: invalidRecords.length,
    distinctRawUrls: rawUrlGroups.size,
    distinctSchemeSensitiveNormalizedUrls: schemeEndpointGroups.size,
    distinctSafeEndpointKeys: endpointGroups.size,
    safeDuplicateRowsRemoved: validRecords.length - endpointGroups.size,
    automaticSafePreAuditCandidateSites: endpointGroups.size + invalidRecords.length,
    uniqueLocationEndpoints: locationEndpoints.length,
    locationHosts: locationHostGroups.size,
    locationOnlyHostsRetainedForAudit: locationOnlyHosts.length,
    locationEndpointsRemovedAfterSafeDedup: locationEndpoints.length - locationOnlyHosts.length,
    expectedCandidateSitesAfterLocationReview: expectedCandidatesAfterLocationReview.length,
    unresolvedSameHostGroups: ambiguousSameHostGroups.length,
    unresolvedSameHostExtraCandidates: ambiguousSameHostGroups.reduce((sum, [, group]) => sum + group.length - 1, 0),
  },
  urlShape: {
    schemes: countBy(validRecords, (record) => record.url.scheme),
    rootRows: validRecords.filter((record) => record.url.isRoot).length,
    nonRootRows: validRecords.filter((record) => !record.url.isRoot).length,
    rowsWithRetainedQuery: validRecords.filter((record) => record.url.hasQuery).length,
    socialOrDirectoryCandidateRows: socialCandidates.length,
    socialOrDirectoryHosts: countBy(socialCandidates, (record) => record.url.comparisonHost),
  },
  duplicateAndAmbiguity: {
    duplicateRawUrls: summarizeGroups(rawUrlGroups),
    duplicateSafeEndpoints: summarizeGroups(endpointGroups),
    endpointGroupsWithImportedMetadataConflicts: conflictingEndpointGroups.length,
    duplicateHosts: summarizeGroups(hostGroups),
    unresolvedSameHostGroups: ambiguousSameHostGroups.length,
    unresolvedSameHostCandidateRows: ambiguousSameHostGroups.reduce((sum, [, group]) => sum + group.length, 0),
    crossHostNormalizedNameGroups: crossHostNameGroups.length,
    crossHostNormalizedNameCandidateRows: crossHostNameGroups.reduce((sum, [, group]) => sum + group.length, 0),
  },
  importedSignals: {
    connectors: connectorSummary,
    classification: countBy(records, (record) => record.classification),
    coverage: countBy(records, (record) => record.coverage),
    certification: countBy(records, (record) => record.certification),
    active: countBy(records, (record) => record.active),
    inactiveByConnector: countBy(records.filter((record) => !record.active), (record) => record.connector),
    frozenRows: frozenRecords.length,
    freezeReasons: countBy(frozenRecords, (record) => record.freezeReason),
    rowsWithFailureOrErrorSignal: errorRecords.length,
    rowsWithoutRecordedSuccess: noRecordedSuccess.length,
    auditSignalCategories: countBy(records, importedSignalCategory),
  },
  connectorConfig: {
    states: countBy(records, (record) => record.config.state),
    topKeys: Object.fromEntries(
      [...configKeyCounts.entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 30),
    ),
    recordsWithAlternateAbsoluteHost: alternateConfigHostRecords.length,
  },
  strata: {
    locationHosts: locationHostSummary,
    unresolvedSameHostGroups: unresolvedSameHostSummary,
    expectedCandidatesByConnectorHint: countBy(expectedCandidatesAfterLocationReview, (record) => record.connector),
  },
  samplePlan: {
    seed: "stockhawk-v1-seed-audit-v1",
    uniqueEndpoints: auditManifest.length,
    connectorHintTypesInWorkbook: connectorPools.size,
    connectorHintTypesCovered: sampledConnectorHints.size,
    reasonCoverage: Object.fromEntries(Object.entries(sampleReasonCoverage).sort(([left], [right]) => left.localeCompare(right))),
    selectionSteps,
    manifest: auditManifest,
  },
  topHosts,
  examples: {
    invalidUrls: invalidRecords.slice(0, 20).map(describeRecord),
    safeEndpointDuplicates: endpointDuplicateGroups.slice(0, 15).map(describeGroup),
    conflictingEndpointDuplicates: conflictingEndpointGroups.slice(0, 15).map(describeGroup),
    locationHosts: [...locationHostGroups.entries()]
      .sort((left, right) => right[1].length - left[1].length || left[0].localeCompare(right[0]))
      .slice(0, 20)
      .map(describeGroup),
    unresolvedSameHost: ambiguousSameHostGroups.slice(0, 20).map(describeGroup),
    crossHostNames: crossHostNameGroups.slice(0, 20).map(describeGroup),
    alternateConfigHosts: alternateConfigHostRecords.slice(0, 20).map((record) => ({
      ...describeRecord(record),
      alternateHosts: record.config.alternateHosts,
      configKeys: record.config.keys,
    })),
    socialOrDirectory: socialCandidates.slice(0, 20).map(describeRecord),
    highFailureRows: [...errorRecords]
      .sort((left, right) => right.consecutiveFailures - left.consecutiveFailures || Number(left.id) - Number(right.id))
      .slice(0, 20)
      .map((record) => ({
        ...describeRecord(record),
        consecutiveFailures: record.consecutiveFailures,
        lastError: record.lastError,
      })),
  },
};

const requestedSections = process.argv.slice(2);
if (requestedSections.length > 0) {
  const selected = {};
  for (const path of requestedSections) {
    selected[path] = path.split(".").reduce((value, part) => value?.[part], analysis);
  }
  console.log(JSON.stringify(selected, null, 2));
} else {
  console.log(overview.ndjson);
  console.log(JSON.stringify({
    source: analysis.source,
    reconciliation: analysis.reconciliation,
    urlShape: analysis.urlShape,
    duplicateAndAmbiguity: analysis.duplicateAndAmbiguity,
    connectorConfig: analysis.connectorConfig,
  }, null, 2));
}
