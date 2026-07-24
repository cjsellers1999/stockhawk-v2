import { Buffer } from "node:buffer";

import type { StorefrontIntegration } from "@stockhawk/contracts";

export type BrokerTransportResponse = {
  body: AsyncIterable<Uint8Array>;
  headers: Record<string, string>;
  status: number;
};

type BufferedBrokerTransportResponse = Omit<BrokerTransportResponse, "body"> & {
  body: Uint8Array;
};

export type BrokerTransport = {
  request: (input: {
    maximumResponseBytes: number;
    method: "GET" | "HEAD";
    resolvedAddresses: string[];
    signal: AbortSignal;
    url: string;
  }) => Promise<BrokerTransportResponse>;
};

export type BrokerBrowser = {
  // Broker-owned gateways must pin the supplied addresses and authorize every
  // redirect, subresource, and navigation before issuing its browser request.
  visit: (input: {
    authorizeRequest: (input: {
      method: string;
      url: string;
    }) => Promise<string[]>;
    initialResolvedAddresses: string[];
    maximumResponseBytes: number;
    signal: AbortSignal;
    url: string;
  }) => Promise<{
    body: string;
    finalUrl: string;
    headers: Record<string, string>;
    status: number;
  }>;
};

type AcquiredPermit = {
  release: () => void;
};

type AcquirePermit = (input: {
  signal: AbortSignal;
  storefrontIdentity: string;
}) => Promise<AcquiredPermit | void>;

type ResolveHostname = (
  hostname: string,
  signal: AbortSignal,
) => Promise<string[]>;

export type BrokerHttpResponse = BufferedBrokerTransportResponse & {
  cacheOutcome: "hit" | "miss";
  finalUrl: string;
  receivedAt: string;
  schedulerWaitMilliseconds: number;
};

type CreateCrawlRequestBrokerOptions = {
  acquireGlobalPermit: AcquirePermit;
  acquireStorefrontPermit: AcquirePermit;
  browser?: BrokerBrowser;
  cacheTimeToLiveMilliseconds?: number;
  maximumBrowserResponseBytes?: number;
  maximumCacheBytes?: number;
  maximumCacheEntries?: number;
  maximumDocumentResponseBytes?: number;
  maximumImageResponseBytes?: number;
  maximumRedirects?: number;
  now?: () => Date;
  resolveHostname: ResolveHostname;
  transport: BrokerTransport;
};

export class BrokerAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BrokerAccessError";
  }
}

export class BrokerBackoffError extends Error {
  readonly retryAt: Date;

  constructor(retryAt: Date) {
    super(`Storefront access is backed off until ${retryAt.toISOString()}`);
    this.name = "BrokerBackoffError";
    this.retryAt = retryAt;
  }
}

const parseIpv4 = (address: string) => {
  if (!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(address)) {
    return null;
  }
  const octets = address.split(".").map((octet) => Number.parseInt(octet, 10));
  return octets.every((octet) => octet >= 0 && octet <= 255) ? octets : null;
};

const ipv4Number = (address: string) =>
  (parseIpv4(address) ?? []).reduce(
    (value, octet) => ((value << 8) | octet) >>> 0,
    0,
  );

const isInIpv4Prefix = (
  address: string,
  network: string,
  prefixLength: number,
) => {
  const mask =
    prefixLength === 0 ? 0 : (0xffff_ffff << (32 - prefixLength)) >>> 0;
  return (ipv4Number(address) & mask) === (ipv4Number(network) & mask);
};

const forbiddenIpv4Prefixes = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const;

const isForbiddenIpv4 = (address: string) => {
  return forbiddenIpv4Prefixes.some(([network, prefixLength]) =>
    isInIpv4Prefix(address, network, prefixLength),
  );
};

