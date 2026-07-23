import { existsSync } from "node:fs";

import fastifyStatic from "@fastify/static";
import {
  adminLoginCommandSchema,
  adminSessionResponseSchema,
  healthRefreshCommandSchema,
  latestOwnerCommandResponseSchema,
  offerSearchQuerySchema,
  offerSearchResponseSchema,
  ownerCommandReceiptSchema,
  readinessSchema,
  type HealthRefreshCommand,
  type OfferSearchQuery,
  type OfferSearchResponse,
  type OwnerCommandReceipt,
} from "@stockhawk/contracts";
import { OwnerCommandInFlightError } from "@stockhawk/database";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";

import {
  createLoginThrottle,
  csrfCookieName,
  hashOpaqueToken,
  parseCookies,
  serializeCookie,
  sessionCookieName,
  tokensMatch,
} from "./request-security.js";

type ReadinessCheck = { check: () => Promise<boolean> };
type OfferSearch = {
  searchOffers: (query: OfferSearchQuery) => Promise<OfferSearchResponse>;
};
type AdminSessionRecord = {
  csrfTokenHash: string;
  expiresAt: Date;
  id: number;
  sessionTokenHash: string;
};
type SecureDatabase = {
  createAdminSession: (
    session: Omit<AdminSessionRecord, "id">,
  ) => Promise<AdminSessionRecord>;
  enqueueOwnerCommand: (input: {
    command: HealthRefreshCommand;
    requestedBySessionId: number;
  }) => Promise<OwnerCommandReceipt>;
  findActiveAdminSession: (input: {
    now: Date;
    sessionTokenHash: string;
  }) => Promise<AdminSessionRecord | null>;
  findLatestOwnerCommand: () => Promise<OwnerCommandReceipt | null>;
};
type SecurityDependencies = {
  allowedOrigins: ReadonlySet<string>;
  cookieSecure: boolean;
  createOpaqueToken: () => string;
  now: () => Date;
  passwordVerifier: (password: string) => Promise<boolean>;
  sessionTtlMs: number;
  trustLoopbackProxy: boolean;
};

type AppDependencies = {
  database: OfferSearch & ReadinessCheck & SecureDatabase;
  security: SecurityDependencies;
  webDistPath: string | undefined;
  worker: ReadinessCheck;
};

const forbidden = (reply: FastifyReply) =>
  reply.code(403).send({
    error: "Forbidden",
    message: "Request security boundary rejected the request",
    statusCode: 403,
  });

const unauthorized = (reply: FastifyReply) =>
  reply.code(401).send({
    error: "Unauthorized",
    message: "Admin session required",
    statusCode: 401,
  });

export const isBrowserNavigationRequest = (
  method: string,
  originalUrl: string,
  accept: string | undefined,
) => {
  const [pathname] = originalUrl.split("?", 1);
  return (
    (method === "GET" || method === "HEAD") &&
    pathname !== undefined &&
    pathname !== "/api" &&
    !pathname.startsWith("/api/") &&
    accept?.includes("text/html") === true
  );
};

