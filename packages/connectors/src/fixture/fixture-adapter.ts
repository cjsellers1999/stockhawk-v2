import { createHash } from "node:crypto";

import {
  type CatalogDiscoveryCompletion,
  type ConnectorCheckpoint,
  type ConnectorFailure,
  type ConnectorListingObservation,
  type ConnectorRunMetrics,
  type SourceEvidenceArtifactInput,
  type StockMonitoringTargetOutcome,
  connectorCheckpointSchema,
  stockMonitoringTargetsSchema,
} from "@stockhawk/contracts";
import { z } from "zod";

import { BrokerBackoffError } from "../broker.js";
import type {
  CatalogDiscoveryInput,
  CatalogDiscoveryRun,
  ConnectorAdapter,
  StockMonitoringInput,
  StockMonitoringRun,
} from "../connector.js";
import { createEmptyConnectorRunMetrics } from "../metrics.js";

const fixturePathSchema = z
  .string()
  .startsWith("/")
  .refine(
    (value) =>
      !value.startsWith("//") && !value.includes("?") && !value.includes("#"),
    "Expected a path without an origin, query, or fragment",
  );
export const fixtureAdapterOptionsSchema = z.strictObject({
  catalogPath: fixturePathSchema,
  stockPath: fixturePathSchema,
});
const fixtureCertificationRecipeSchema = z.strictObject({
  method: z.literal("cursor"),
  requiredEvidence: z.tuple([
    z.literal("route"),
    z.literal("cursor_closure"),
    z.literal("variant_closure"),
  ]),
  schemaVersion: z.literal(1),
});
const maximumCheckpointEntries = 50_000;
const maximumPublicUrlLength = 10_000;
const fixtureCheckpointValueSchema = z.strictObject({
  cursor: z.string().min(1).max(10_000),
  fixtureSchemaVersion: z.literal(1),
  nextSequence: z.int().nonnegative().max(2_147_483_647),
  observedRoutes: z.array(z.url()).max(50_000),
  seenParents: z.array(z.string().min(1).max(200)).max(50_000),
  seenVariantFingerprints: z.record(
    z.string().min(1).max(200),
    z.string().regex(/^[a-f0-9]{64}$/),
  ),
  seenVariants: z.array(z.string().min(1).max(200)).max(50_000),
  startedAt: z.iso.datetime({ offset: true }),
});

const fixturePublicUrlSchema = z
  .url()
  .max(maximumPublicUrlLength)
  .refine(
    (value) => value.startsWith("http://") || value.startsWith("https://"),
    "Expected an HTTP URL",
  );
const fixtureVariantSchema = z
  .object({
    available: z.boolean().nullable(),
    id: z.string().min(1).max(200),
    imageUrl: fixturePublicUrlSchema.optional(),
    title: z.string().min(1).max(1_000),
  })
  .loose();
const fixtureProductSchema = z
  .object({
    id: z.string().min(1).max(200),
    title: z.string().min(1).max(1_000),
    variants: z.array(fixtureVariantSchema),
  })
  .loose();
const fixtureCatalogPageSchema = z
  .object({
    nextCursor: z.string().min(1).max(10_000).nullable(),
    products: z.array(fixtureProductSchema),
    surfaceFingerprint: z.string().min(1).optional(),
  })
  .loose();
const fixtureStockEnvelopeSchema = z
  .object({
    results: z.array(
      fixtureVariantSchema.extend({
        parentId: z.string().min(1).max(200),
      }),
    ),
  })
  .loose();

const sha256 = (value: Uint8Array | string) =>
  createHash("sha256").update(value).digest("hex");

const checkpointState = (checkpoint: ConnectorCheckpoint | null) =>
  checkpoint === null
    ? null
    : fixtureCheckpointValueSchema.safeParse(checkpoint.value);

const sourceIdentity = ({
  namespace,
  value,
}: {
  namespace: string;
  value: string;
}) => ({ namespace, ruleVersion: 1, value });

