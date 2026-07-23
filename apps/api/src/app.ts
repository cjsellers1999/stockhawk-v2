import { existsSync } from "node:fs";

import fastifyStatic from "@fastify/static";
import { readinessSchema } from "@stockhawk/contracts";
import Fastify from "fastify";

type ReadinessCheck = { check: () => Promise<boolean> };

type AppDependencies = {
  database: ReadinessCheck;
  webDistPath: string | undefined;
  worker: ReadinessCheck;
};

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
  webDistPath,
  worker,
}: AppDependencies) => {
  const app = Fastify({ logger: true });

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