export const buildApp = ({
  database,
  security,
  webDistPath,
  worker,
}: AppDependencies) => {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "test" ? "silent" : "info",
      redact: [
        "req.headers.cookie",
        "req.headers.x-csrf-token",
        "body.password",
      ],
    },
    trustProxy: security.trustLoopbackProxy
      ? (address) => address === "127.0.0.1" || address === "::1"
      : false,
  });
  const loginThrottle = createLoginThrottle({
    maxFailures: 5,
    maxTrackedCallers: 10_000,
    windowMs: 15 * 60 * 1_000,
  });
  const sessionTtlSeconds = Math.floor(security.sessionTtlMs / 1_000);

  const hasTrustedMutationHeaders = (request: FastifyRequest) =>
    request.headers.origin !== undefined &&
    security.allowedOrigins.has(request.headers.origin) &&
    request.headers["sec-fetch-site"] === "same-origin";

  const findSession = async (request: FastifyRequest) => {
    const token = parseCookies(request.headers.cookie).get(sessionCookieName);
    if (token === undefined) {
      return null;
    }
    return database.findActiveAdminSession({
      now: security.now(),
      sessionTokenHash: hashOpaqueToken(token),
    });
  };

  app.post("/api/auth/login", async (request, reply) => {
    if (!hasTrustedMutationHeaders(request)) {
      return forbidden(reply);
    }
    const command = adminLoginCommandSchema.safeParse(request.body);
    if (!command.success) {
      return reply.code(400).send({
        error: "Bad Request",
        message: "Invalid login command",
        statusCode: 400,
      });
    }

    const requestTime = security.now();
    const retryAfter = loginThrottle.retryAfterSeconds(
      request.ip,
      requestTime.getTime(),
    );
    if (retryAfter !== null) {
      return reply.header("retry-after", String(retryAfter)).code(429).send({
        error: "Too Many Requests",
        message: "Login temporarily throttled",
        statusCode: 429,
      });
    }
    const attemptId = loginThrottle.recordAttempt(
      request.ip,
      requestTime.getTime(),
    );
    if (!(await security.passwordVerifier(command.data.password))) {
      return unauthorized(reply);
    }

    loginThrottle.clearAttempt(request.ip, attemptId);
    const sessionToken = security.createOpaqueToken();
    const csrfToken = security.createOpaqueToken();
    const expiresAt = new Date(requestTime.getTime() + security.sessionTtlMs);
    const session = await database.createAdminSession({
      csrfTokenHash: hashOpaqueToken(csrfToken),
      expiresAt,
      sessionTokenHash: hashOpaqueToken(sessionToken),
    });
    reply.header("set-cookie", [
      serializeCookie({
        httpOnly: true,
        maxAgeSeconds: sessionTtlSeconds,
        name: sessionCookieName,
        secure: security.cookieSecure,
        value: sessionToken,
      }),
      serializeCookie({
        httpOnly: false,
        maxAgeSeconds: sessionTtlSeconds,
        name: csrfCookieName,
        secure: security.cookieSecure,
        value: csrfToken,
      }),
    ]);
    return reply.send(
      adminSessionResponseSchema.parse({
        authenticated: true,
        expiresAt: session.expiresAt.toISOString(),
      }),
    );
  });

  app.get("/api/auth/session", async (request, reply) => {
    const session = await findSession(request);
    return reply.send(
      adminSessionResponseSchema.parse(
        session === null
          ? { authenticated: false }
          : {
              authenticated: true,
              expiresAt: session.expiresAt.toISOString(),
            },
      ),
    );
  });

  app.get("/api/readiness", async (_request, reply) => {
    const [databaseReady, workerReady] = await Promise.all([
      database.check(),
      worker.check(),
    ]);
    const readiness = readinessSchema.parse({
      api: "ready",
      database: databaseReady ? "ready" : "unavailable",
      worker: workerReady ? "ready" : "unavailable",
    });
    const statusCode = databaseReady && workerReady ? 200 : 503;
    return reply.code(statusCode).send(readiness);
  });

  app.get("/api/offers", async (request, reply) => {
    const session = await findSession(request);
    if (session === null) {
      return unauthorized(reply);
    }
    const query = offerSearchQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({
        error: "Bad Request",
        message: "Invalid Offer search query",
        statusCode: 400,
      });
    }
    const result = offerSearchResponseSchema.parse(
      await database.searchOffers(query.data),
    );
    return reply.send(result);
  });

  app.get("/api/owner-commands/refresh-health", async (request, reply) => {
    const session = await findSession(request);
    if (session === null) {
      return unauthorized(reply);
    }
    return reply.send(
      latestOwnerCommandResponseSchema.parse({
        receipt: await database.findLatestOwnerCommand(),
      }),
    );
  });

  app.post("/api/owner-commands/refresh-health", async (request, reply) => {
    if (!hasTrustedMutationHeaders(request)) {
      return forbidden(reply);
    }
    const session = await findSession(request);
    if (session === null) {
      return unauthorized(reply);
    }

    const cookies = parseCookies(request.headers.cookie);
    const cookieToken = cookies.get(csrfCookieName);
    const headerToken = request.headers["x-csrf-token"];
    if (
      cookieToken === undefined ||
      typeof headerToken !== "string" ||
      !tokensMatch(cookieToken, headerToken) ||
      !tokensMatch(hashOpaqueToken(headerToken), session.csrfTokenHash)
    ) {
      return forbidden(reply);
    }

    const command = healthRefreshCommandSchema.safeParse(request.body);
    if (!command.success) {
      return reply.code(400).send({
        error: "Bad Request",
        message: "Invalid owner command",
        statusCode: 400,
      });
    }
    let receipt: OwnerCommandReceipt;
    try {
      receipt = ownerCommandReceiptSchema.parse(
        await database.enqueueOwnerCommand({
          command: command.data,
          requestedBySessionId: session.id,
        }),
      );
    } catch (error) {
      if (error instanceof OwnerCommandInFlightError) {
        return reply.code(409).send({
          error: "Conflict",
          message: error.message,
          statusCode: 409,
        });
      }
      throw error;
    }
    return reply.code(202).send(receipt);
  });

  if (webDistPath !== undefined && existsSync(webDistPath)) {
    void app.register(fastifyStatic, { root: webDistPath, wildcard: false });
    app.setNotFoundHandler((request, reply) => {
      const isBrowserNavigation = isBrowserNavigationRequest(
        request.method,
        request.originalUrl,
        request.headers.accept,
      );

      if (!isBrowserNavigation) {
        return reply.code(404).send({
          error: "Not Found",
          message: `Route ${request.method}:${request.url} not found`,
          statusCode: 404,
        });
      }

      return reply.sendFile("index.html");
    });
  }

  return app;
};