const observationFor = ({
  evidenceIdentity,
  observedAt,
  parentId,
  purchaseOrigin,
  variant,
}: {
  evidenceIdentity: string;
  observedAt: string;
  parentId: string;
  purchaseOrigin: string;
  variant: z.infer<typeof fixtureVariantSchema>;
}): ConnectorListingObservation => ({
  accessMethod: "http",
  evidenceIdentity,
  imageUrl: variant.imageUrl ?? null,
  observedAt,
  parentSourceIdentity: sourceIdentity({
    namespace: "fixture-product",
    value: parentId,
  }),
  purchaseUrl: `${purchaseOrigin}/products/${encodeURIComponent(variant.id)}`,
  rawAvailability: { available: variant.available },
  rawFacts: { source: "fixture-http", variantId: variant.id },
  rawTitle: variant.title,
  stockStatus:
    variant.available === null
      ? "unknown"
      : variant.available
        ? "in_stock"
        : "out_of_stock",
  variantSourceIdentity: sourceIdentity({
    namespace: "fixture-variant",
    value: variant.id,
  }),
});

const variantFingerprint = ({
  parentId,
  variant,
}: {
  parentId: string;
  variant: z.infer<typeof fixtureVariantSchema>;
}) =>
  sha256(
    JSON.stringify({
      available: variant.available,
      imageUrl: variant.imageUrl ?? null,
      parentId,
      title: variant.title,
    }),
  );

const evidenceFor = ({
  body,
  observedAt,
  runIdentity,
  sequence,
  url,
}: {
  body: Uint8Array;
  observedAt: string;
  runIdentity: string;
  sequence: number;
  url: string;
}): SourceEvidenceArtifactInput | null => {
  const content = new TextDecoder().decode(body);
  if (content.length > 1_000_000) {
    return null;
  }
  return {
    content,
    contentHash: sha256(content),
    identity: `evd_${sha256(`${runIdentity}:${sequence}:${url}`).slice(0, 32)}`,
    mediaType: "application/json",
    observedAt,
    sourceUrl: url,
  };
};

type FailureInput = {
  checkpoint: ConnectorCheckpoint | null;
  code: ConnectorFailure["code"];
  evidenceArtifact?: SourceEvidenceArtifactInput | null;
  error: unknown;
  metrics: ConnectorRunMetrics;
  resumeMode?: "checkpoint" | "restart_only";
  stage: ConnectorFailure["stage"];
};

const failure = ({
  checkpoint,
  code,
  evidenceArtifact = null,
  error,
  metrics,
  resumeMode = "checkpoint",
  stage,
}: FailureInput): ConnectorFailure => {
  const isBackoff = error instanceof BrokerBackoffError;
  const message = error instanceof Error ? error.message : String(error);
  return {
    checkpoint,
    code,
    evidenceArtifact,
    evidenceIdentity: evidenceArtifact?.identity ?? null,
    message,
    metrics,
    outcome: "failed",
    retryAt: isBackoff ? error.retryAt.toISOString() : metrics.serverRetryAt,
    retrySafety:
      code === "malformed-source" ||
      code === "adapter-fault" ||
      code === "integration-drift"
        ? "after-repair"
        : resumeMode === "restart_only"
          ? "restart"
          : "safe",
    stage,
  };
};

const classifyError = (
  error: unknown,
  fallback: ConnectorFailure["code"],
  signal: AbortSignal,
) => {
  if (signal.aborted || error === signal.reason) {
    return "cancelled" as const;
  }
  if (error instanceof BrokerBackoffError) {
    return "throttled" as const;
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return "cancelled" as const;
  }
  return fallback;
};

const retryAtFromHeader = (
  value: string | undefined,
  responseReceivedAt: string,
) => {
  if (value === undefined) {
    return null;
  }
  const seconds = /^\d+$/.test(value) ? Number(value) : Number.NaN;
  const retryAt =
    Number.isSafeInteger(seconds) && seconds >= 0
      ? new Date(new Date(responseReceivedAt).getTime() + seconds * 1_000)
      : new Date(value);
  return Number.isNaN(retryAt.getTime()) ? null : retryAt.toISOString();
};

const optionsPath = ({
  options,
  name,
}: {
  options: z.infer<typeof fixtureAdapterOptionsSchema>;
  name: "catalogPath" | "stockPath";
}) => options[name];