const parseIpv6Groups = (address: string) => {
  let normalized = address.toLowerCase().split("%", 1)[0] ?? "";
  const dottedIpv4 = /(\d+\.\d+\.\d+\.\d+)$/.exec(normalized)?.[1];
  if (dottedIpv4 !== undefined) {
    const octets = parseIpv4(dottedIpv4);
    if (
      octets === null ||
      octets.length !== 4 ||
      octets.some((octet) => !Number.isFinite(octet))
    ) {
      return null;
    }
    const high = ((octets[0] ?? 0) << 8) | (octets[1] ?? 0);
    const low = ((octets[2] ?? 0) << 8) | (octets[3] ?? 0);
    normalized = normalized.replace(
      dottedIpv4,
      `${high.toString(16)}:${low.toString(16)}`,
    );
  }
  const halves = normalized.split("::");
  if (halves.length > 2) {
    return null;
  }
  const head = (halves[0] ?? "").split(":").filter(Boolean);
  const tail = (halves[1] ?? "").split(":").filter(Boolean);
  const missing = halves.length === 2 ? 8 - head.length - tail.length : 0;
  if (missing < 0) {
    return null;
  }
  const groups = [
    ...head,
    ...Array.from({ length: missing }, () => "0"),
    ...tail,
  ].map((group) => Number.parseInt(group, 16));
  return groups.length === 8 &&
    groups.every(
      (group) => Number.isFinite(group) && group >= 0 && group <= 0xffff,
    )
    ? groups
    : null;
};

const isForbiddenIpv6 = (address: string) => {
  const groups = parseIpv6Groups(address);
  if (groups === null) {
    return true;
  }
  const isUnspecified = groups.every((group) => group === 0);
  const isLoopback =
    groups.slice(0, 7).every((group) => group === 0) && groups[7] === 1;
  const isInPrefix = (prefix: number[], prefixLength: number) => {
    const normalizedPrefix = Array.from(
      { length: 8 },
      (_, index) => prefix[index] ?? 0,
    );
    const wholeGroups = Math.floor(prefixLength / 16);
    const remainingBits = prefixLength % 16;
    if (
      groups
        .slice(0, wholeGroups)
        .some((group, index) => group !== normalizedPrefix[index])
    ) {
      return false;
    }
    if (remainingBits === 0) {
      return true;
    }
    const mask = (0xffff << (16 - remainingBits)) & 0xffff;
    return (
      ((groups[wholeGroups] ?? 0) & mask) ===
      ((normalizedPrefix[wholeGroups] ?? 0) & mask)
    );
  };
  const isSpecialUse = [
    { prefix: [0x0064, 0xff9b], prefixLength: 96 },
    { prefix: [0x0064, 0xff9b, 0x0001], prefixLength: 48 },
    { prefix: [0x0100], prefixLength: 64 },
    { prefix: [0x2001], prefixLength: 23 },
    { prefix: [0x2001, 0x0db8], prefixLength: 32 },
    { prefix: [0x2002], prefixLength: 16 },
    { prefix: [0x3fff], prefixLength: 20 },
    { prefix: [0x5f00], prefixLength: 16 },
    { prefix: [0xfc00], prefixLength: 7 },
    { prefix: [0xfe80], prefixLength: 10 },
    { prefix: [0xfec0], prefixLength: 10 },
    { prefix: [0xff00], prefixLength: 8 },
  ].some(({ prefix, prefixLength }) => isInPrefix(prefix, prefixLength));
  if (isUnspecified || isLoopback || isSpecialUse) {
    return true;
  }
  const isMappedIpv4 =
    groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff;
  const isCompatibleIpv4 = groups.slice(0, 6).every((group) => group === 0);
  if (isCompatibleIpv4) {
    return true;
  }
  if (!isMappedIpv4) {
    return !isInPrefix([0x2000], 3);
  }
  const high = groups[6] ?? 0;
  const low = groups[7] ?? 0;
  return isForbiddenIpv4(
    [high >> 8, high & 0xff, low >> 8, low & 0xff].join("."),
  );
};

