import { createHash } from "node:crypto";

import type {
  HealthRefreshCommand,
  OfferSearchResponse,
  OwnerCommandReceipt,
} from "@stockhawk/contracts";
import { describe, expect, it, vi } from "vitest";

import { buildApp } from "./app.js";

const now = new Date("2026-07-23T17:00:00.000Z");
const sessionToken = "session_token_0123456789";
const csrfToken = "csrf_token_0123456789";
const sessionTokenHash = createHash("sha256")
  .update(sessionToken)
  .digest("hex");
const csrfTokenHash = createHash("sha256").update(csrfToken).digest("hex");
const origin = "https://stockhawk.test";
const idempotencyKey = "d8857fd0-b531-4a20-a08d-8f72727d4e0f";
const receipt: OwnerCommandReceipt = {
  command: {
    family: "refresh_health",
    idempotencyKey,
    schemaVersion: 1,
  },
  completedAt: null,
  failedAt: null,
  receiptId: "2e847567-14e4-49a9-a08c-92151429be8e",
  requestedAt: now.toISOString(),
  status: "queued",
};
const session = {
  csrfTokenHash,
  expiresAt: new Date("2026-07-24T05:00:00.000Z"),
  id: 42,
  sessionTokenHash,
};

const unsafeHeaders = {
  origin,
  "sec-fetch-site": "same-origin",
};

const appFixture = ({
  passwordAccepted = true,
}: {
  passwordAccepted?: boolean;
} = {}) => {
  const createAdminSession = vi
    .fn<(input: Omit<typeof session, "id">) => Promise<typeof session>>()
    .mockResolvedValue(session);
  const enqueueOwnerCommand = vi
    .fn<
      (input: {
        command: HealthRefreshCommand;
        requestedBySessionId: number;
      }) => Promise<OwnerCommandReceipt>
    >()
    .mockResolvedValue(receipt);
  const findActiveAdminSession = vi
    .fn<
      (input: {
        now: Date;
        sessionTokenHash: string;
      }) => Promise<typeof session | null>
    >()
    .mockResolvedValue(session);
  const findLatestOwnerCommand = vi
    .fn<() => Promise<OwnerCommandReceipt | null>>()
    .mockResolvedValue(receipt);
  const passwordVerifier = vi
    .fn<(password: string) => Promise<boolean>>()
    .mockResolvedValue(passwordAccepted);
  const tokens = [sessionToken, csrfToken];
  const app = buildApp({
    database: {
      check: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
      createAdminSession,
      enqueueOwnerCommand,
      findActiveAdminSession,
      findLatestOwnerCommand,
      searchOffers: vi
        .fn<() => Promise<OfferSearchResponse>>()
        .mockResolvedValue({ items: [], total: 0 }),
    },
    security: {
      allowedOrigins: new Set([origin]),
      cookieSecure: true,
      createOpaqueToken: () => {
        const token = tokens.shift();
        if (token === undefined) {
          throw new Error("No test token remains");
        }
        return token;
      },
      now: () => now,
      passwordVerifier,
      sessionTtlMs: 12 * 60 * 60 * 1_000,
    },
    webDistPath: undefined,
    worker: { check: vi.fn<() => Promise<boolean>>().mockResolvedValue(true) },
  });
  return {
    app,
    createAdminSession,
    enqueueOwnerCommand,
    findActiveAdminSession,
    findLatestOwnerCommand,
    passwordVerifier,
  };
};

const login = async (app: ReturnType<typeof buildApp>) =>
  app.inject({
    headers: unsafeHeaders,
    method: "POST",
    payload: { password: "owner password" },
    url: "/api/auth/login",
  });

const responseCookieHeader = (response: Awaited<ReturnType<typeof login>>) => {
  const setCookie = response.headers["set-cookie"];
  let values: string[] = [];
  if (Array.isArray(setCookie)) {
    values = setCookie;
  } else if (setCookie !== undefined) {
    values = [setCookie];
  }
  return values.map((value) => value.split(";", 1)[0]).join("; ");
};