const discoverCatalog = async function* (
  { checkpoint, integration, runContext }: CatalogDiscoveryInput,
  resumeMode: "checkpoint" | "restart_only",
): CatalogDiscoveryRun {
  const metrics = createEmptyConnectorRunMetrics();
  const runStartedAt = Date.now();
  const finishMetrics = () => {
    metrics.activeMilliseconds = Math.max(
      0,
      Date.now() - runStartedAt - metrics.schedulerWaitMilliseconds,
    );
    return metrics;
  };
  const discoveryFailure = (input: Omit<FailureInput, "resumeMode">) =>
    failure({ ...input, resumeMode });
  const parsedOptions = fixtureAdapterOptionsSchema.safeParse(
    integration.adapterOptions,
  );
  const parsedRecipe = fixtureCertificationRecipeSchema.safeParse(
    integration.certificationRecipe,
  );
  if (
    integration.adapter.configurationVersion !== 1 ||
    !parsedOptions.success ||
    !parsedRecipe.success
  ) {
    return discoveryFailure({
      checkpoint: null,
      code: "adapter-fault",
      error: new Error("Fixture Adapter configuration is invalid"),
      metrics: finishMetrics(),
      stage: "registry",
    });
  }
  if (resumeMode === "restart_only" && checkpoint !== null) {
    return discoveryFailure({
      checkpoint: null,
      code: "adapter-fault",
      error: new Error(
        "Restart-only Fixture Adapter cannot accept a checkpoint",
      ),
      metrics: finishMetrics(),
      stage: "registry",
    });
  }
  const parsedCheckpoint = checkpointState(checkpoint);
  if (parsedCheckpoint !== null && !parsedCheckpoint.success) {
    return discoveryFailure({
      checkpoint: null,
      code: "adapter-fault",
      error: new Error("Fixture Adapter checkpoint is invalid"),
      metrics: finishMetrics(),
      stage: "registry",
    });
  }
  const resumedState = parsedCheckpoint?.data;
  const options = parsedOptions.data;
  const startedAt = resumedState?.startedAt ?? new Date().toISOString();
  const seenParents = new Set(resumedState?.seenParents ?? []);
  const seenVariants = new Set(resumedState?.seenVariants ?? []);
  const seenVariantFingerprints = new Map(
    Object.entries(resumedState?.seenVariantFingerprints ?? {}),
  );
  const observedRoutes = [...(resumedState?.observedRoutes ?? [])];
  const visitedCursors = new Set<string>();
  let cursor = resumedState?.cursor ?? null;
  let latestCheckpoint = checkpoint;
  let sequence = resumedState?.nextSequence ?? 0;
  const safeCheckpoint = () =>
    resumeMode === "checkpoint" ? latestCheckpoint : null;

  while (true) {
    if (runContext.signal.aborted) {
      return discoveryFailure({
        checkpoint: safeCheckpoint(),
        code: "cancelled",
        error: new DOMException("Connector run cancelled", "AbortError"),
        metrics: finishMetrics(),
        stage: "discovery",
      });
    }
    const cursorKey = cursor ?? "__start__";
    if (visitedCursors.has(cursorKey)) {
      return discoveryFailure({
        checkpoint: safeCheckpoint(),
        code: "malformed-source",
        error: new Error(`Fixture source repeated cursor ${cursorKey}`),
        metrics: finishMetrics(),
        stage: "discovery",
      });
    }
    visitedCursors.add(cursorKey);
    const target = new URL(
      optionsPath({ options, name: "catalogPath" }),
      integration.canonicalOrigin,
    );
    if (cursor !== null) {
      target.searchParams.set("cursor", cursor);
    }
    if (target.toString().length > maximumPublicUrlLength) {
      return discoveryFailure({
        checkpoint: safeCheckpoint(),
        code: "malformed-source",
        error: new Error("Fixture source cursor produces an oversized URL"),
        metrics: finishMetrics(),
        stage: "discovery",
      });
    }
    const requestStartedAt = Date.now();
    try {
      // Catalog cursors are source-ordered and each response determines the next.
      // eslint-disable-next-line no-await-in-loop
      const response = await runContext.broker.requestHttp({
        integration,
        purpose: "document",
        signal: runContext.signal,
        url: target.toString(),
      });
      metrics.httpOperations += response.cacheOutcome === "miss" ? 1 : 0;
      metrics.requestEquivalentCost += response.cacheOutcome === "miss" ? 1 : 0;
      metrics.cacheHits += response.cacheOutcome === "hit" ? 1 : 0;
      metrics.bytesReceived += response.body.byteLength;
      metrics.schedulerWaitMilliseconds += response.schedulerWaitMilliseconds;
      const requestMilliseconds = Math.max(
        0,
        Date.now() - requestStartedAt - response.schedulerWaitMilliseconds,
      );
      metrics.requestMilliseconds += requestMilliseconds;
      metrics.maximumRequestMilliseconds = Math.max(
        metrics.maximumRequestMilliseconds,
        requestMilliseconds,
      );
      if (response.status === 304) {
        metrics.conditionalNotModified += 1;
      }
      const responseEvidence =
        response.finalUrl.length <= maximumPublicUrlLength
          ? evidenceFor({
              body: response.body,
              observedAt: response.receivedAt,
              runIdentity: runContext.runIdentity,
              sequence,
              url: response.finalUrl,
            })
          : null;
      const retainedEvidence =
        responseEvidence === null ? {} : { evidenceArtifact: responseEvidence };
      if (response.status === 429 || response.status === 503) {
        metrics.rateLimits += 1;
        metrics.serverRetryAt = retryAtFromHeader(
          response.headers["retry-after"],
          response.receivedAt,
        );
        return discoveryFailure({
          checkpoint: safeCheckpoint(),
          code: "throttled",
          ...retainedEvidence,
          error: new Error("Fixture source requested Connector backoff"),
          metrics: finishMetrics(),
          stage: "access",
        });
      }
      if (response.status === 403) {
        metrics.challenges += 1;
        return discoveryFailure({
          checkpoint: safeCheckpoint(),
          code: "challenge",
          ...retainedEvidence,
          error: new Error("Fixture source presented an access challenge"),
          metrics: finishMetrics(),
          stage: "access",
        });
      }
      if (response.status < 200 || response.status >= 300) {
        return discoveryFailure({
          checkpoint: safeCheckpoint(),
          code: "network",
          ...retainedEvidence,
          error: new Error(`Fixture source returned ${response.status}`),
          metrics: finishMetrics(),
          stage: "access",
        });
      }
      if (responseEvidence === null) {
        return discoveryFailure({
          checkpoint: safeCheckpoint(),
          code: "malformed-source",
          error: new Error(
            "Fixture source URL or evidence exceeds the retained evidence limit",
          ),
          metrics: finishMetrics(),
          stage: "decode",
        });
      }

      let envelope: z.infer<typeof fixtureCatalogPageSchema>;
      try {
        envelope = fixtureCatalogPageSchema.parse(
          JSON.parse(new TextDecoder().decode(response.body)),
        );
      } catch (error) {
        return discoveryFailure({
          checkpoint: safeCheckpoint(),
          code: "malformed-source",
          evidenceArtifact: responseEvidence,
          error,
          metrics: finishMetrics(),
          stage: "decode",
        });
      }
      observedRoutes.push(response.finalUrl);
      if (
        envelope.surfaceFingerprint !== integration.expectedSurfaceFingerprint
      ) {
        return discoveryFailure({
          checkpoint: safeCheckpoint(),
          code: "integration-drift",
          evidenceArtifact: responseEvidence,
          error: new Error(
            `Expected surface ${integration.expectedSurfaceFingerprint}, received ${envelope.surfaceFingerprint}`,
          ),
          metrics: finishMetrics(),
          stage: "discovery",
        });
      }
      const observedAt = responseEvidence.observedAt;
      const observations: ConnectorListingObservation[] = [];
      for (const product of envelope.products) {
        seenParents.add(product.id);
        for (const variant of product.variants) {
          const fingerprint = variantFingerprint({
            parentId: product.id,
            variant,
          });
          const existingFingerprint = seenVariantFingerprints.get(variant.id);
          if (
            existingFingerprint !== undefined &&
            existingFingerprint !== fingerprint
          ) {
            return discoveryFailure({
              checkpoint: safeCheckpoint(),
              code: "malformed-source",
              evidenceArtifact: responseEvidence,
              error: new Error(
                `Fixture source returned conflicting variant ${variant.id}`,
              ),
              metrics: finishMetrics(),
              stage: "discovery",
            });
          }
          if (existingFingerprint !== undefined) {
            continue;
          }
          seenVariantFingerprints.set(variant.id, fingerprint);
          seenVariants.add(variant.id);
          observations.push(
            observationFor({
              evidenceIdentity: responseEvidence.identity,
              observedAt,
              parentId: product.id,
              purchaseOrigin: integration.canonicalOrigin,
              variant,
            }),
          );
        }
      }
      metrics.itemCount = seenParents.size;
      metrics.variantCount = seenVariants.size;
      if (
        observedRoutes.length > maximumCheckpointEntries ||
        seenParents.size > maximumCheckpointEntries ||
        seenVariants.size > maximumCheckpointEntries
      ) {
        return discoveryFailure({
          checkpoint: safeCheckpoint(),
          code: "malformed-source",
          evidenceArtifact: responseEvidence,
          error: new Error(
            "Fixture source exceeds the bounded resumable discovery state",
          ),
          metrics: finishMetrics(),
          stage: "discovery",
        });
      }
      if (observations.length > 100) {
        return discoveryFailure({
          checkpoint: safeCheckpoint(),
          code: "malformed-source",
          evidenceArtifact: responseEvidence,
          error: new Error(
            "Fixture source page exceeds the bounded observation batch limit",
          ),
          metrics: finishMetrics(),
          stage: "decode",
        });
      }
      cursor = envelope.nextCursor;
      const nextCheckpoint: ConnectorCheckpoint | null =
        cursor === null
          ? null
          : {
              schemaVersion: 1,
              value: {
                cursor,
                fixtureSchemaVersion: 1,
                nextSequence: sequence + 1,
                observedRoutes: [...observedRoutes],
                seenParents: [...seenParents].toSorted(),
                seenVariantFingerprints: Object.fromEntries(
                  [...seenVariantFingerprints].toSorted(([left], [right]) =>
                    left < right ? -1 : left > right ? 1 : 0,
                  ),
                ),
                seenVariants: [...seenVariants].toSorted(),
                startedAt,
              },
            };
      if (
        nextCheckpoint !== null &&
        !connectorCheckpointSchema.safeParse(nextCheckpoint).success
      ) {
        return discoveryFailure({
          checkpoint: safeCheckpoint(),
          code: "malformed-source",
          evidenceArtifact: responseEvidence,
          error: new Error(
            "Fixture source exceeds the bounded Connector checkpoint",
          ),
          metrics: finishMetrics(),
          stage: "discovery",
        });
      }
      latestCheckpoint = nextCheckpoint;
      const persistedCheckpoint = safeCheckpoint();
      yield {
        batch: {
          checkpoint: persistedCheckpoint,
          evidence: [responseEvidence],
          identity: `batch_${sha256(`${runContext.runIdentity}:${sequence}`).slice(0, 32)}`,
          observations,
          runIdentity: runContext.runIdentity,
          schemaVersion: 1,
          sequence,
        },
        type: "observation_batch",
      };
      sequence += 1;
      if (cursor === null) {
        const completedAt = new Date().toISOString();
        const terminal: CatalogDiscoveryCompletion = {
          certificationClaim: {
            conflicts: [],
            expectedCount: null,
            gaps: [],
            observedParentCount: seenParents.size,
            observedRoutes,
            observedVariantCount: seenVariants.size,
            paginationComplete: true,
            parentClosure: true,
            publicVisibilityCaveats: [],
            recipeSchemaVersion: 1,
            schemaVersion: 1,
            snapshotBoundary: {
              completedAt,
              fingerprint: sha256([...seenVariants].toSorted().join("\n")),
              startedAt,
            },
            variantClosure: true,
          },
          checkpoint: null,
          metrics: finishMetrics(),
          outcome: "completed",
        };
        return terminal;
      }
    } catch (error) {
      return discoveryFailure({
        checkpoint: safeCheckpoint(),
        code: classifyError(error, "network", runContext.signal),
        error,
        metrics: finishMetrics(),
        stage: "access",
      });
    }
  }
};

