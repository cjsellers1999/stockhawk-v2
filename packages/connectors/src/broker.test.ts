import { describe, expect, it, vi } from "vitest";
import type { StorefrontIntegration } from "@stockhawk/contracts";

import {
  BrokerAccessError,
  BrokerBackoffError,
  createCrawlRequestBroker,
  type BrokerTransport,
} from "./broker.js";
import { fixtureIntegration } from "./fixture/fixture-integration.js";

type BrokerOptions = Parameters<typeof createCrawlRequestBroker>[0];
type BrowserVisit = NonNullable<BrokerOptions["browser"]>["visit"];

const acquirePermit = () =>
  vi.fn<BrokerOptions["acquireGlobalPermit"]>().mockResolvedValue(undefined);
const resolvePublicHostname = () =>
  vi.fn<BrokerOptions["resolveHostname"]>().mockResolvedValue(["8.8.8.8"]);

const streamBody = (body: Uint8Array): AsyncIterable<Uint8Array> => ({
  async *[Symbol.asyncIterator]() {
    yield body;
  },
});

const response = ({
  body = '{"ok":true}',
  headers = {},
  status = 200,
}: {
  body?: string;
  headers?: Record<string, string>;
  status?: number;
} = {}) => ({
  body: streamBody(new TextEncoder().encode(body)),
  headers,
  status,
});

const createTransport = () => {
  const request = vi.fn<BrokerTransport["request"]>();
  request.mockImplementation(async () => response());
  return { request };
};