const isForbiddenIpAddress = (address: string) => {
  if (parseIpv4(address) !== null) {
    return isForbiddenIpv4(address);
  }
  if (parseIpv6Groups(address) !== null) {
    return isForbiddenIpv6(address);
  }
  return true;
};

const cloneResponse = (
  response: BufferedBrokerTransportResponse,
): BufferedBrokerTransportResponse => ({
  body: response.body.slice(),
  headers: { ...response.headers },
  status: response.status,
});

const normalizeHeaders = (headers: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]),
  );

const materializeBody = async (
  body: AsyncIterable<Uint8Array>,
  maximumResponseBytes: number,
) => {
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  for await (const chunk of body) {
    byteLength += chunk.byteLength;
    if (byteLength > maximumResponseBytes) {
      throw new BrokerAccessError(
        "Broker response body exceeded its byte limit",
      );
    }
    chunks.push(chunk);
  }
  const materialized = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    materialized.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return materialized;
};

const retryAtFrom = ({
  now,
  retryAfter,
}: {
  now: Date;
  retryAfter: string | undefined;
}) => {
  if (retryAfter === undefined) {
    return null;
  }
  const seconds = /^\d+$/.test(retryAfter) ? Number(retryAfter) : Number.NaN;
  if (Number.isSafeInteger(seconds) && seconds >= 0) {
    const parsed = new Date(now.getTime() + seconds * 1_000);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(retryAfter);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isWithinRoutePrefix = (pathname: string, prefix: string) =>
  pathname === prefix ||
  pathname.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`);

const hasCanonicalRoutePath = (pathname: string) => {
  if (/%(?:25|2e|2f|5c)/i.test(pathname)) {
    return false;
  }
  try {
    const decoded = decodeURIComponent(pathname);
    return (
      !decoded.includes("\\") &&
      !decoded.split("/").some((segment) => segment === "." || segment === "..")
    );
  } catch {
    return false;
  }
};

const cacheLifetimeFor = ({
  defaultLifetimeMilliseconds,
  headers,
  now,
}: {
  defaultLifetimeMilliseconds: number;
  headers: Record<string, string>;
  now: Date;
}) => {
  const directives =
    headers["cache-control"]
      ?.split(",")
      .map((directive) => directive.trim().toLowerCase()) ?? [];
  if (
    headers.pragma?.toLowerCase().includes("no-cache") === true ||
    directives.some((directive) =>
      /^(?:no-cache|no-store|private)(?:=|$)/.test(directive),
    ) ||
    headers.vary?.trim() === "*"
  ) {
    return 0;
  }
  let lifetime = defaultLifetimeMilliseconds;
  const sharedMaximumAge = directives.find((directive) =>
    directive.startsWith("s-maxage="),
  );
  const maximumAge =
    sharedMaximumAge ??
    directives.find((directive) => directive.startsWith("max-age="));
  if (maximumAge !== undefined) {
    const seconds = Number(maximumAge.slice(maximumAge.indexOf("=") + 1));
    if (!Number.isSafeInteger(seconds) || seconds < 0) {
      return 0;
    }
    const ageSeconds = Number(headers.age ?? "0");
    const boundedAgeSeconds =
      Number.isSafeInteger(ageSeconds) && ageSeconds >= 0 ? ageSeconds : 0;
    lifetime = Math.min(
      lifetime,
      Math.max(0, seconds - boundedAgeSeconds) * 1_000,
    );
  }
  if (headers.expires !== undefined) {
    const expiresAt = new Date(headers.expires).getTime();
    if (!Number.isNaN(expiresAt)) {
      lifetime = Math.min(lifetime, Math.max(0, expiresAt - now.getTime()));
    }
  }
  return lifetime;
};

export const createCrawlRequestBroker = ({
  acquireGlobalPermit,
  acquireStorefrontPermit,
  browser,
  cacheTimeToLiveMilliseconds = 60_000,
  maximumBrowserResponseBytes = 4_000_000,
  maximumCacheBytes = 32_000_000,
  maximumCacheEntries = 256,
  maximumDocumentResponseBytes = 4_000_000,
  maximumImageResponseBytes = 10_000_000,
  maximumRedirects = 5,
  now = () => new Date(),
  resolveHostname,
  transport,
}: CreateCrawlRequestBrokerOptions) => {
  const backoffByStorefront = new Map<string, Date>();
  const cache = new Map<
    string,
    {
      expiresAt: number;
      finalUrl: string;
      receivedAt: string;
      response: BufferedBrokerTransportResponse;
    }
  >();
  let cacheBytes = 0;

  const pruneExpiredCache = () => {
    const currentTime = now().getTime();
    for (const [key, cached] of cache) {
      if (cached.expiresAt <= currentTime) {
        cacheBytes -= cached.response.body.byteLength;
        cache.delete(key);
      }
    }
  };

  const makeCacheRoom = (incomingBytes: number) => {
    while (
      cache.size >= maximumCacheEntries ||
      cacheBytes + incomingBytes > maximumCacheBytes
    ) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }
      cacheBytes -= cache.get(oldestKey)?.response.body.byteLength ?? 0;
      cache.delete(oldestKey);
    }
  };

  const validateTarget = async ({
    integration,
    signal,
    url,
  }: {
    integration: StorefrontIntegration;
    signal: AbortSignal;
    url: URL;
  }) => {
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new BrokerAccessError("Broker permits only HTTP source access");
    }
    if (url.username !== "" || url.password !== "") {
      throw new BrokerAccessError("Broker target cannot contain credentials");
    }
    if (!integration.approvedOrigins.includes(url.origin)) {
      throw new BrokerAccessError(
        `Origin ${url.origin} is not approved by the Storefront Integration`,
      );
    }
    const hostname =
      url.hostname.startsWith("[") && url.hostname.endsWith("]")
        ? url.hostname.slice(1, -1)
        : url.hostname;
    if (parseIpv4(hostname) !== null || parseIpv6Groups(hostname) !== null) {
      if (isForbiddenIpAddress(hostname)) {
        throw new BrokerAccessError("Broker rejected a private address");
      }
      return [hostname];
    }
    const addresses = await resolveHostname(hostname, signal);
    if (
      addresses.length === 0 ||
      addresses.some((address) => isForbiddenIpAddress(address))
    ) {
      throw new BrokerAccessError(
        "Broker rejected an empty or private DNS resolution",
      );
    }
    return addresses;
  };

  const assertNotBackedOff = (storefrontIdentity: string) => {
    const retryAt = backoffByStorefront.get(storefrontIdentity);
    if (retryAt !== undefined && retryAt.getTime() > now().getTime()) {
      throw new BrokerBackoffError(retryAt);
    }
  };

  const recordBackoff = (storefrontIdentity: string, retryAt: Date) => {
    const existingRetryAt = backoffByStorefront.get(storefrontIdentity);
    if (
      existingRetryAt === undefined ||
      existingRetryAt.getTime() < retryAt.getTime()
    ) {
      backoffByStorefront.set(storefrontIdentity, retryAt);
    }
  };

  const acquirePermits = async ({
    signal,
    storefrontIdentity,
  }: {
    signal: AbortSignal;
    storefrontIdentity: string;
  }) => {
    const input = { signal, storefrontIdentity };
    const globalPermit = await acquireGlobalPermit(input);
    try {
      const storefrontPermit = await acquireStorefrontPermit(input);
      return () => {
        storefrontPermit?.release();
        globalPermit?.release();
      };
    } catch (error) {
      globalPermit?.release();
      throw error;
    }
  };

  const requestHttp = async ({
    integration,
    method = "GET",
    purpose,
    signal = new AbortController().signal,
    url,
  }: {
    integration: StorefrontIntegration;
    method?: "GET" | "HEAD";
    purpose: "document" | "image";
    signal?: AbortSignal;
    url: string;
  }): Promise<BrokerHttpResponse> => {
    signal.throwIfAborted();
    const initialUrl = new URL(url);
    let prevalidatedAddresses: string[] | null = await validateTarget({
      integration,
      signal,
      url: initialUrl,
    });
    const cacheKey = `${integration.identity}:${purpose}:${method}:${initialUrl.toString()}`;
    pruneExpiredCache();
    const cached = cache.get(cacheKey);
    if (
      cacheTimeToLiveMilliseconds > 0 &&
      cached !== undefined &&
      cached.expiresAt > now().getTime()
    ) {
      await validateTarget({
        integration,
        signal,
        url: new URL(cached.finalUrl),
      });
      signal.throwIfAborted();
      return {
        ...cloneResponse(cached.response),
        cacheOutcome: "hit",
        finalUrl: cached.finalUrl,
        receivedAt: cached.receivedAt,
        schedulerWaitMilliseconds: 0,
      };
    }

    assertNotBackedOff(integration.storefrontIdentity);
    let currentUrl = initialUrl;
    let redirectCount = 0;
    let schedulerWaitMilliseconds = 0;

    while (true) {
      let resolvedAddresses = prevalidatedAddresses;
      if (resolvedAddresses === null) {
        // Redirect hops must be validated sequentially.
        // eslint-disable-next-line no-await-in-loop
        resolvedAddresses = await validateTarget({
          integration,
          signal,
          url: currentUrl,
        });
      }
      prevalidatedAddresses = null;
      const waitStartedAt = now().getTime();
      // Global and Storefront pacing is intentionally serialized per hop.
      // eslint-disable-next-line no-await-in-loop
      const releasePermits = await acquirePermits({
        signal,
        storefrontIdentity: integration.storefrontIdentity,
      });
      schedulerWaitMilliseconds += Math.max(0, now().getTime() - waitStartedAt);
      let response: BufferedBrokerTransportResponse;
      try {
        signal.throwIfAborted();
        assertNotBackedOff(integration.storefrontIdentity);
        // A later redirect cannot begin until this governed response arrives.
        // eslint-disable-next-line no-await-in-loop
        const streamedResponse = await transport.request({
          maximumResponseBytes:
            purpose === "document"
              ? maximumDocumentResponseBytes
              : maximumImageResponseBytes,
          method,
          resolvedAddresses,
          signal,
          url: currentUrl.toString(),
        });
        const normalizedHeaders = normalizeHeaders(streamedResponse.headers);
        let responseRetryAt: Date | null = null;
        if (
          streamedResponse.status === 429 ||
          streamedResponse.status === 503
        ) {
          responseRetryAt = retryAtFrom({
            now: now(),
            retryAfter: normalizedHeaders["retry-after"],
          });
          if (responseRetryAt !== null) {
            recordBackoff(integration.storefrontIdentity, responseRetryAt);
          }
        }
        let body: Uint8Array;
        try {
          // Redirect bodies are bounded and consumed before the next hop.
          // eslint-disable-next-line no-await-in-loop
          body = await materializeBody(
            streamedResponse.body,
            purpose === "document"
              ? maximumDocumentResponseBytes
              : maximumImageResponseBytes,
          );
        } catch (error) {
          if (responseRetryAt !== null) {
            throw new BrokerBackoffError(responseRetryAt);
          }
          throw error;
        }
        response = {
          ...streamedResponse,
          body,
          headers: normalizedHeaders,
        };
      } finally {
        releasePermits();
      }
      const location = response.headers.location;
      if (
        location !== undefined &&
        [301, 302, 303, 307, 308].includes(response.status)
      ) {
        if (redirectCount >= maximumRedirects) {
          throw new BrokerAccessError("Broker redirect limit exceeded");
        }
        redirectCount += 1;
        currentUrl = new URL(location, currentUrl);
        continue;
      }

      const responseReceivedAt = now();
      if (
        method === "GET" &&
        response.status >= 200 &&
        response.status < 300 &&
        cacheTimeToLiveMilliseconds > 0 &&
        maximumCacheBytes > 0 &&
        maximumCacheEntries > 0
      ) {
        const cacheLifetimeMilliseconds = cacheLifetimeFor({
          defaultLifetimeMilliseconds: cacheTimeToLiveMilliseconds,
          headers: response.headers,
          now: responseReceivedAt,
        });
        if (
          cacheLifetimeMilliseconds > 0 &&
          response.body.byteLength <= maximumCacheBytes
        ) {
          pruneExpiredCache();
          const existing = cache.get(cacheKey);
          if (existing !== undefined) {
            cacheBytes -= existing.response.body.byteLength;
            cache.delete(cacheKey);
          }
          makeCacheRoom(response.body.byteLength);
          cache.set(cacheKey, {
            expiresAt: responseReceivedAt.getTime() + cacheLifetimeMilliseconds,
            finalUrl: currentUrl.toString(),
            receivedAt: responseReceivedAt.toISOString(),
            response: cloneResponse(response),
          });
          cacheBytes += response.body.byteLength;
        }
      }
      return {
        ...cloneResponse(response),
        cacheOutcome: "miss",
        finalUrl: currentUrl.toString(),
        receivedAt: responseReceivedAt.toISOString(),
        schedulerWaitMilliseconds,
      };
    }
  };

  const requestBrowser = async ({
    integration,
    signal = new AbortController().signal,
    url,
  }: {
    integration: StorefrontIntegration;
    signal?: AbortSignal;
    url: string;
  }) => {
    const grant = integration.browserAccessGrant;
    const target = new URL(url);
    if (browser === undefined || grant === null) {
      throw new BrokerAccessError(
        "Browser access is not granted for this Storefront route",
      );
    }
    const authorizeRequest = async ({
      method,
      url: candidate,
    }: {
      method: string;
      url: string;
    }) => {
      const navigation = new URL(candidate);
      if (
        (method !== "GET" && method !== "HEAD") ||
        !grant.approvedOrigins.includes(navigation.origin) ||
        !hasCanonicalRoutePath(navigation.pathname) ||
        !grant.routePrefixes.some((prefix) =>
          isWithinRoutePrefix(navigation.pathname, prefix),
        )
      ) {
        throw new BrokerAccessError(
          "Browser access is not granted for this Storefront route",
        );
      }
      return validateTarget({ integration, signal, url: navigation });
    };
    const initialResolvedAddresses = await authorizeRequest({
      method: "GET",
      url: target.toString(),
    });
    assertNotBackedOff(integration.storefrontIdentity);
    const releasePermits = await acquirePermits({
      signal,
      storefrontIdentity: integration.storefrontIdentity,
    });
    let result: Awaited<ReturnType<BrokerBrowser["visit"]>>;
    try {
      signal.throwIfAborted();
      assertNotBackedOff(integration.storefrontIdentity);
      result = await browser.visit({
        authorizeRequest,
        initialResolvedAddresses,
        maximumResponseBytes: maximumBrowserResponseBytes,
        signal,
        url: target.toString(),
      });
      result = { ...result, headers: normalizeHeaders(result.headers) };
      await authorizeRequest({ method: "GET", url: result.finalUrl });
      if (result.status === 429 || result.status === 503) {
        const retryAt = retryAtFrom({
          now: now(),
          retryAfter: result.headers["retry-after"],
        });
        if (retryAt !== null) {
          recordBackoff(integration.storefrontIdentity, retryAt);
        }
      }
    } finally {
      releasePermits();
    }
    if (Buffer.byteLength(result.body) > maximumBrowserResponseBytes) {
      throw new BrokerAccessError(
        "Broker browser response body exceeded its byte limit",
      );
    }
    return result;
  };

  return { requestBrowser, requestHttp };
};

export type CrawlRequestBroker = ReturnType<typeof createCrawlRequestBroker>;