const monitorStock = async function* (
  { checkpoint, integration, runContext, targets }: StockMonitoringInput,
  resumeMode: "checkpoint" | "restart_only",
): StockMonitoringRun {
  const metrics = createEmptyConnectorRunMetrics();
  const runStartedAt = Date.now();
  const finishMetrics = () => {
    metrics.activeMilliseconds = Math.max(
      0,
      Date.now() - runStartedAt - metrics.schedulerWaitMilliseconds,
    );
    return metrics;
  };
  const monitoringFailure = (input: Omit<FailureInput, "resumeMode">) =>
    failure({ ...input, resumeMode });
  const parsedOptions = fixtureAdapterOptionsSchema.safeParse(
    integration.adapterOptions,
  );
  const parsedTargets = stockMonitoringTargetsSchema.safeParse(targets);
  if (
    integration.adapter.configurationVersion !== 1 ||
    !parsedOptions.success ||
    !parsedTargets.success
  ) {
    return monitoringFailure({
      checkpoint: null,
      code: "adapter-fault",
      error: new Error("Fixture Adapter configuration or targets are invalid"),
      metrics: finishMetrics(),
      stage: "registry",
    });
  }
  if (checkpoint !== null) {
    return monitoringFailure({
      checkpoint: null,
      code: "adapter-fault",
      error: new Error(
        "Fixture stock monitoring is one-shot and cannot accept a checkpoint",
      ),
      metrics: finishMetrics(),
      stage: "registry",
    });
  }
  const boundedTargets = parsedTargets.data;
  metrics.targetCount = boundedTargets.length;
  if (boundedTargets.length === 0) {
    return {
      checkpoint: null,
      metrics: finishMetrics(),
      outcome: "completed",
      targetOutcomes: [],
    };
  }
  const target = new URL(
    optionsPath({ options: parsedOptions.data, name: "stockPath" }),
    integration.canonicalOrigin,
  );
  for (const { sourceIdentityValue } of boundedTargets) {
    target.searchParams.append("ids", sourceIdentityValue);
  }
  if (target.toString().length > maximumPublicUrlLength) {
    return monitoringFailure({
      checkpoint: null,
      code: "malformed-source",
      error: new Error(
        "Fixture monitoring targets produce an oversized request URL",
      ),
      metrics: finishMetrics(),
      stage: "monitoring",
    });
  }
  try {
    const requestStartedAt = Date.now();
    const response = await runContext.broker.requestHttp({
      integration,
      purpose: "document",
      signal: runContext.signal,
      url: target.toString(),
    });
    metrics.httpOperations += response.cacheOutcome === "miss" ? 1 : 0;
    metrics.requestEquivalentCost += response.cacheOutcome === "miss" ? 1 : 0;
    metrics.cacheHits += response.cacheOutcome === "hit" ? 1 : 0;
    metrics.bytesReceived += response.body.byteLength;
    metrics.schedulerWaitMilliseconds += response.schedulerWaitMilliseconds;
    const requestMilliseconds = Math.max(
      0,
      Date.now() - requestStartedAt - response.schedulerWaitMilliseconds,
    );
    metrics.requestMilliseconds += requestMilliseconds;
    metrics.maximumRequestMilliseconds = requestMilliseconds;
    const responseEvidence =
      response.finalUrl.length <= maximumPublicUrlLength
        ? evidenceFor({
            body: response.body,
            observedAt: response.receivedAt,
            runIdentity: runContext.runIdentity,
            sequence: 0,
            url: response.finalUrl,
          })
        : null;
    const retainedEvidence =
      responseEvidence === null ? {} : { evidenceArtifact: responseEvidence };
    if (response.status < 200 || response.status >= 300) {
      metrics.rateLimits +=
        response.status === 429 || response.status === 503 ? 1 : 0;
      metrics.challenges += response.status === 403 ? 1 : 0;
      metrics.conditionalNotModified += response.status === 304 ? 1 : 0;
      metrics.serverRetryAt = retryAtFromHeader(
        response.headers["retry-after"],
        response.receivedAt,
      );
      return monitoringFailure({
        checkpoint: null,
        code:
          response.status === 429 || response.status === 503
            ? "throttled"
            : response.status === 403
              ? "challenge"
              : "network",
        ...retainedEvidence,
        error: new Error(`Fixture stock source returned ${response.status}`),
        metrics: finishMetrics(),
        stage: "monitoring",
      });
    }
    if (responseEvidence === null) {
      return monitoringFailure({
        checkpoint: null,
        code: "malformed-source",
        error: new Error(
          "Fixture stock URL or evidence exceeds the retained evidence limit",
        ),
        metrics: finishMetrics(),
        stage: "decode",
      });
    }
    let envelope: z.infer<typeof fixtureStockEnvelopeSchema>;
    try {
      envelope = fixtureStockEnvelopeSchema.parse(
        JSON.parse(new TextDecoder().decode(response.body)),
      );
    } catch (error) {
      return monitoringFailure({
        checkpoint: null,
        code: "malformed-source",
        evidenceArtifact: responseEvidence,
        error,
        metrics: finishMetrics(),
        stage: "decode",
      });
    }
    const observedAt = responseEvidence.observedAt;
    const targetIdentitySet = new Set(
      boundedTargets.map(({ sourceIdentityValue }) => sourceIdentityValue),
    );
    if (envelope.results.length > 100) {
      return monitoringFailure({
        checkpoint: null,
        code: "malformed-source",
        evidenceArtifact: responseEvidence,
        error: new Error(
          "Fixture stock source exceeds the bounded observation batch limit",
        ),
        metrics: finishMetrics(),
        stage: "decode",
      });
    }
    const resultByIdentity = new Map<
      string,
      z.infer<typeof fixtureStockEnvelopeSchema>["results"][number]
    >();
    const resultFingerprintByIdentity = new Map<string, string>();
    for (const result of envelope.results) {
      if (!targetIdentitySet.has(result.id)) {
        continue;
      }
      const fingerprint = variantFingerprint({
        parentId: result.parentId,
        variant: result,
      });
      const existingFingerprint = resultFingerprintByIdentity.get(result.id);
      if (
        existingFingerprint !== undefined &&
        existingFingerprint !== fingerprint
      ) {
        return monitoringFailure({
          checkpoint: null,
          code: "malformed-source",
          evidenceArtifact: responseEvidence,
          error: new Error(
            `Fixture stock source returned conflicting variant ${result.id}`,
          ),
          metrics: finishMetrics(),
          stage: "decode",
        });
      }
      resultFingerprintByIdentity.set(result.id, fingerprint);
      resultByIdentity.set(result.id, result);
    }
    const observations = [...resultByIdentity.values()].map((variant) =>
      observationFor({
        evidenceIdentity: responseEvidence.identity,
        observedAt,
        parentId: variant.parentId,
        purchaseOrigin: integration.canonicalOrigin,
        variant,
      }),
    );
    metrics.itemCount = observations.length;
    metrics.variantCount = observations.length;
    yield {
      batch: {
        checkpoint: null,
        evidence: [responseEvidence],
        identity: `batch_${sha256(`${runContext.runIdentity}:0`).slice(0, 32)}`,
        observations,
        runIdentity: runContext.runIdentity,
        schemaVersion: 1,
        sequence: 0,
      },
      type: "observation_batch",
    };
    const targetOutcomes: StockMonitoringTargetOutcome[] = boundedTargets.map(
      ({ sourceIdentityValue }) => ({
        evidenceIdentity: resultByIdentity.has(sourceIdentityValue)
          ? responseEvidence.identity
          : null,
        outcome: resultByIdentity.has(sourceIdentityValue)
          ? "observed"
          : "not_observed",
        sourceIdentityValue,
      }),
    );
    return {
      checkpoint: null,
      metrics: finishMetrics(),
      outcome: "completed",
      targetOutcomes,
    };
  } catch (error) {
    return monitoringFailure({
      checkpoint: null,
      code: classifyError(error, "network", runContext.signal),
      error,
      metrics: finishMetrics(),
      stage: "monitoring",
    });
  }
};

export const createFixtureConnectorAdapter = ({
  resumeMode = "checkpoint",
}: {
  resumeMode?: "checkpoint" | "restart_only";
} = {}): ConnectorAdapter => ({
  certificationRecipeSchema: fixtureCertificationRecipeSchema,
  configurationSchema: fixtureAdapterOptionsSchema,
  discoverCatalog: (input) => discoverCatalog(input, resumeMode),
  manifest: {
    changeImpact: {
      catalogCoverage: true,
      certificationRecipe: true,
      sourceIdentity: true,
      sourceInterpretation: true,
    },
    configurationSchemaVersion: 1,
    id: "fixture-http",
    kind: "platform",
    resumeMode,
    schemaVersion: 1,
    version: "1.0.0",
  },
  monitorStock: (input) => monitorStock(input, resumeMode),
});
