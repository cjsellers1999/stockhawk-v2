import { existsSync } from "node:fs";

import fastifyStatic from "@fastify/static";
import {
  healthRefreshCommandSchema,
  latestOwnerCommandResponseSchema,
  onboardingCaseCommandSchema,
  onboardingProgressSchema,
  offerSearchQuerySchema,
  offerSearchResponseSchema,
  ownerCommandReceiptSchema,
  readinessSchema,
  type OnboardingProgress,
  type OfferSearchQuery,
  type OfferSearchResponse,
  type OwnerCommandReceipt,
  type OwnerCommand,
  type OwnerCommandFamily,
} from "@stockhawk/contracts";
import { OwnerCommandInFlightError } from "@stockhawk/database";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";

type ReadinessCheck = { check: () => Promise<boolean> };
type OfferSearch = {
  searchOffers: (query: OfferSearchQuery) => Promise<OfferSearchResponse>;
};
type OwnerCommandDatabase = {
  enqueueOwnerCommand: (command: OwnerCommand) => Promise<OwnerCommandReceipt>;
  findLatestOwnerCommand: (
    family: OwnerCommandFamily,
  ) => Promise<OwnerCommandReceipt | null>;
  findOnboardingProgress: () => Promise<OnboardingProgress | null>;
};

type AppDependencies = {
  database: OfferSearch & ReadinessCheck & OwnerCommandDatabase;
  allowedOrigins: ReadonlySet<string>;
  webDistPath: string | undefined;
  worker: ReadinessCheck;
};

const forbidden = (reply: FastifyReply) =>
  reply.code(403).send({
    error: "Forbidden",
    message: "Request security boundary rejected the request",
    statusCode: 403,
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
  allowedOrigins,
  database,
  webDistPath,
  worker,
}: AppDependencies) => {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "test" ? "silent" : "info",
    },
  });

  const hasTrustedMutationHeaders = (request: FastifyRequest) =>
    request.headers.origin !== undefined &&
    allowedOrigins.has(request.headers.origin) &&
    request.headers["sec-fetch-site"] === "same-origin";

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

  app.get("/api/owner-commands/refresh-health", async (_request, reply) => {
    return reply.send(
      latestOwnerCommandResponseSchema.parse({
        receipt: await database.findLatestOwnerCommand("refresh_health"),
      }),
    );
  });

  app.post("/api/owner-commands/refresh-health", async (request, reply) => {
    if (!hasTrustedMutationHeaders(request)) {
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
        await database.enqueueOwnerCommand(command.data),
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

  app.get("/api/onboarding/progress", async (_request, reply) => {
    const progress = await database.findOnboardingProgress();
    if (progress === null) {
      return reply.code(404).send({
        error: "Not Found",
        message: "Seed List has not been imported",
        statusCode: 404,
      });
    }
    return reply.send(onboardingProgressSchema.parse(progress));
  });

  app.get("/api/owner-commands/resume-onboarding", async (_request, reply) => {
    return reply.send(
      latestOwnerCommandResponseSchema.parse({
        receipt: await database.findLatestOwnerCommand("resume_onboarding"),
      }),
    );
  });

  app.post("/api/owner-commands/resume-onboarding", async (request, reply) => {
    if (!hasTrustedMutationHeaders(request)) {
      return forbidden(reply);
    }

    const command = onboardingCaseCommandSchema.safeParse(request.body);
    if (!command.success) {
      return reply.code(400).send({
        error: "Bad Request",
        message: "Invalid Onboarding Case command",
        statusCode: 400,
      });
    }
    let receipt: OwnerCommandReceipt;
    try {
      receipt = ownerCommandReceiptSchema.parse(
        await database.enqueueOwnerCommand(command.data),
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
