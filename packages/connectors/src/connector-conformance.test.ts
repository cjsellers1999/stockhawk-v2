import { createHash } from "node:crypto";
import http from "node:http";
import https from "node:https";
import net from "node:net";

import { describe, expect, it, vi } from "vitest";

import { createCrawlRequestBroker, type BrokerTransport } from "./broker.js";
import { collectConnectorRun } from "./connector.js";
import { createFixtureConnectorAdapter } from "./fixture/fixture-adapter.js";
import { fixtureIntegration } from "./fixture/fixture-integration.js";

type BrokerOptions = Parameters<typeof createCrawlRequestBroker>[0];

const page = (value: unknown) => {
  const sourceValue =
    typeof value === "object" && value !== null && "products" in value
      ? { surfaceFingerprint: "fixture-catalog-v1", ...value }
      : value;
  return new TextEncoder().encode(JSON.stringify(sourceValue));
};
const streamBody = (body: Uint8Array): AsyncIterable<Uint8Array> => ({
  async *[Symbol.asyncIterator]() {
    yield body;
  },
});
const forbiddenNetwork = () => {
  throw new Error("Ambient network access must not be used");
};

const catalogPages = new Map([
  [
    "https://fixture.store/catalog",
    {
      body: page({
        extraRetailerField: "ignored",
        nextCursor: "page-2",
        products: [
          {
            id: "sky-dragon",
            title: "Sky Dragon",
            variants: [
              {
                available: true,
                id: "sky-dragon-medium",
                title: "Sky Dragon — Medium",
              },
            ],
          },
        ],
      }),
      headers: {},
      status: 200,
    },
  ],
  [
    "https://fixture.store/catalog?cursor=page-2",
    {
      body: page({
        nextCursor: null,
        products: [
          {
            id: "sky-dragon",
            title: "Sky Dragon",
            variants: [
              {
                available: true,
                id: "sky-dragon-medium",
                title: "Sky Dragon — Medium",
              },
            ],
          },
          {
            id: "bashful-bunny",
            title: "Bashful Bunny",
            variants: [
              {
                available: false,
                id: "bashful-bunny-small",
                title: "Bashful Bunny — Small",
              },
            ],
          },
        ],
      }),
      headers: {},
      status: 200,
    },
  ],
]);

const createHarness = ({
  cacheTimeToLiveMilliseconds = 0,
  now,
  pages = catalogPages,
}: {
  cacheTimeToLiveMilliseconds?: number;
  now?: () => Date;
  pages?: Map<
    string,
    { body: Uint8Array; headers: Record<string, string>; status: number }
  >;
} = {}) => {
  const request = vi.fn<BrokerTransport["request"]>(async ({ url }) => {
    const result = pages.get(url);
    if (result === undefined) {
      throw new Error(`Unexpected fixture URL: ${url}`);
    }
    return { ...result, body: streamBody(result.body) };
  });
  const broker = createCrawlRequestBroker({
    acquireGlobalPermit: vi
      .fn<BrokerOptions["acquireGlobalPermit"]>()
      .mockResolvedValue(undefined),
    acquireStorefrontPermit: vi
      .fn<BrokerOptions["acquireStorefrontPermit"]>()
      .mockResolvedValue(undefined),
    cacheTimeToLiveMilliseconds,
    now,
    resolveHostname: vi
      .fn<BrokerOptions["resolveHostname"]>()
      .mockResolvedValue(["8.8.8.8"]),
    transport: { request },
  });
  return {
    adapter: createFixtureConnectorAdapter(),
    broker,
    request,
  };
};