describe("admin security boundary", () => {
  it("creates a durable session with hardened cookies and survives refresh", async () => {
    const fixture = appFixture();
    const response = await login(fixture.app);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      authenticated: true,
      expiresAt: session.expiresAt.toISOString(),
    });
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^stockhawk_session=.*HttpOnly.*SameSite=Strict.*Secure/,
        ),
        expect.stringMatching(/^stockhawk_csrf=.*SameSite=Strict.*Secure/),
      ]),
    );
    expect(fixture.createAdminSession).toHaveBeenCalledWith({
      csrfTokenHash,
      expiresAt: session.expiresAt,
      sessionTokenHash,
    });

    const refresh = await fixture.app.inject({
      headers: { cookie: responseCookieHeader(response) },
      method: "GET",
      url: "/api/auth/session",
    });

    expect(refresh.statusCode).toBe(200);
    expect(refresh.json()).toEqual({
      authenticated: true,
      expiresAt: session.expiresAt.toISOString(),
    });
    expect(fixture.findActiveAdminSession).toHaveBeenCalledWith({
      now,
      sessionTokenHash,
    });
    await fixture.app.close();
  });

  it("requires exact same-origin browser metadata and throttles failures", async () => {
    const fixture = appFixture({ passwordAccepted: false });
    const crossSite = await fixture.app.inject({
      headers: {
        origin: "https://attacker.test",
        "sec-fetch-site": "cross-site",
      },
      method: "POST",
      payload: { password: "guess" },
      url: "/api/auth/login",
    });
    expect(crossSite.statusCode).toBe(403);
    expect(fixture.passwordVerifier).not.toHaveBeenCalled();

    let releaseVerifier: ((accepted: boolean) => void) | undefined;
    const verifierGate = new Promise<boolean>((resolve) => {
      releaseVerifier = resolve;
    });
    fixture.passwordVerifier.mockReturnValue(verifierGate);
    const burstPromise = Promise.all(
      Array.from({ length: 6 }, () => login(fixture.app)),
    );
    await vi.waitFor(() => {
      expect(fixture.passwordVerifier.mock.calls.length).toBeGreaterThanOrEqual(
        5,
      );
    });
    releaseVerifier?.(false);
    const burst = await burstPromise;
    expect(
      burst.filter((response) => response.statusCode === 401),
    ).toHaveLength(5);
    expect(
      burst.filter((response) => response.statusCode === 429),
    ).toHaveLength(1);
    const throttledResponse = burst.find(
      (response) => response.statusCode === 429,
    );
    expect(throttledResponse?.headers["retry-after"]).toBe("900");

    const throttled = await login(fixture.app);
    expect(throttled.statusCode).toBe(429);
    expect(throttled.headers["retry-after"]).toBe("900");
    await fixture.app.close();
  });

  it("protects data and requires session-bound CSRF for commands", async () => {
    const fixture = appFixture();
    const anonymousOffers = await fixture.app.inject({
      method: "GET",
      url: "/api/offers",
    });
    expect(anonymousOffers.statusCode).toBe(401);

    const loginResponse = await login(fixture.app);
    const cookie = responseCookieHeader(loginResponse);
    const missingCsrf = await fixture.app.inject({
      headers: { ...unsafeHeaders, cookie },
      method: "POST",
      payload: receipt.command,
      url: "/api/owner-commands/refresh-health",
    });
    expect(missingCsrf.statusCode).toBe(403);
    expect(fixture.enqueueOwnerCommand).not.toHaveBeenCalled();

    const commandResponse = await fixture.app.inject({
      headers: {
        ...unsafeHeaders,
        cookie,
        "x-csrf-token": csrfToken,
      },
      method: "POST",
      payload: receipt.command,
      url: "/api/owner-commands/refresh-health",
    });
    expect(commandResponse.statusCode).toBe(202);
    expect(commandResponse.json()).toEqual(receipt);
    expect(fixture.enqueueOwnerCommand).toHaveBeenCalledWith({
      command: receipt.command,
      requestedBySessionId: session.id,
    });

    const latest = await fixture.app.inject({
      headers: { cookie },
      method: "GET",
      url: "/api/owner-commands/refresh-health",
    });
    expect(latest.statusCode).toBe(200);
    expect(latest.json()).toEqual({ receipt });
    await fixture.app.close();
  });
});
