import { describe, expect, it } from "vitest";

import {
  commitConnectorBatchCommandSchema,
  connectorAdapterManifestSchema,
  connectorCheckpointSchema,
  connectorObservationBatchSchema,
  storefrontIntegrationSchema,
} from "./connector.js";

const integration = {
  adapter: {
    configurationVersion: 1,
    id: "fixture-http",
    version: "1.0.0",
  },
  adapterOptions: { catalogPath: "/catalog" },
  approvedOrigins: ["https://fixture.store"],
  browserAccessGrant: null,
  canonicalOrigin: "https://fixture.store",
  catalogRoots: ["https://fixture.store/catalog"],
  certificationRecipe: {
    method: "cursor",
    requiredEvidence: ["route", "cursor_closure", "variant_closure"],
    schemaVersion: 1,
  },
  expectedSurfaceFingerprint: "fixture-catalog-v1",
  identity: "int_fixture_store_v1",
  initialPacing: {
    maximumConcurrentRequests: 1,
    minimumIntervalMilliseconds: 100,
  },
  locale: "en-US",
  region: "US",
  schemaVersion: 1,
  storefrontIdentity: "stf_fixture_store",
} as const;

const batch = {
  checkpoint: {
    schemaVersion: 1,
    value: { nextCursor: "page-2" },
  },
  evidence: [
    {
      content: '{"products":[]}',
      contentHash:
        "86d8b086af0fc30d06856e218fcfdb6b803f91b45f50b1b753d8deac627fc054",
      identity: "evd_fixture_page_1",
      mediaType: "application/json",
      observedAt: "2026-07-24T17:00:00.000Z",
      sourceUrl: "https://fixture.store/catalog",
    },
  ],
  identity: "batch_fixture_page_1",
  observations: [
    {
      accessMethod: "http",
      evidenceIdentity: "evd_fixture_page_1",
      imageUrl: "https://fixture.store/images/dragon.jpg",
      observedAt: "2026-07-24T17:00:00.000Z",
      parentSourceIdentity: {
        namespace: "fixture-product",
        ruleVersion: 1,
        value: "sky-dragon",
      },
      purchaseUrl: "https://fixture.store/products/sky-dragon-medium",
      rawAvailability: { available: true },
      rawFacts: { vendor: "Jellycat" },
      rawTitle: "Sky Dragon — Medium",
      stockStatus: "in_stock",
      variantSourceIdentity: {
        namespace: "fixture-variant",
        ruleVersion: 1,
        value: "sky-dragon-medium",
      },
    },
  ],
  runIdentity: "run_fixture_discovery",
  schemaVersion: 1,
  sequence: 0,
} as const;