describe("common Connector conformance", () => {
  it("paginates, deduplicates, and emits exact variants with resumable checkpoints", async () => {
    const { adapter, broker, request } = createHarness();

    const result = await collectConnectorRun(
      adapter.discoverCatalog({
        checkpoint: null,
        integration: fixtureIntegration,
        runContext: {
          broker,
          runIdentity: "run_fixture_discovery",
          signal: new AbortController().signal,
        },
      }),
    );

    expect(result.events).toHaveLength(2);
    expect(result.events[0]?.batch.checkpoint).toEqual(
      expect.objectContaining({
        value: expect.objectContaining({
          observedRoutes: ["https://fixture.store/catalog"],
        }),
      }),
    );
    expect(
      result.events.flatMap(({ batch }) => batch.observations),
    ).toHaveLength(2);
    expect(result.terminal).toEqual(
      expect.objectContaining({
        outcome: "completed",
        certificationClaim: expect.objectContaining({
          observedParentCount: 2,
          observedVariantCount: 2,
        }),
      }),
    );
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("preserves the original observation time when reusing cached evidence", async () => {
    let currentTime = new Date("2026-07-24T17:00:00.000Z");
    const singlePage = new Map([
      [
        "https://fixture.store/catalog",
        {
          body: page({ nextCursor: null, products: [] }),
          headers: {},
          status: 200,
        },
      ],
    ]);
    const { adapter, broker, request } = createHarness({
      cacheTimeToLiveMilliseconds: 60_000,
      now: () => currentTime,
      pages: singlePage,
    });
    const discover = (runIdentity: string) =>
      collectConnectorRun(
        adapter.discoverCatalog({
          checkpoint: null,
          integration: fixtureIntegration,
          runContext: {
            broker,
            runIdentity,
            signal: new AbortController().signal,
          },
        }),
      );

    const first = await discover("run_fixture_cache_time_first");
    currentTime = new Date("2026-07-24T17:00:30.000Z");
    const second = await discover("run_fixture_cache_time_second");

    expect(first.events[0]?.batch.evidence[0]?.observedAt).toBe(
      "2026-07-24T17:00:00.000Z",
    );
    expect(second.events[0]?.batch.evidence[0]?.observedAt).toBe(
      "2026-07-24T17:00:00.000Z",
    );
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("runs through the injected Broker when ambient network primitives are trapped", async () => {
    const ambientFetch = vi.fn<() => never>(forbiddenNetwork);
    const ambientBrowser = vi.fn<() => never>(forbiddenNetwork);
    const httpGet = vi.spyOn(http, "get").mockImplementation(forbiddenNetwork);
    const httpRequest = vi
      .spyOn(http, "request")
      .mockImplementation(forbiddenNetwork);
    const httpsGet = vi
      .spyOn(https, "get")
      .mockImplementation(forbiddenNetwork);
    const httpsRequest = vi
      .spyOn(https, "request")
      .mockImplementation(forbiddenNetwork);
    const netConnect = vi
      .spyOn(net, "connect")
      .mockImplementation(forbiddenNetwork);
    const netCreateConnection = vi
      .spyOn(net, "createConnection")
      .mockImplementation(forbiddenNetwork);
    vi.stubGlobal("fetch", ambientFetch);
    vi.stubGlobal("EventSource", ambientBrowser);
    vi.stubGlobal("WebSocket", ambientBrowser);
    try {
      const { adapter, broker } = createHarness();
      const result = await collectConnectorRun(
        adapter.discoverCatalog({
          checkpoint: null,
          integration: fixtureIntegration,
          runContext: {
            broker,
            runIdentity: "run_fixture_broker_only",
            signal: new AbortController().signal,
          },
        }),
      );

      expect(result.terminal.outcome).toBe("completed");
      expect(ambientFetch).not.toHaveBeenCalled();
      for (const primitive of [
        ambientBrowser,
        httpGet,
        httpRequest,
        httpsGet,
        httpsRequest,
        netConnect,
        netCreateConnection,
      ]) {
        expect(primitive).not.toHaveBeenCalled();
      }
    } finally {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }
  });

  it("resumes after a committed checkpoint without replaying the first page", async () => {
    const firstHarness = createHarness();
    const firstRun = await collectConnectorRun(
      firstHarness.adapter.discoverCatalog({
        checkpoint: null,
        integration: fixtureIntegration,
        runContext: {
          broker: firstHarness.broker,
          runIdentity: "run_fixture_resume",
          signal: new AbortController().signal,
        },
      }),
    );
    const checkpoint = firstRun.events[0]?.batch.checkpoint;
    if (checkpoint === null || checkpoint === undefined) {
      throw new Error("Expected a resumable Fixture checkpoint");
    }
    const { adapter, broker, request } = createHarness();

    const result = await collectConnectorRun(
      adapter.discoverCatalog({
        checkpoint,
        integration: fixtureIntegration,
        runContext: {
          broker,
          runIdentity: "run_fixture_resume",
          signal: new AbortController().signal,
        },
      }),
    );

    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.batch.sequence).toBe(1);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://fixture.store/catalog?cursor=page-2",
      }),
    );
    expect(
      result.events[0]?.batch.observations[0]?.parentSourceIdentity.value,
    ).toBe("bashful-bunny");
    expect(result.terminal).toEqual(
      expect.objectContaining({
        certificationClaim: expect.objectContaining({
          observedParentCount: 2,
          observedVariantCount: 2,
        }),
      }),
    );
  });

  it("rejects unbounded monitoring targets before source access", async () => {
    const { adapter, broker, request } = createHarness();
    const result = await collectConnectorRun(
      adapter.monitorStock({
        checkpoint: null,
        integration: fixtureIntegration,
        runContext: {
          broker,
          runIdentity: "run_fixture_unbounded",
          signal: new AbortController().signal,
        },
        targets: Array.from({ length: 101 }, (_, index) => ({
          sourceIdentityValue: `variant-${index}`,
        })),
      }),
    );

    expect(result.terminal).toEqual(
      expect.objectContaining({ code: "adapter-fault", outcome: "failed" }),
    );
    expect(request).not.toHaveBeenCalled();
  });

  it("returns a typed failure when bounded monitoring targets produce an oversized URL", async () => {
    const { adapter, broker, request } = createHarness();
    const result = await collectConnectorRun(
      adapter.monitorStock({
        checkpoint: null,
        integration: fixtureIntegration,
        runContext: {
          broker,
          runIdentity: "run_fixture_oversized_monitoring_url",
          signal: new AbortController().signal,
        },
        targets: Array.from({ length: 100 }, (_, index) => ({
          sourceIdentityValue: `${String(index).padStart(3, "0")}-${"x".repeat(196)}`,
        })),
      }),
    );

    expect(result.terminal).toEqual(
      expect.objectContaining({
        code: "malformed-source",
        outcome: "failed",
        stage: "monitoring",
      }),
    );
    expect(request).not.toHaveBeenCalled();
  });

  it("completes an empty monitoring target set without source traffic", async () => {
    const { adapter, broker, request } = createHarness();
    const result = await collectConnectorRun(
      adapter.monitorStock({
        checkpoint: null,
        integration: fixtureIntegration,
        runContext: {
          broker,
          runIdentity: "run_fixture_empty_targets",
          signal: new AbortController().signal,
        },
        targets: [],
      }),
    );

    expect(result).toEqual({
      events: [],
      terminal: expect.objectContaining({
        outcome: "completed",
        targetOutcomes: [],
      }),
    });
    expect(request).not.toHaveBeenCalled();
  });

  it("returns a typed malformed-source failure", async () => {
    const malformedPages = new Map(catalogPages);
    malformedPages.set("https://fixture.store/catalog", {
      body: page({ nextCursor: null, products: [{ title: "missing id" }] }),
      headers: {},
      status: 200,
    });
    const { adapter, broker } = createHarness({ pages: malformedPages });

    const result = await collectConnectorRun(
      adapter.discoverCatalog({
        checkpoint: null,
        integration: fixtureIntegration,
        runContext: {
          broker,
          runIdentity: "run_fixture_malformed",
          signal: new AbortController().signal,
        },
      }),
    );

    expect(result.terminal).toEqual(
      expect.objectContaining({
        code: "malformed-source",
        outcome: "failed",
        retrySafety: "after-repair",
        stage: "decode",
      }),
    );
  });

  it("returns a typed failure for source fields outside common output bounds", async () => {
    const malformedPages = new Map(catalogPages);
    malformedPages.set("https://fixture.store/catalog", {
      body: page({
        nextCursor: null,
        products: [
          {
            id: "bounded-parent",
            title: "Bounded Parent",
            variants: [
              {
                available: true,
                id: "bounded-variant",
                title: "x".repeat(1_001),
              },
            ],
          },
        ],
      }),
      headers: {},
      status: 200,
    });
    const { adapter, broker } = createHarness({ pages: malformedPages });

    const result = await collectConnectorRun(
      adapter.discoverCatalog({
        checkpoint: null,
        integration: fixtureIntegration,
        runContext: {
          broker,
          runIdentity: "run_fixture_bounded_source",
          signal: new AbortController().signal,
        },
      }),
    );

    expect(result.terminal).toEqual(
      expect.objectContaining({
        code: "malformed-source",
        outcome: "failed",
        stage: "decode",
      }),
    );
  });

  it("returns a typed failure for an oversized source image URL", async () => {
    const malformedPages = new Map(catalogPages);
    malformedPages.set("https://fixture.store/catalog", {
      body: page({
        nextCursor: null,
        products: [
          {
            id: "bounded-parent",
            title: "Bounded Parent",
            variants: [
              {
                available: true,
                id: "bounded-variant",
                imageUrl: `https://fixture.store/${"x".repeat(10_000)}`,
                title: "Bounded Variant",
              },
            ],
          },
        ],
      }),
      headers: {},
      status: 200,
    });
    const { adapter, broker } = createHarness({ pages: malformedPages });

    const result = await collectConnectorRun(
      adapter.discoverCatalog({
        checkpoint: null,
        integration: fixtureIntegration,
        runContext: {
          broker,
          runIdentity: "run_fixture_oversized_image_url",
          signal: new AbortController().signal,
        },
      }),
    );

    expect(result.terminal).toEqual(
      expect.objectContaining({
        code: "malformed-source",
        outcome: "failed",
        stage: "decode",
      }),
    );
  });

  it("returns a typed failure when a bounded cursor produces an oversized URL", async () => {
    const oversizedCursorPages = new Map(catalogPages);
    oversizedCursorPages.set("https://fixture.store/catalog", {
      body: page({ nextCursor: "x".repeat(10_000), products: [] }),
      headers: {},
      status: 200,
    });
    const { adapter, broker, request } = createHarness({
      pages: oversizedCursorPages,
    });

    const result = await collectConnectorRun(
      adapter.discoverCatalog({
        checkpoint: null,
        integration: fixtureIntegration,
        runContext: {
          broker,
          runIdentity: "run_fixture_oversized_cursor_url",
          signal: new AbortController().signal,
        },
      }),
    );

    expect(result.events).toHaveLength(1);
    expect(result.terminal).toEqual(
      expect.objectContaining({
        code: "malformed-source",
        outcome: "failed",
        stage: "discovery",
      }),
    );
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("hashes the exact retained evidence representation", async () => {
    const retainedContentPages = new Map(catalogPages);
    const sourceBody = page({ nextCursor: null, products: [] });
    retainedContentPages.set("https://fixture.store/catalog", {
      body: Uint8Array.from([0xef, 0xbb, 0xbf, ...sourceBody]),
      headers: {},
      status: 200,
    });
    const { adapter, broker } = createHarness({ pages: retainedContentPages });

    const result = await collectConnectorRun(
      adapter.discoverCatalog({
        checkpoint: null,
        integration: fixtureIntegration,
        runContext: {
          broker,
          runIdentity: "run_fixture_retained_evidence",
          signal: new AbortController().signal,
        },
      }),
    );

    const evidence = result.events[0]?.batch.evidence[0];
    expect(evidence).toBeDefined();
    expect(evidence?.contentHash).toBe(
      createHash("sha256")
        .update(evidence?.content ?? "")
        .digest("hex"),
    );
  });

  it("returns a typed failure before yielding an oversized source page", async () => {
    const oversizedPages = new Map([
      [
        "https://fixture.store/catalog",
        {
          body: page({
            nextCursor: null,
            products: [
              {
                id: "oversized-parent",
                title: "Oversized Parent",
                variants: Array.from({ length: 101 }, (_, index) => ({
                  available: true,
                  id: `oversized-variant-${index}`,
                  title: `Oversized Variant ${index}`,
                })),
              },
            ],
          }),
          headers: {},
          status: 200,
        },
      ],
    ]);
    const { adapter, broker, request } = createHarness({
      pages: oversizedPages,
    });

    const result = await collectConnectorRun(
      adapter.discoverCatalog({
        checkpoint: null,
        integration: fixtureIntegration,
        runContext: {
          broker,
          runIdentity: "run_fixture_oversized_page",
          signal: new AbortController().signal,
        },
      }),
    );

    expect(result.events).toEqual([]);
    expect(result.terminal).toEqual(
      expect.objectContaining({
        code: "malformed-source",
        evidenceIdentity: expect.any(String),
        outcome: "failed",
        stage: "decode",
      }),
    );
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("returns a typed failure when source evidence exceeds its retained limit", async () => {
    const oversizedEvidencePages = new Map([
      [
        "https://fixture.store/catalog",
        {
          body: page({
            nextCursor: null,
            padding: "a".repeat(1_000_001),
            products: [],
          }),
          headers: {},
          status: 200,
        },
      ],
    ]);
    const { adapter, broker, request } = createHarness({
      pages: oversizedEvidencePages,
    });

    const result = await collectConnectorRun(
      adapter.discoverCatalog({
        checkpoint: null,
        integration: fixtureIntegration,
        runContext: {
          broker,
          runIdentity: "run_fixture_oversized_evidence",
          signal: new AbortController().signal,
        },
      }),
    );

    expect(result.events).toEqual([]);
    expect(result.terminal).toEqual(
      expect.objectContaining({
        code: "malformed-source",
        evidenceIdentity: null,
        outcome: "failed",
        stage: "decode",
      }),
    );
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("keeps a large access-error response retryable without retaining its body", async () => {
    const failurePages = new Map([
      [
        "https://fixture.store/catalog",
        {
          body: new TextEncoder().encode("x".repeat(1_000_001)),
          headers: { "retry-after": "120" },
          status: 503,
        },
      ],
    ]);
    const { adapter, broker } = createHarness({
      now: () => new Date("2026-07-24T17:00:00.000Z"),
      pages: failurePages,
    });

    const result = await collectConnectorRun(
      adapter.discoverCatalog({
        checkpoint: null,
        integration: fixtureIntegration,
        runContext: {
          broker,
          runIdentity: "run_fixture_large_access_error",
          signal: new AbortController().signal,
        },
      }),
    );

    expect(result.terminal).toEqual(
      expect.objectContaining({
        code: "throttled",
        evidenceIdentity: null,
        outcome: "failed",
        retryAt: "2026-07-24T17:02:00.000Z",
        stage: "access",
      }),
    );
  });

  it("returns a typed failure for an oversized approved redirect URL", async () => {
    const finalUrl = `https://fixture.store/catalog/${"x".repeat(10_000)}`;
    const redirectedPages = new Map<
      string,
      { body: Uint8Array; headers: Record<string, string>; status: number }
    >([
      [
        "https://fixture.store/catalog",
        {
          body: page({}),
          headers: { location: finalUrl },
          status: 302,
        },
      ],
      [
        finalUrl,
        {
          body: page({ nextCursor: null, products: [] }),
          headers: {},
          status: 200,
        },
      ],
    ]);
    const { adapter, broker, request } = createHarness({
      pages: redirectedPages,
    });

    const result = await collectConnectorRun(
      adapter.discoverCatalog({
        checkpoint: null,
        integration: fixtureIntegration,
        runContext: {
          broker,
          runIdentity: "run_fixture_oversized_redirect",
          signal: new AbortController().signal,
        },
      }),
    );

    expect(result.events).toEqual([]);
    expect(result.terminal).toEqual(
      expect.objectContaining({
        code: "malformed-source",
        evidenceIdentity: null,
        outcome: "failed",
        stage: "decode",
      }),
    );
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("reports Integration Drift instead of switching behavior silently", async () => {
    const driftedPages = new Map(catalogPages);
    driftedPages.set("https://fixture.store/catalog", {
      body: page({
        nextCursor: null,
        products: [],
        surfaceFingerprint: "unexpected-platform-v2",
      }),
      headers: {},
      status: 200,
    });
    const { adapter, broker } = createHarness({ pages: driftedPages });

    const result = await collectConnectorRun(
      adapter.discoverCatalog({
        checkpoint: null,
        integration: fixtureIntegration,
        runContext: {
          broker,
          runIdentity: "run_fixture_drift",
          signal: new AbortController().signal,
        },
      }),
    );

    expect(result.terminal).toEqual(
      expect.objectContaining({
        code: "integration-drift",
        outcome: "failed",
        retrySafety: "after-repair",
      }),
    );
  });

  it("reports Integration Drift when the source fingerprint is missing", async () => {
    const driftedPages = new Map(catalogPages);
    driftedPages.set("https://fixture.store/catalog", {
      body: new TextEncoder().encode(
        JSON.stringify({ nextCursor: null, products: [] }),
      ),
      headers: {},
      status: 200,
    });
    const { adapter, broker } = createHarness({ pages: driftedPages });

    const result = await collectConnectorRun(
      adapter.discoverCatalog({
        checkpoint: null,
        integration: fixtureIntegration,
        runContext: {
          broker,
          runIdentity: "run_fixture_missing_fingerprint",
          signal: new AbortController().signal,
        },
      }),
    );

    expect(result.terminal).toEqual(
      expect.objectContaining({
        code: "integration-drift",
        outcome: "failed",
        retrySafety: "after-repair",
      }),
    );
  });

  it("returns a typed failure for conflicting duplicate variants", async () => {
    const conflictingPages = new Map(catalogPages);
    conflictingPages.set("https://fixture.store/catalog?cursor=page-2", {
      body: page({
        nextCursor: null,
        products: [
          {
            id: "other-parent",
            title: "Other Parent",
            variants: [
              {
                available: false,
                id: "sky-dragon-medium",
                title: "Conflicting Sky Dragon",
              },
            ],
          },
        ],
      }),
      headers: {},
      status: 200,
    });
    const { adapter, broker } = createHarness({ pages: conflictingPages });

    const result = await collectConnectorRun(
      adapter.discoverCatalog({
        checkpoint: null,
        integration: fixtureIntegration,
        runContext: {
          broker,
          runIdentity: "run_fixture_duplicate_conflict",
          signal: new AbortController().signal,
        },
      }),
    );

    expect(result.events).toHaveLength(1);
    expect(result.terminal).toEqual(
      expect.objectContaining({
        code: "malformed-source",
        evidenceIdentity: expect.any(String),
        outcome: "failed",
        stage: "discovery",
      }),
    );
  });

  it("rejects cursor loops without issuing an unbounded request sequence", async () => {
    const loopingPages = new Map(catalogPages);
    loopingPages.set("https://fixture.store/catalog?cursor=page-2", {
      body: page({ nextCursor: "page-2", products: [] }),
      headers: {},
      status: 200,
    });
    const { adapter, broker, request } = createHarness({
      pages: loopingPages,
    });

    const result = await collectConnectorRun(
      adapter.discoverCatalog({
        checkpoint: null,
        integration: fixtureIntegration,
        runContext: {
          broker,
          runIdentity: "run_fixture_cursor_loop",
          signal: new AbortController().signal,
        },
      }),
    );

    expect(result.terminal).toEqual(
      expect.objectContaining({
        code: "malformed-source",
        outcome: "failed",
        stage: "discovery",
      }),
    );
    expect(request).toHaveBeenCalledTimes(2);
  });

  it.each([
    { code: "throttled", status: 429 },
    { code: "challenge", status: 403 },
  ])("returns typed $code access evidence", async ({ code, status }) => {
    const failurePages = new Map([
      [
        "https://fixture.store/catalog",
        {
          body: page({}),
          headers: {},
          status,
        },
      ],
    ]);
    const { adapter, broker } = createHarness({ pages: failurePages });

    const result = await collectConnectorRun(
      adapter.discoverCatalog({
        checkpoint: null,
        integration: fixtureIntegration,
        runContext: {
          broker,
          runIdentity: `run_fixture_${code}`,
          signal: new AbortController().signal,
        },
      }),
    );

    expect(result.terminal).toEqual(
      expect.objectContaining({
        code,
        evidenceArtifact: expect.objectContaining({
          identity: expect.any(String),
        }),
        evidenceIdentity: expect.any(String),
        outcome: "failed",
        stage: "access",
      }),
    );
  });

  it("preserves Retry-After when discovery receives a 503", async () => {
    const failurePages = new Map([
      [
        "https://fixture.store/catalog",
        {
          body: page({}),
          headers: { "retry-after": "Fri, 24 Jul 2026 20:00:00 GMT" },
          status: 503,
        },
      ],
    ]);
    const { adapter, broker } = createHarness({ pages: failurePages });

    const result = await collectConnectorRun(
      adapter.discoverCatalog({
        checkpoint: null,
        integration: fixtureIntegration,
        runContext: {
          broker,
          runIdentity: "run_fixture_unavailable",
          signal: new AbortController().signal,
        },
      }),
    );

    expect(result.terminal).toEqual(
      expect.objectContaining({
        code: "throttled",
        outcome: "failed",
        retryAt: "2026-07-24T20:00:00.000Z",
        stage: "access",
      }),
    );
  });

  it("bases relative Retry-After on the broker response time", async () => {
    const failurePages = new Map([
      [
        "https://fixture.store/catalog",
        {
          body: page({}),
          headers: { "retry-after": "120" },
          status: 503,
        },
      ],
    ]);
    const { adapter, broker } = createHarness({
      now: () => new Date("2026-07-24T17:00:00.000Z"),
      pages: failurePages,
    });

    const result = await collectConnectorRun(
      adapter.discoverCatalog({
        checkpoint: null,
        integration: fixtureIntegration,
        runContext: {
          broker,
          runIdentity: "run_fixture_relative_retry",
          signal: new AbortController().signal,
        },
      }),
    );

    expect(result.terminal).toEqual(
      expect.objectContaining({
        code: "throttled",
        retryAt: "2026-07-24T17:02:00.000Z",
      }),
    );
  });

  it("classifies a custom abort reason as cancellation", async () => {
    const controller = new AbortController();
    const request = vi.fn<BrokerTransport["request"]>(async () => {
      controller.abort("fixture-cancelled");
      throw controller.signal.reason;
    });
    const broker = createCrawlRequestBroker({
      acquireGlobalPermit: vi
        .fn<BrokerOptions["acquireGlobalPermit"]>()
        .mockResolvedValue(undefined),
      acquireStorefrontPermit: vi
        .fn<BrokerOptions["acquireStorefrontPermit"]>()
        .mockResolvedValue(undefined),
      resolveHostname: vi
        .fn<BrokerOptions["resolveHostname"]>()
        .mockResolvedValue(["8.8.8.8"]),
      transport: { request },
    });

    const result = await collectConnectorRun(
      createFixtureConnectorAdapter().discoverCatalog({
        checkpoint: null,
        integration: fixtureIntegration,
        runContext: {
          broker,
          runIdentity: "run_fixture_custom_abort",
          signal: controller.signal,
        },
      }),
    );

    expect(result.terminal).toEqual(
      expect.objectContaining({
        code: "cancelled",
        outcome: "failed",
      }),
    );
  });

  it("flushes the latest safe checkpoint on cancellation", async () => {
    const controller = new AbortController();
    const { adapter, broker } = createHarness();
    const run = adapter.discoverCatalog({
      checkpoint: null,
      integration: fixtureIntegration,
      runContext: {
        broker,
        runIdentity: "run_fixture_cancel",
        signal: controller.signal,
      },
    });

    const first = await run.next();
    if (first.done) {
      throw new Error("Expected one safe batch before cancellation");
    }
    controller.abort();
    const terminal = await run.next();

    expect(first.done).toBe(false);
    expect(terminal).toEqual({
      done: true,
      value: expect.objectContaining({
        checkpoint: first.value.batch.checkpoint,
        code: "cancelled",
        outcome: "failed",
      }),
    });
  });

  it("accounts for every requested Stock Monitoring target", async () => {
    const stockPages = new Map([
      [
        "https://fixture.store/stock?ids=sky-dragon-medium&ids=missing",
        {
          body: page({
            results: [
              {
                available: false,
                id: "sky-dragon-medium",
                parentId: "sky-dragon",
                title: "Sky Dragon — Medium",
              },
            ],
          }),
          headers: {},
          status: 200,
        },
      ],
    ]);
    const { adapter, broker } = createHarness({ pages: stockPages });

    const result = await collectConnectorRun(
      adapter.monitorStock({
        checkpoint: null,
        integration: fixtureIntegration,
        runContext: {
          broker,
          runIdentity: "run_fixture_monitor",
          signal: new AbortController().signal,
        },
        targets: [
          { sourceIdentityValue: "sky-dragon-medium" },
          { sourceIdentityValue: "missing" },
        ],
      }),
    );

    expect(result.terminal).toEqual(
      expect.objectContaining({
        outcome: "completed",
        targetOutcomes: [
          {
            evidenceIdentity: expect.any(String),
            outcome: "observed",
            sourceIdentityValue: "sky-dragon-medium",
          },
          {
            evidenceIdentity: null,
            outcome: "not_observed",
            sourceIdentityValue: "missing",
          },
        ],
      }),
    );
    expect(
      result.events[0]?.batch.observations[0]?.parentSourceIdentity.value,
    ).toBe("sky-dragon");
  });

  it("returns a typed failure for an oversized Stock Monitoring response", async () => {
    const stockPages = new Map([
      [
        "https://fixture.store/stock?ids=sky-dragon-medium",
        {
          body: page({
            results: Array.from({ length: 101 }, (_, index) => ({
              available: true,
              id: `unexpected-variant-${index}`,
              parentId: `unexpected-parent-${index}`,
              title: `Unexpected Variant ${index}`,
            })),
          }),
          headers: {},
          status: 200,
        },
      ],
    ]);
    const { adapter, broker, request } = createHarness({ pages: stockPages });

    const result = await collectConnectorRun(
      adapter.monitorStock({
        checkpoint: null,
        integration: fixtureIntegration,
        runContext: {
          broker,
          runIdentity: "run_fixture_oversized_monitoring_response",
          signal: new AbortController().signal,
        },
        targets: [{ sourceIdentityValue: "sky-dragon-medium" }],
      }),
    );

    expect(result.events).toEqual([]);
    expect(result.terminal).toEqual(
      expect.objectContaining({
        code: "malformed-source",
        evidenceIdentity: expect.any(String),
        outcome: "failed",
        stage: "decode",
      }),
    );
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("does not emit Stock Monitoring observations for unrequested identities", async () => {
    const stockPages = new Map([
      [
        "https://fixture.store/stock?ids=sky-dragon-medium",
        {
          body: page({
            results: [
              {
                available: true,
                id: "sky-dragon-medium",
                parentId: "sky-dragon",
                title: "Sky Dragon — Medium",
              },
              {
                available: true,
                id: "unrequested-variant",
                parentId: "unrequested-parent",
                title: "Unrequested Variant",
              },
            ],
          }),
          headers: {},
          status: 200,
        },
      ],
    ]);
    const { adapter, broker } = createHarness({ pages: stockPages });

    const result = await collectConnectorRun(
      adapter.monitorStock({
        checkpoint: null,
        integration: fixtureIntegration,
        runContext: {
          broker,
          runIdentity: "run_fixture_scoped_monitoring_response",
          signal: new AbortController().signal,
        },
        targets: [{ sourceIdentityValue: "sky-dragon-medium" }],
      }),
    );

    expect(result.events[0]?.batch.observations).toHaveLength(1);
    expect(
      result.events[0]?.batch.observations.map(
        ({ variantSourceIdentity }) => variantSourceIdentity.value,
      ),
    ).toEqual(["sky-dragon-medium"]);
  });

  it("returns a typed failure for conflicting duplicate monitoring results", async () => {
    const stockPages = new Map([
      [
        "https://fixture.store/stock?ids=sky-dragon-medium",
        {
          body: page({
            results: [
              {
                available: true,
                id: "sky-dragon-medium",
                parentId: "sky-dragon",
                title: "Sky Dragon — Medium",
              },
              {
                available: false,
                id: "sky-dragon-medium",
                parentId: "other-parent",
                title: "Conflicting Sky Dragon",
              },
            ],
          }),
          headers: {},
          status: 200,
        },
      ],
    ]);
    const { adapter, broker } = createHarness({ pages: stockPages });

    const result = await collectConnectorRun(
      adapter.monitorStock({
        checkpoint: null,
        integration: fixtureIntegration,
        runContext: {
          broker,
          runIdentity: "run_fixture_monitor_duplicate_conflict",
          signal: new AbortController().signal,
        },
        targets: [{ sourceIdentityValue: "sky-dragon-medium" }],
      }),
    );

    expect(result.events).toEqual([]);
    expect(result.terminal).toEqual(
      expect.objectContaining({
        code: "malformed-source",
        outcome: "failed",
        stage: "decode",
      }),
    );
  });

  it("serializes comma-bearing target IDs without changing identity or URL structure", async () => {
    const stockPages = new Map([
      [
        "https://fixture.store/stock?ids=foo%2Cbar",
        {
          body: page({
            results: [
              {
                available: true,
                id: "foo,bar",
                parentId: "comma-parent",
                title: "Comma Variant",
              },
            ],
          }),
          headers: {},
          status: 200,
        },
      ],
    ]);
    const { adapter, broker } = createHarness({ pages: stockPages });

    const result = await collectConnectorRun(
      adapter.monitorStock({
        checkpoint: null,
        integration: fixtureIntegration,
        runContext: {
          broker,
          runIdentity: "run_fixture_comma_target",
          signal: new AbortController().signal,
        },
        targets: [{ sourceIdentityValue: "foo,bar" }],
      }),
    );

    expect(result.events[0]?.batch.observations[0]).toEqual(
      expect.objectContaining({
        purchaseUrl: "https://fixture.store/products/foo%2Cbar",
        variantSourceIdentity: expect.objectContaining({ value: "foo,bar" }),
      }),
    );
  });

  it("treats a monitoring 503 with Retry-After as throttling", async () => {
    const stockPages = new Map([
      [
        "https://fixture.store/stock?ids=sky-dragon-medium",
        {
          body: page({}),
          headers: { "retry-after": "Fri, 24 Jul 2026 20:00:00 GMT" },
          status: 503,
        },
      ],
    ]);
    const { adapter, broker } = createHarness({ pages: stockPages });

    const result = await collectConnectorRun(
      adapter.monitorStock({
        checkpoint: null,
        integration: fixtureIntegration,
        runContext: {
          broker,
          runIdentity: "run_fixture_monitor_unavailable",
          signal: new AbortController().signal,
        },
        targets: [{ sourceIdentityValue: "sky-dragon-medium" }],
      }),
    );

    expect(result.terminal).toEqual(
      expect.objectContaining({
        code: "throttled",
        outcome: "failed",
        retryAt: "2026-07-24T20:00:00.000Z",
      }),
    );
  });

  it("declares restart-only progress without exposing an interpreted checkpoint", async () => {
    const { broker } = createHarness();
    const adapter = createFixtureConnectorAdapter({
      resumeMode: "restart_only",
    });

    const firstRun = await collectConnectorRun(
      adapter.discoverCatalog({
        checkpoint: null,
        integration: fixtureIntegration,
        runContext: {
          broker,
          runIdentity: "run_fixture_restart_only",
          signal: new AbortController().signal,
        },
      }),
    );
    const replayHarness = createHarness();
    const replay = await collectConnectorRun(
      adapter.discoverCatalog({
        checkpoint: null,
        integration: fixtureIntegration,
        runContext: {
          broker: replayHarness.broker,
          runIdentity: "run_fixture_restart_only",
          signal: new AbortController().signal,
        },
      }),
    );

    expect(
      firstRun.events.every(({ batch }) => batch.checkpoint === null),
    ).toBe(true);
    expect(replay.events.map(({ batch }) => batch.identity)).toEqual(
      firstRun.events.map(({ batch }) => batch.identity),
    );
    const rejectedCheckpoint = await collectConnectorRun(
      adapter.discoverCatalog({
        checkpoint: {
          schemaVersion: 1,
          value: {
            cursor: "page-2",
            fixtureSchemaVersion: 1,
            nextSequence: 1,
            observedRoutes: ["https://fixture.store/catalog"],
            seenParents: ["sky-dragon"],
            seenVariantFingerprints: {
              "sky-dragon-medium":
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            },
            seenVariants: ["sky-dragon-medium"],
            startedAt: "2026-07-24T17:00:00.000Z",
          },
        },
        integration: fixtureIntegration,
        runContext: {
          broker: replayHarness.broker,
          runIdentity: "run_fixture_restart_only_invalid_checkpoint",
          signal: new AbortController().signal,
        },
      }),
    );
    expect(rejectedCheckpoint.terminal).toEqual(
      expect.objectContaining({
        code: "adapter-fault",
        outcome: "failed",
        retrySafety: "after-repair",
      }),
    );
    const rejectedMonitoringCheckpoint = await collectConnectorRun(
      adapter.monitorStock({
        checkpoint: {
          schemaVersion: 1,
          value: { cursor: "unsupported" },
        },
        integration: fixtureIntegration,
        runContext: {
          broker: replayHarness.broker,
          runIdentity: "run_fixture_restart_monitor_invalid_checkpoint",
          signal: new AbortController().signal,
        },
        targets: [{ sourceIdentityValue: "sky-dragon-medium" }],
      }),
    );
    expect(rejectedMonitoringCheckpoint.terminal).toEqual(
      expect.objectContaining({
        code: "adapter-fault",
        outcome: "failed",
        retrySafety: "after-repair",
      }),
    );
  });

  it("marks interrupted restart-only work for restart", async () => {
    const controller = new AbortController();
    const { broker } = createHarness();
    const adapter = createFixtureConnectorAdapter({
      resumeMode: "restart_only",
    });
    const run = adapter.discoverCatalog({
      checkpoint: null,
      integration: fixtureIntegration,
      runContext: {
        broker,
        runIdentity: "run_fixture_restart_only_cancel",
        signal: controller.signal,
      },
    });

    await run.next();
    controller.abort();
    await expect(run.next()).resolves.toEqual({
      done: true,
      value: expect.objectContaining({
        code: "cancelled",
        retrySafety: "restart",
      }),
    });
  });
});