describe("Crawl Request Broker", () => {
  it("governs HTTP and image access through permits and shared cache", async () => {
    const transport = createTransport();
    const acquire = acquirePermit();
    let currentTime = new Date("2026-07-24T17:00:00.000Z");
    const broker = createCrawlRequestBroker({
      acquireGlobalPermit: acquire,
      acquireStorefrontPermit: acquire,
      now: () => currentTime,
      resolveHostname: resolvePublicHostname(),
      transport,
    });

    const first = await broker.requestHttp({
      integration: fixtureIntegration,
      purpose: "image",
      url: "https://fixture.store/images/dragon.jpg",
    });
    currentTime = new Date("2026-07-24T17:00:30.000Z");
    const second = await broker.requestHttp({
      integration: fixtureIntegration,
      purpose: "image",
      url: "https://fixture.store/images/dragon.jpg",
    });

    expect(first.cacheOutcome).toBe("miss");
    expect(second.cacheOutcome).toBe("hit");
    expect(second.receivedAt).toBe("2026-07-24T17:00:00.000Z");
    expect(transport.request).toHaveBeenCalledTimes(1);
    expect(acquire).toHaveBeenCalledTimes(2);
  });

  it.each(["no-store", "no-cache"])(
    "does not reuse responses marked Cache-Control: %s",
    async (cacheControl) => {
      const transport = createTransport();
      transport.request.mockResolvedValue(
        response({ headers: { "Cache-Control": cacheControl } }),
      );
      const broker = createCrawlRequestBroker({
        acquireGlobalPermit: acquirePermit(),
        acquireStorefrontPermit: acquirePermit(),
        resolveHostname: resolvePublicHostname(),
        transport,
      });
      const input = {
        integration: fixtureIntegration,
        purpose: "document" as const,
        url: "https://fixture.store/catalog",
      };

      const first = await broker.requestHttp(input);
      const second = await broker.requestHttp(input);

      expect(first.cacheOutcome).toBe("miss");
      expect(second.cacheOutcome).toBe("miss");
      expect(transport.request).toHaveBeenCalledTimes(2);
    },
  );

  it("rechecks cancellation after cached-target DNS validation", async () => {
    let completeValidation: ((addresses: string[]) => void) | undefined;
    const resolveHostname = vi
      .fn<BrokerOptions["resolveHostname"]>()
      .mockResolvedValueOnce(["8.8.8.8"])
      .mockResolvedValueOnce(["8.8.8.8"])
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            completeValidation = resolve;
          }),
      );
    const transport = createTransport();
    const broker = createCrawlRequestBroker({
      acquireGlobalPermit: acquirePermit(),
      acquireStorefrontPermit: acquirePermit(),
      resolveHostname,
      transport,
    });
    const input = {
      integration: fixtureIntegration,
      purpose: "document" as const,
      url: "https://fixture.store/catalog",
    };
    await broker.requestHttp(input);
    const controller = new AbortController();

    const cached = broker.requestHttp({
      ...input,
      signal: controller.signal,
    });
    await vi.waitFor(() => {
      expect(resolveHostname).toHaveBeenCalledTimes(3);
    });
    controller.abort();
    completeValidation?.(["8.8.8.8"]);

    await expect(cached).rejects.toMatchObject({ name: "AbortError" });
    expect(transport.request).toHaveBeenCalledTimes(1);
  });

  it("isolates cached responses by Integration identity", async () => {
    const transport = createTransport();
    const broker = createCrawlRequestBroker({
      acquireGlobalPermit: acquirePermit(),
      acquireStorefrontPermit: acquirePermit(),
      resolveHostname: resolvePublicHostname(),
      transport,
    });
    const url = "https://fixture.store/catalog";

    await broker.requestHttp({
      integration: fixtureIntegration,
      purpose: "document",
      url,
    });
    await broker.requestHttp({
      integration: {
        ...fixtureIntegration,
        identity: "int_fixture_store_v2",
      },
      purpose: "document",
      url,
    });

    expect(transport.request).toHaveBeenCalledTimes(2);
  });

  it("isolates cached responses by governed request purpose", async () => {
    const transport = createTransport();
    const broker = createCrawlRequestBroker({
      acquireGlobalPermit: acquirePermit(),
      acquireStorefrontPermit: acquirePermit(),
      resolveHostname: resolvePublicHostname(),
      transport,
    });
    const url = "https://fixture.store/catalog";

    await broker.requestHttp({
      integration: fixtureIntegration,
      purpose: "image",
      url,
    });
    await broker.requestHttp({
      integration: fixtureIntegration,
      purpose: "document",
      url,
    });

    expect(transport.request).toHaveBeenCalledTimes(2);
  });

  it("bounds the response cache and evicts its oldest entry", async () => {
    const transport = createTransport();
    const broker = createCrawlRequestBroker({
      acquireGlobalPermit: acquirePermit(),
      acquireStorefrontPermit: acquirePermit(),
      maximumCacheEntries: 2,
      resolveHostname: resolvePublicHostname(),
      transport,
    });
    const request = (name: string) =>
      broker.requestHttp({
        integration: fixtureIntegration,
        purpose: "document" as const,
        url: `https://fixture.store/catalog?cursor=${name}`,
      });

    await request("one");
    await request("two");
    await request("three");
    await request("one");

    expect(transport.request).toHaveBeenCalledTimes(4);
  });

  it("bounds the response cache by retained body bytes", async () => {
    const transport = createTransport();
    transport.request.mockResolvedValue(response({ body: "1234" }));
    const broker = createCrawlRequestBroker({
      acquireGlobalPermit: acquirePermit(),
      acquireStorefrontPermit: acquirePermit(),
      maximumCacheBytes: 5,
      maximumCacheEntries: 10,
      resolveHostname: resolvePublicHostname(),
      transport,
    });
    const request = (name: string) =>
      broker.requestHttp({
        integration: fixtureIntegration,
        purpose: "image" as const,
        url: `https://fixture.store/images/${name}.jpg`,
      });

    await request("one");
    await request("two");
    await request("one");

    expect(transport.request).toHaveBeenCalledTimes(3);
  });

  it("accounts for concurrent cache writes that replace the same key", async () => {
    const completions: Array<(value: ReturnType<typeof response>) => void> = [];
    const transport = createTransport();
    transport.request
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            completions.push(resolve);
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            completions.push(resolve);
          }),
      )
      .mockResolvedValue(response({ body: "1234" }));
    const broker = createCrawlRequestBroker({
      acquireGlobalPermit: acquirePermit(),
      acquireStorefrontPermit: acquirePermit(),
      maximumCacheBytes: 8,
      maximumCacheEntries: 10,
      resolveHostname: resolvePublicHostname(),
      transport,
    });
    const request = (name: string) =>
      broker.requestHttp({
        integration: fixtureIntegration,
        purpose: "image" as const,
        url: `https://fixture.store/images/${name}.jpg`,
      });

    const first = request("same");
    const second = request("same");
    await vi.waitFor(() => {
      expect(transport.request).toHaveBeenCalledTimes(2);
    });
    completions.forEach((complete) => complete(response({ body: "1234" })));
    await Promise.all([first, second]);
    await request("other");
    await request("same");

    expect(transport.request).toHaveBeenCalledTimes(3);
  });

  it("stops materializing a streamed response at the configured byte limit", async () => {
    const request = vi.fn<BrokerTransport["request"]>(async () => ({
      body: {
        async *[Symbol.asyncIterator]() {
          yield new Uint8Array(3);
          yield new Uint8Array(3);
        },
      },
      headers: {},
      status: 200,
    }));
    const broker = createCrawlRequestBroker({
      acquireGlobalPermit: acquirePermit(),
      acquireStorefrontPermit: acquirePermit(),
      maximumDocumentResponseBytes: 5,
      resolveHostname: resolvePublicHostname(),
      transport: { request },
    });

    await expect(
      broker.requestHttp({
        integration: fixtureIntegration,
        purpose: "document",
        url: "https://fixture.store/catalog",
      }),
    ).rejects.toBeInstanceOf(BrokerAccessError);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ maximumResponseBytes: 5 }),
    );
  });

  it("records Retry-After before rejecting an oversized error body", async () => {
    const transport = createTransport();
    transport.request.mockResolvedValue(
      response({
        body: "123456",
        headers: { "retry-after": "120" },
        status: 503,
      }),
    );
    const broker = createCrawlRequestBroker({
      acquireGlobalPermit: acquirePermit(),
      acquireStorefrontPermit: acquirePermit(),
      maximumDocumentResponseBytes: 5,
      now: () => new Date("2026-07-24T17:00:00.000Z"),
      resolveHostname: resolvePublicHostname(),
      transport,
    });

    await expect(
      broker.requestHttp({
        integration: fixtureIntegration,
        purpose: "document",
        url: "https://fixture.store/catalog",
      }),
    ).rejects.toMatchObject({
      retryAt: new Date("2026-07-24T17:02:00.000Z"),
    });
    await expect(
      broker.requestHttp({
        integration: fixtureIntegration,
        purpose: "document",
        url: "https://fixture.store/catalog?page=2",
      }),
    ).rejects.toBeInstanceOf(BrokerBackoffError);
    expect(transport.request).toHaveBeenCalledTimes(1);
  });

  it.each([
    "http://127.0.0.1/catalog",
    "http://169.254.169.254/latest/meta-data",
    "https://[::1]/catalog",
    "https://unapproved.example/catalog",
  ])("rejects forbidden target %s", async (url) => {
    const transport = createTransport();
    const broker = createCrawlRequestBroker({
      acquireGlobalPermit: acquirePermit(),
      acquireStorefrontPermit: acquirePermit(),
      resolveHostname: resolvePublicHostname(),
      transport,
    });

    await expect(
      broker.requestHttp({
        integration: fixtureIntegration,
        purpose: "document",
        url,
      }),
    ).rejects.toBeInstanceOf(BrokerAccessError);
    expect(transport.request).not.toHaveBeenCalled();
  });

  it.each([
    "::ffff:7f00:1",
    "0:0:0:0:0:0:0:1",
    "192.0.0.1",
    "198.18.0.1",
    "fec0::1",
  ])("rejects non-global DNS answer %s", async (address) => {
    const transport = createTransport();
    const broker = createCrawlRequestBroker({
      acquireGlobalPermit: acquirePermit(),
      acquireStorefrontPermit: acquirePermit(),
      resolveHostname: vi
        .fn<BrokerOptions["resolveHostname"]>()
        .mockResolvedValue([address]),
      transport,
    });

    await expect(
      broker.requestHttp({
        integration: fixtureIntegration,
        purpose: "document",
        url: "https://fixture.store/catalog",
      }),
    ).rejects.toBeInstanceOf(BrokerAccessError);
    expect(transport.request).not.toHaveBeenCalled();
  });

  it("revalidates redirect targets and DNS answers", async () => {
    const transport = createTransport();
    transport.request.mockResolvedValueOnce(
      response({
        headers: { Location: "https://linked.fixture.store/catalog" },
        status: 302,
      }),
    );
    const broker = createCrawlRequestBroker({
      acquireGlobalPermit: acquirePermit(),
      acquireStorefrontPermit: acquirePermit(),
      resolveHostname: vi
        .fn<BrokerOptions["resolveHostname"]>()
        .mockResolvedValueOnce(["8.8.8.8"])
        .mockResolvedValueOnce(["10.0.0.2"]),
      transport,
    });

    await expect(
      broker.requestHttp({
        integration: fixtureIntegration,
        purpose: "document",
        url: "https://fixture.store/catalog",
      }),
    ).rejects.toBeInstanceOf(BrokerAccessError);
    expect(transport.request).toHaveBeenCalledTimes(1);
  });

  it("enforces server backoff before acquiring another permit", async () => {
    const transport = createTransport();
    transport.request.mockResolvedValueOnce(
      response({ headers: { "Retry-After": "120" }, status: 429 }),
    );
    const acquire = acquirePermit();
    const broker = createCrawlRequestBroker({
      acquireGlobalPermit: acquire,
      acquireStorefrontPermit: acquire,
      now: () => new Date("2026-07-24T17:00:00.000Z"),
      resolveHostname: resolvePublicHostname(),
      transport,
    });

    await broker.requestHttp({
      integration: fixtureIntegration,
      purpose: "document",
      url: "https://fixture.store/catalog",
    });

    await expect(
      broker.requestHttp({
        integration: fixtureIntegration,
        purpose: "document",
        url: "https://fixture.store/catalog?page=2",
      }),
    ).rejects.toBeInstanceOf(BrokerBackoffError);
    expect(acquire).toHaveBeenCalledTimes(2);
  });

  it("ignores invalid oversized Retry-After values without poisoning later backoff", async () => {
    const transport = createTransport();
    transport.request
      .mockResolvedValueOnce(
        response({
          headers: { "retry-after": String(Number.MAX_SAFE_INTEGER) },
          status: 429,
        }),
      )
      .mockResolvedValueOnce(
        response({ headers: { "retry-after": "120" }, status: 429 }),
      );
    const broker = createCrawlRequestBroker({
      acquireGlobalPermit: acquirePermit(),
      acquireStorefrontPermit: acquirePermit(),
      now: () => new Date("2026-07-24T17:00:00.000Z"),
      resolveHostname: resolvePublicHostname(),
      transport,
    });

    await broker.requestHttp({
      integration: fixtureIntegration,
      purpose: "document",
      url: "https://fixture.store/catalog",
    });
    await broker.requestHttp({
      integration: fixtureIntegration,
      purpose: "document",
      url: "https://fixture.store/catalog?page=2",
    });

    await expect(
      broker.requestHttp({
        integration: fixtureIntegration,
        purpose: "document",
        url: "https://fixture.store/catalog?page=3",
      }),
    ).rejects.toMatchObject({
      retryAt: new Date("2026-07-24T17:02:00.000Z"),
    });
  });

  it("preserves the longest backoff from concurrent responses", async () => {
    let completeLongBackoff:
      ((value: ReturnType<typeof response>) => void) | undefined;
    let completeShortBackoff:
      ((value: ReturnType<typeof response>) => void) | undefined;
    let currentTime = new Date("2026-07-24T17:00:00.000Z");
    const transport = createTransport();
    transport.request
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            completeLongBackoff = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            completeShortBackoff = resolve;
          }),
      );
    const broker = createCrawlRequestBroker({
      acquireGlobalPermit: acquirePermit(),
      acquireStorefrontPermit: acquirePermit(),
      now: () => currentTime,
      resolveHostname: resolvePublicHostname(),
      transport,
    });

    const longBackoff = broker.requestHttp({
      integration: fixtureIntegration,
      purpose: "document",
      url: "https://fixture.store/catalog?request=long",
    });
    const shortBackoff = broker.requestHttp({
      integration: fixtureIntegration,
      purpose: "document",
      url: "https://fixture.store/catalog?request=short",
    });
    await vi.waitFor(() => {
      expect(transport.request).toHaveBeenCalledTimes(2);
    });
    completeLongBackoff?.(
      response({
        headers: { "retry-after": "Fri, 24 Jul 2026 17:10:00 GMT" },
        status: 503,
      }),
    );
    await longBackoff;
    completeShortBackoff?.(
      response({
        headers: { "retry-after": "Fri, 24 Jul 2026 17:05:00 GMT" },
        status: 429,
      }),
    );
    await shortBackoff;
    currentTime = new Date("2026-07-24T17:06:00.000Z");

    await expect(
      broker.requestHttp({
        integration: fixtureIntegration,
        purpose: "document",
        url: "https://fixture.store/catalog?request=after",
      }),
    ).rejects.toMatchObject({
      retryAt: new Date("2026-07-24T17:10:00.000Z"),
    });
  });

  it("rechecks backoff after a queued request acquires its permit", async () => {
    let completeFirstResponse:
      ((value: ReturnType<typeof response>) => void) | undefined;
    let grantSecondPermit:
      ((value: { release: () => void }) => void) | undefined;
    const transport = createTransport();
    transport.request.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          completeFirstResponse = resolve;
        }),
    );
    const acquireStorefrontPermit = vi
      .fn<BrokerOptions["acquireStorefrontPermit"]>()
      .mockResolvedValueOnce({ release: vi.fn<() => void>() })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            grantSecondPermit = resolve;
          }),
      );
    const broker = createCrawlRequestBroker({
      acquireGlobalPermit: acquirePermit(),
      acquireStorefrontPermit,
      now: () => new Date("2026-07-24T17:00:00.000Z"),
      resolveHostname: resolvePublicHostname(),
      transport,
    });

    const first = broker.requestHttp({
      integration: fixtureIntegration,
      purpose: "document",
      url: "https://fixture.store/catalog",
    });
    await vi.waitFor(() => {
      expect(transport.request).toHaveBeenCalledTimes(1);
    });
    const queued = broker.requestHttp({
      integration: fixtureIntegration,
      purpose: "document",
      url: "https://fixture.store/catalog?page=2",
    });
    await vi.waitFor(() => {
      expect(acquireStorefrontPermit).toHaveBeenCalledTimes(2);
    });
    completeFirstResponse?.(
      response({ headers: { "retry-after": "120" }, status: 429 }),
    );
    await first;
    grantSecondPermit?.({ release: vi.fn<() => void>() });

    await expect(queued).rejects.toBeInstanceOf(BrokerBackoffError);
    expect(transport.request).toHaveBeenCalledTimes(1);
  });

  it("requires a scoped Browser Access Grant", async () => {
    const visit = vi.fn<BrowserVisit>().mockResolvedValue({
      body: "<html></html>",
      finalUrl: "https://fixture.store/catalog",
      headers: {},
      status: 200,
    });
    const broker = createCrawlRequestBroker({
      acquireGlobalPermit: acquirePermit(),
      acquireStorefrontPermit: acquirePermit(),
      browser: { visit },
      resolveHostname: resolvePublicHostname(),
      transport: createTransport(),
    });

    await expect(
      broker.requestBrowser({
        integration: fixtureIntegration,
        url: "https://fixture.store/catalog",
      }),
    ).rejects.toBeInstanceOf(BrokerAccessError);
    expect(visit).not.toHaveBeenCalled();
  });

  it("governs granted browser routes and releases both permits", async () => {
    const releaseGlobal = vi.fn<() => void>();
    const releaseStorefront = vi.fn<() => void>();
    const visit = vi.fn<BrowserVisit>(
      async ({ authorizeRequest, initialResolvedAddresses }) => {
        expect(initialResolvedAddresses).toEqual(["8.8.8.8"]);
        await expect(
          authorizeRequest({
            method: "GET",
            url: "https://fixture.store/catalog/page-2",
          }),
        ).resolves.toEqual(["8.8.8.8"]);
        await expect(
          authorizeRequest({
            method: "GET",
            url: "https://fixture.store/catalog/%2e%2e%2faccount",
          }),
        ).rejects.toBeInstanceOf(BrokerAccessError);
        await expect(
          authorizeRequest({
            method: "POST",
            url: "https://fixture.store/catalog/page-2",
          }),
        ).rejects.toBeInstanceOf(BrokerAccessError);
        return {
          body: "<html></html>",
          finalUrl: "https://fixture.store/catalog",
          headers: {},
          status: 200,
        };
      },
    );

    const broker = createCrawlRequestBroker({
      acquireGlobalPermit: vi
        .fn<BrokerOptions["acquireGlobalPermit"]>()
        .mockResolvedValue({ release: releaseGlobal }),
      acquireStorefrontPermit: vi
        .fn<BrokerOptions["acquireStorefrontPermit"]>()
        .mockResolvedValue({ release: releaseStorefront }),
      browser: { visit },
      resolveHostname: resolvePublicHostname(),
      transport: createTransport(),
    });
    const grantedIntegration = {
      ...fixtureIntegration,
      browserAccessGrant: {
        approvedOrigins: ["https://fixture.store"],
        routePrefixes: ["/catalog"],
        schemaVersion: 1,
      },
    } satisfies StorefrontIntegration;

    await expect(
      broker.requestBrowser({
        integration: grantedIntegration,
        url: "https://fixture.store/catalog",
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        finalUrl: "https://fixture.store/catalog",
      }),
    );
    expect(visit).toHaveBeenCalledTimes(1);
    expect(visit).toHaveBeenCalledWith(
      expect.objectContaining({
        authorizeRequest: expect.any(Function),
        initialResolvedAddresses: ["8.8.8.8"],
      }),
    );
    expect(releaseGlobal).toHaveBeenCalledTimes(1);
    expect(releaseStorefront).toHaveBeenCalledTimes(1);
  });

  it("normalizes approved public IPv6 literals without DNS resolution", async () => {
    const transport = createTransport();
    const resolveHostname = resolvePublicHostname();
    const origin = "https://[2606:4700:4700::1111]";
    const broker = createCrawlRequestBroker({
      acquireGlobalPermit: acquirePermit(),
      acquireStorefrontPermit: acquirePermit(),
      resolveHostname,
      transport,
    });
    const integration = {
      ...fixtureIntegration,
      approvedOrigins: [origin],
      canonicalOrigin: origin,
      catalogRoots: [`${origin}/catalog`],
    } satisfies StorefrontIntegration;

    await broker.requestHttp({
      integration,
      purpose: "document",
      url: `${origin}/catalog`,
    });

    expect(resolveHostname).not.toHaveBeenCalled();
    expect(transport.request).toHaveBeenCalledWith(
      expect.objectContaining({
        resolvedAddresses: ["2606:4700:4700::1111"],
      }),
    );
  });

  it("rejects an approved private IPv6 literal without DNS resolution", async () => {
    const transport = createTransport();
    const resolveHostname = resolvePublicHostname();
    const origin = "https://[::1]";
    const broker = createCrawlRequestBroker({
      acquireGlobalPermit: acquirePermit(),
      acquireStorefrontPermit: acquirePermit(),
      resolveHostname,
      transport,
    });
    const integration = {
      ...fixtureIntegration,
      approvedOrigins: [origin],
      canonicalOrigin: origin,
      catalogRoots: [`${origin}/catalog`],
    } satisfies StorefrontIntegration;

    await expect(
      broker.requestHttp({
        integration,
        purpose: "document",
        url: `${origin}/catalog`,
      }),
    ).rejects.toBeInstanceOf(BrokerAccessError);
    expect(resolveHostname).not.toHaveBeenCalled();
    expect(transport.request).not.toHaveBeenCalled();
  });

  it("rejects syntactically valid IPv6 outside global unicast space", async () => {
    const transport = createTransport();
    const broker = createCrawlRequestBroker({
      acquireGlobalPermit: acquirePermit(),
      acquireStorefrontPermit: acquirePermit(),
      resolveHostname: vi
        .fn<BrokerOptions["resolveHostname"]>()
        .mockResolvedValue(["4000::1"]),
      transport,
    });

    await expect(
      broker.requestHttp({
        integration: fixtureIntegration,
        purpose: "document",
        url: "https://fixture.store/catalog",
      }),
    ).rejects.toBeInstanceOf(BrokerAccessError);
    expect(transport.request).not.toHaveBeenCalled();
  });

  it("requires authorization before every browser navigation", async () => {
    const visit = vi.fn<BrowserVisit>(async ({ authorizeRequest }) => {
      await authorizeRequest({
        method: "GET",
        url: "https://fixture.store/account",
      });
      throw new Error("unreachable");
    });
    const broker = createCrawlRequestBroker({
      acquireGlobalPermit: acquirePermit(),
      acquireStorefrontPermit: acquirePermit(),
      browser: { visit },
      resolveHostname: resolvePublicHostname(),
      transport: createTransport(),
    });
    const grantedIntegration = {
      ...fixtureIntegration,
      browserAccessGrant: {
        approvedOrigins: ["https://fixture.store"],
        routePrefixes: ["/catalog"],
        schemaVersion: 1,
      },
    } satisfies StorefrontIntegration;

    await expect(
      broker.requestBrowser({
        integration: grantedIntegration,
        url: "https://fixture.store/catalog",
      }),
    ).rejects.toBeInstanceOf(BrokerAccessError);
  });

  it("shares browser server backoff with later Broker work", async () => {
    const visit = vi.fn<BrowserVisit>().mockResolvedValue({
      body: "<html></html>",
      finalUrl: "https://fixture.store/catalog",
      headers: { "Retry-After": "120" },
      status: 429,
    });
    const broker = createCrawlRequestBroker({
      acquireGlobalPermit: acquirePermit(),
      acquireStorefrontPermit: acquirePermit(),
      browser: { visit },
      now: () => new Date("2026-07-24T17:00:00.000Z"),
      resolveHostname: resolvePublicHostname(),
      transport: createTransport(),
    });
    const grantedIntegration = {
      ...fixtureIntegration,
      browserAccessGrant: {
        approvedOrigins: ["https://fixture.store"],
        routePrefixes: ["/catalog"],
        schemaVersion: 1,
      },
    } satisfies StorefrontIntegration;

    await broker.requestBrowser({
      integration: grantedIntegration,
      url: "https://fixture.store/catalog",
    });
    await expect(
      broker.requestHttp({
        integration: grantedIntegration,
        purpose: "document",
        url: "https://fixture.store/catalog?page=2",
      }),
    ).rejects.toBeInstanceOf(BrokerBackoffError);
  });

  it("rechecks backoff after a queued browser visit acquires its permit", async () => {
    let completeFirstResponse:
      ((value: ReturnType<typeof response>) => void) | undefined;
    let grantBrowserPermit:
      ((value: { release: () => void }) => void) | undefined;
    const transport = createTransport();
    transport.request.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          completeFirstResponse = resolve;
        }),
    );
    const acquireStorefrontPermit = vi
      .fn<BrokerOptions["acquireStorefrontPermit"]>()
      .mockResolvedValueOnce({ release: vi.fn<() => void>() })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            grantBrowserPermit = resolve;
          }),
      );
    const visit = vi.fn<BrowserVisit>();
    const broker = createCrawlRequestBroker({
      acquireGlobalPermit: acquirePermit(),
      acquireStorefrontPermit,
      browser: { visit },
      now: () => new Date("2026-07-24T17:00:00.000Z"),
      resolveHostname: resolvePublicHostname(),
      transport,
    });
    const grantedIntegration = {
      ...fixtureIntegration,
      browserAccessGrant: {
        approvedOrigins: ["https://fixture.store"],
        routePrefixes: ["/catalog"],
        schemaVersion: 1,
      },
    } satisfies StorefrontIntegration;

    const first = broker.requestHttp({
      integration: grantedIntegration,
      purpose: "document",
      url: "https://fixture.store/catalog",
    });
    await vi.waitFor(() => {
      expect(transport.request).toHaveBeenCalledTimes(1);
    });
    const queued = broker.requestBrowser({
      integration: grantedIntegration,
      url: "https://fixture.store/catalog/page-2",
    });
    await vi.waitFor(() => {
      expect(acquireStorefrontPermit).toHaveBeenCalledTimes(2);
    });
    completeFirstResponse?.(
      response({ headers: { "retry-after": "120" }, status: 429 }),
    );
    await first;
    grantBrowserPermit?.({ release: vi.fn<() => void>() });

    await expect(queued).rejects.toBeInstanceOf(BrokerBackoffError);
    expect(visit).not.toHaveBeenCalled();
  });
});