describe("Connector contracts", () => {
  it("accepts declarative versioned Integration data", () => {
    expect(storefrontIntegrationSchema.parse(integration)).toEqual(integration);
  });

  it.each([
    "https://fixture.store:443",
    "https://fixture.store:",
    "https://fixture-user:fixture-password@fixture.store",
    "https://FIXTURE.store",
    "https://münich.example",
    "http://0177.0.0.1",
  ])("rejects noncanonical origin %s", (canonicalOrigin) => {
    expect(() =>
      storefrontIntegrationSchema.parse({
        ...integration,
        approvedOrigins: [canonicalOrigin],
        canonicalOrigin,
      }),
    ).toThrow(/canonical HTTP origin/i);
  });

  it("requires a versioned Adapter manifest with explicit change impact", () => {
    expect(
      connectorAdapterManifestSchema.parse({
        changeImpact: {
          catalogCoverage: true,
          certificationRecipe: true,
          sourceIdentity: true,
          sourceInterpretation: true,
        },
        configurationSchemaVersion: 1,
        id: "fixture-http",
        kind: "platform",
        resumeMode: "checkpoint",
        schemaVersion: 1,
        version: "1.0.0",
      }),
    ).toEqual(expect.objectContaining({ id: "fixture-http" }));
  });

  it("rejects executable or unknown Integration configuration", () => {
    expect(() =>
      storefrontIntegrationSchema.parse({
        ...integration,
        requestHook: "fetch-secret-catalog",
      }),
    ).toThrow(/unrecognized/i);
    expect(() =>
      storefrontIntegrationSchema.parse({
        ...integration,
        adapterOptions: () => ({ catalogPath: "/catalog" }),
      }),
    ).toThrow(/expected|invalid/i);
    expect(() =>
      storefrontIntegrationSchema.parse({
        ...integration,
        adapterOptions: { token: "must-live-outside-declarative-config" },
      }),
    ).toThrow(/secrets/i);
    for (const adapterOptions of [
      { api_key: "must-live-outside-declarative-config" },
      { nested: { access_token: "must-live-outside-declarative-config" } },
      { "client-secret": "must-live-outside-declarative-config" },
      { clientSecret: "must-live-outside-declarative-config" },
      { apiToken: "must-live-outside-declarative-config" },
      { oauthToken: "must-live-outside-declarative-config" },
      { privateKey: "must-live-outside-declarative-config" },
      { sessionToken: "must-live-outside-declarative-config" },
      { session_cookie: "must-live-outside-declarative-config" },
      { "x-api-key": "must-live-outside-declarative-config" },
    ]) {
      expect(() =>
        storefrontIntegrationSchema.parse({
          ...integration,
          adapterOptions,
        }),
      ).toThrow(/secrets/i);
    }
  });

  it("bounds common Connector output and rejects additive output fields", () => {
    expect(connectorObservationBatchSchema.parse(batch)).toEqual(batch);
    expect(() =>
      connectorObservationBatchSchema.parse({
        ...batch,
        observations: Array.from({ length: 101 }, () => batch.observations[0]),
      }),
    ).toThrow(/too_big|too big/i);
    expect(() =>
      connectorObservationBatchSchema.parse({
        ...batch,
        adapterClassification: "confirmed",
      }),
    ).toThrow(/unrecognized/i);
  });

  it("treats colon-bearing source identity tuples as distinct", () => {
    const observations = [
      {
        ...batch.observations[0],
        variantSourceIdentity: {
          namespace: "fixture:1",
          ruleVersion: 2,
          value: "dragon",
        },
      },
      {
        ...batch.observations[0],
        variantSourceIdentity: {
          namespace: "fixture",
          ruleVersion: 1,
          value: "2:dragon",
        },
      },
    ];

    expect(
      connectorObservationBatchSchema.parse({ ...batch, observations })
        .observations,
    ).toHaveLength(2);
  });

  it("bounds source identity rule versions to PostgreSQL integers", () => {
    expect(() =>
      connectorObservationBatchSchema.parse({
        ...batch,
        observations: [
          {
            ...batch.observations[0],
            variantSourceIdentity: {
              ...batch.observations[0].variantSourceIdentity,
              ruleVersion: 2_147_483_648,
            },
          },
        ],
      }),
    ).toThrow(/too_big|too big/i);
  });

  it("bounds raw observation JSON and persisted batch sequences", () => {
    expect(() =>
      connectorObservationBatchSchema.parse({
        ...batch,
        observations: [
          {
            ...batch.observations[0],
            rawFacts: { description: "x".repeat(100_001) },
          },
        ],
      }),
    ).toThrow(/byte|string/i);
    expect(() =>
      connectorObservationBatchSchema.parse({
        ...batch,
        sequence: 2_147_483_648,
      }),
    ).toThrow(/too_big|too big/i);
  });

  it("bounds the aggregate serialized Connector batch", () => {
    expect(() =>
      connectorObservationBatchSchema.parse({
        ...batch,
        evidence: [
          ...batch.evidence,
          ...Array.from({ length: 10 }, (_, index) => ({
            ...batch.evidence[0],
            content: "x".repeat(1_000_000),
            identity: `evd_oversized_${index}`,
          })),
        ],
      }),
    ).toThrow(/batch.*byte/i);
  });

  it("requires restart-only runs to persist no interpreted checkpoint", () => {
    expect(() =>
      commitConnectorBatchCommandSchema.parse({
        batch,
        run: {
          adapterId: "fixture-http",
          adapterVersion: "1.0.0",
          identity: batch.runIdentity,
          integrationIdentity: integration.identity,
          job: "catalog_discovery",
          resumeMode: "restart_only",
        },
        schemaVersion: 1,
      }),
    ).toThrow(/restart-only/i);
  });

  it("bounds opaque Connector checkpoint size and depth", () => {
    expect(() =>
      connectorCheckpointSchema.parse({
        schemaVersion: 1,
        value: { cursor: "x".repeat(1_000_001) },
      }),
    ).toThrow(/byte|string/i);
    let nestedValue: unknown = "leaf";
    for (let depth = 0; depth < 34; depth += 1) {
      nestedValue = [nestedValue];
    }
    expect(() =>
      connectorCheckpointSchema.parse({
        schemaVersion: 1,
        value: nestedValue,
      }),
    ).toThrow(/depth/i);
  });
});
