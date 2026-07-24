import { z } from "zod";

import { stockStatusSchema } from "./catalog.js";

const identitySchema = z.string().min(1).max(200);
const versionSchema = z.string().regex(/^\d+\.\d+\.\d+$/);
const publicUrlSchema = z
  .url()
  .max(10_000)
  .refine(
    (value) => value.startsWith("http://") || value.startsWith("https://"),
    "Expected a public HTTP URL",
  );
const normalizedUrlSchema = z.url({ normalize: true });
const originSchema = publicUrlSchema.refine((value) => {
  const match = /^(https?):\/\/([^/?#]+)$/.exec(value);
  if (match === null || value !== value.toLowerCase()) {
    return false;
  }
  const [, protocol, authority = ""] = match;
  if (authority.includes("@") || authority.endsWith(":")) {
    return false;
  }
  const port = /(?:\]|[^:]):(\d+)$/.exec(authority)?.[1];
  const normalized = normalizedUrlSchema.safeParse(value);
  const normalizedOrigin = normalized.success
    ? normalized.data.endsWith("/")
      ? normalized.data.slice(0, -1)
      : normalized.data
    : null;
  return (
    normalized.success &&
    normalizedOrigin === value &&
    (port === undefined || String(Number(port)) === port) &&
    !(protocol === "http" && port === "80") &&
    !(protocol === "https" && port === "443")
  );
}, "Expected a canonical HTTP origin without credentials, path, query, or fragment");
const jsonObjectSchema = z.record(z.string(), z.json());
const contentHashSchema = z.string().regex(/^[a-f0-9]{64}$/);
const forbiddenAdapterOptionKeys = new Set([
  "apikey",
  "apisecret",
  "accesstoken",
  "authorization",
  "authtoken",
  "bearertoken",
  "clientsecret",
  "cookie",
  "credentials",
  "headers",
  "hook",
  "password",
  "privatekey",
  "refreshtoken",
  "requestheaders",
  "script",
  "secret",
  "token",
]);
const adapterOptionsSchema = jsonObjectSchema.superRefine(
  (options, context) => {
    const inspect = (value: unknown, path: (number | string)[]) => {
      if (Array.isArray(value)) {
        value.forEach((item, index) => inspect(item, [...path, index]));
        return;
      }
      if (typeof value === "object" && value !== null) {
        for (const [key, item] of Object.entries(value)) {
          const normalizedKey = key.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
          if (
            forbiddenAdapterOptionKeys.has(normalizedKey) ||
            /(apikey|cookies?|credentials?|headers?|passwords?|secrets?|tokens?)$/.test(
              normalizedKey,
            ) ||
            /^(apikey|cookies?|credentials?|headers?|passwords?|secrets?|tokens?)/.test(
              normalizedKey,
            ) ||
            /^(?:api|auth|bearer|client|id|oauth|refresh|session)tokens?$/.test(
              normalizedKey,
            ) ||
            /^(?:encryption|private|secret|signing)keys?$/.test(normalizedKey)
          ) {
            context.addIssue({
              code: "custom",
              message:
                "Adapter options cannot contain executable hooks or secrets",
              path: [...path, key],
            });
          }
          inspect(item, [...path, key]);
        }
      }
    };
    inspect(options, []);
  },
);

export const connectorJobSchema = z.enum([
  "catalog_discovery",
  "stock_monitoring",
]);
export const connectorResumeModeSchema = z.enum(["checkpoint", "restart_only"]);
export const connectorAdapterManifestSchema = z.strictObject({
  changeImpact: z.strictObject({
    catalogCoverage: z.boolean(),
    certificationRecipe: z.boolean(),
    sourceIdentity: z.boolean(),
    sourceInterpretation: z.boolean(),
  }),
  configurationSchemaVersion: z.int().positive(),
  id: identitySchema,
  kind: z.enum(["platform", "bespoke"]),
  resumeMode: connectorResumeModeSchema,
  schemaVersion: z.literal(1),
  version: versionSchema,
});
const utf8ByteLength = (value: string) => {
  let byteLength = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    byteLength +=
      codePoint <= 0x7f
        ? 1
        : codePoint <= 0x7ff
          ? 2
          : codePoint <= 0xffff
            ? 3
            : 4;
  }
  return byteLength;
};
const addBoundedJsonIssues = ({
  context,
  label,
  maximumBytes,
  value,
}: {
  context: z.RefinementCtx;
  label: string;
  maximumBytes: number;
  value: unknown;
}) => {
  if (utf8ByteLength(JSON.stringify(value)) > maximumBytes) {
    context.addIssue({
      code: "custom",
      message: `${label} exceeds the serialized byte limit`,
    });
  }
  const inspect = (item: unknown, depth: number, path: (number | string)[]) => {
    if (depth > 32) {
      context.addIssue({
        code: "custom",
        message: `${label} exceeds the nesting depth limit`,
        path,
      });
      return;
    }
    if (typeof item === "string" && item.length > 100_000) {
      context.addIssue({
        code: "custom",
        message: `${label} string exceeds its length limit`,
        path,
      });
      return;
    }
    if (Array.isArray(item)) {
      item.forEach((child, index) =>
        inspect(child, depth + 1, [...path, index]),
      );
      return;
    }
    if (typeof item === "object" && item !== null) {
      for (const [key, child] of Object.entries(item)) {
        inspect(child, depth + 1, [...path, key]);
      }
    }
  };
  inspect(value, 0, []);
};
export const connectorCheckpointSchema = z.strictObject({
  schemaVersion: z.literal(1),
  value: z.json().superRefine((value, context) => {
    addBoundedJsonIssues({
      context,
      label: "Connector checkpoint",
      maximumBytes: 1_000_000,
      value,
    });
  }),
});

export const sourceListingIdentitySchema = z.strictObject({
  namespace: identitySchema,
  ruleVersion: z.int().positive().max(2_147_483_647),
  value: identitySchema,
});

export const browserAccessGrantSchema = z.strictObject({
  approvedOrigins: z.array(originSchema).min(1),
  routePrefixes: z.array(z.string().startsWith("/")).min(1),
  schemaVersion: z.literal(1),
});

export const certificationRecipeSchema = z.strictObject({
  method: z.enum(["cursor", "sitemap", "bespoke"]),
  requiredEvidence: z
    .array(
      z.enum([
        "route",
        "count",
        "cursor_closure",
        "parent_closure",
        "variant_closure",
        "snapshot_boundary",
        "visibility",
        "gap_accounting",
      ]),
    )
    .min(1),
  schemaVersion: z.literal(1),
});

export const storefrontIntegrationSchema = z
  .strictObject({
    adapter: z.strictObject({
      configurationVersion: z.int().positive(),
      id: identitySchema,
      version: versionSchema,
    }),
    adapterOptions: adapterOptionsSchema,
    approvedOrigins: z.array(originSchema).min(1),
    browserAccessGrant: browserAccessGrantSchema.nullable(),
    canonicalOrigin: originSchema,
    catalogRoots: z.array(publicUrlSchema).min(1),
    certificationRecipe: certificationRecipeSchema,
    expectedSurfaceFingerprint: identitySchema,
    identity: identitySchema,
    initialPacing: z.strictObject({
      maximumConcurrentRequests: z.int().positive().max(20),
      minimumIntervalMilliseconds: z.int().nonnegative().max(60_000),
    }),
    locale: z.string().min(2).max(35),
    region: z.string().length(2),
    schemaVersion: z.literal(1),
    storefrontIdentity: identitySchema,
  })
  .superRefine((integration, context) => {
    if (!integration.approvedOrigins.includes(integration.canonicalOrigin)) {
      context.addIssue({
        code: "custom",
        message: "Canonical origin must be approved",
        path: ["canonicalOrigin"],
      });
    }
    const unapprovedRoot = integration.catalogRoots.find((root) => {
      const origin = /^(https?:\/\/[^/?#]+)/.exec(root)?.[1];
      return (
        origin === undefined || !integration.approvedOrigins.includes(origin)
      );
    });
    if (unapprovedRoot !== undefined) {
      context.addIssue({
        code: "custom",
        message: "Catalog roots must use approved origins",
        path: ["catalogRoots"],
      });
    }
    const unapprovedBrowserOrigin =
      integration.browserAccessGrant?.approvedOrigins.find(
        (origin) => !integration.approvedOrigins.includes(origin),
      );
    if (unapprovedBrowserOrigin !== undefined) {
      context.addIssue({
        code: "custom",
        message: "Browser grant origins must be approved",
        path: ["browserAccessGrant", "approvedOrigins"],
      });
    }
  });

export const sourceEvidenceArtifactInputSchema = z.strictObject({
  content: z.string().max(1_000_000),
  contentHash: contentHashSchema,
  identity: identitySchema,
  mediaType: z.string().min(1).max(100),
  observedAt: z.iso.datetime({ offset: true }),
  sourceUrl: publicUrlSchema,
});

export const connectorListingObservationSchema = z.strictObject({
  accessMethod: z.enum(["http", "browser"]),
  evidenceIdentity: identitySchema,
  imageUrl: publicUrlSchema.nullable(),
  observedAt: z.iso.datetime({ offset: true }),
  parentSourceIdentity: sourceListingIdentitySchema,
  purchaseUrl: publicUrlSchema,
  rawAvailability: z.json().superRefine((value, context) => {
    addBoundedJsonIssues({
      context,
      label: "Raw availability",
      maximumBytes: 100_000,
      value,
    });
  }),
  rawFacts: jsonObjectSchema.superRefine((value, context) => {
    addBoundedJsonIssues({
      context,
      label: "Raw facts",
      maximumBytes: 100_000,
      value,
    });
  }),
  rawTitle: z.string().min(1).max(1_000),
  stockStatus: stockStatusSchema,
  variantSourceIdentity: sourceListingIdentitySchema,
});

export const connectorObservationBatchSchema = z
  .strictObject({
    checkpoint: connectorCheckpointSchema.nullable(),
    evidence: z.array(sourceEvidenceArtifactInputSchema).max(100),
    identity: identitySchema,
    observations: z.array(connectorListingObservationSchema).max(100),
    runIdentity: identitySchema,
    schemaVersion: z.literal(1),
    sequence: z.int().nonnegative().max(2_147_483_647),
  })
  .superRefine((batch, context) => {
    const { evidence, observations } = batch;
    if (utf8ByteLength(JSON.stringify(batch)) > 10_000_000) {
      context.addIssue({
        code: "custom",
        message: "Connector batch exceeds the serialized byte limit",
      });
    }
    const evidenceIdentities = new Set<string>();
    evidence.forEach((artifact, index) => {
      if (evidenceIdentities.has(artifact.identity)) {
        context.addIssue({
          code: "custom",
          message: "Evidence identities must be unique within a batch",
          path: ["evidence", index, "identity"],
        });
      }
      evidenceIdentities.add(artifact.identity);
    });
    const identities = new Set<string>();
    observations.forEach((observation, index) => {
      if (!evidenceIdentities.has(observation.evidenceIdentity)) {
        context.addIssue({
          code: "custom",
          message: "Observation evidence must be present in its batch",
          path: ["observations", index, "evidenceIdentity"],
        });
      }
      const identity = JSON.stringify([
        observation.variantSourceIdentity.namespace,
        observation.variantSourceIdentity.ruleVersion,
        observation.variantSourceIdentity.value,
      ]);
      if (identities.has(identity)) {
        context.addIssue({
          code: "custom",
          message: "Variant source identities must be unique within a batch",
          path: ["observations", index, "variantSourceIdentity"],
        });
      }
      identities.add(identity);
    });
  });

export const connectorRunMetricsSchema = z.strictObject({
  activeMilliseconds: z.int().nonnegative(),
  browserOperations: z.int().nonnegative(),
  bytesReceived: z.int().nonnegative(),
  cacheHits: z.int().nonnegative(),
  challenges: z.int().nonnegative(),
  conditionalNotModified: z.int().nonnegative(),
  httpOperations: z.int().nonnegative(),
  itemCount: z.int().nonnegative(),
  maximumRequestMilliseconds: z.int().nonnegative(),
  rateLimits: z.int().nonnegative(),
  requestEquivalentCost: z.number().nonnegative(),
  requestMilliseconds: z.int().nonnegative(),
  retries: z.int().nonnegative(),
  schedulerWaitMilliseconds: z.int().nonnegative(),
  serverRetryAt: z.iso.datetime({ offset: true }).nullable(),
  targetCount: z.int().nonnegative(),
  variantCount: z.int().nonnegative(),
});

export const certificationClaimSchema = z.strictObject({
  conflicts: z.array(z.string()),
  expectedCount: z.int().nonnegative().nullable(),
  gaps: z.array(z.string()),
  observedParentCount: z.int().nonnegative(),
  observedRoutes: z.array(publicUrlSchema).min(1),
  observedVariantCount: z.int().nonnegative(),
  paginationComplete: z.boolean(),
  parentClosure: z.boolean(),
  publicVisibilityCaveats: z.array(z.string()),
  recipeSchemaVersion: z.literal(1),
  schemaVersion: z.literal(1),
  snapshotBoundary: z.strictObject({
    completedAt: z.iso.datetime({ offset: true }),
    fingerprint: identitySchema,
    startedAt: z.iso.datetime({ offset: true }),
  }),
  variantClosure: z.boolean(),
});

export const connectorFailureSchema = z
  .strictObject({
    checkpoint: connectorCheckpointSchema.nullable(),
    code: z.enum([
      "adapter-fault",
      "adapter-unavailable",
      "cancelled",
      "challenge",
      "integration-drift",
      "malformed-source",
      "network",
      "throttled",
    ]),
    evidenceArtifact: sourceEvidenceArtifactInputSchema.nullable(),
    evidenceIdentity: identitySchema.nullable(),
    message: z.string().min(1),
    metrics: connectorRunMetricsSchema,
    outcome: z.literal("failed"),
    retryAt: z.iso.datetime({ offset: true }).nullable(),
    retrySafety: z.enum(["safe", "restart", "after-repair"]),
    stage: z.enum(["access", "decode", "discovery", "monitoring", "registry"]),
  })
  .superRefine(({ evidenceArtifact, evidenceIdentity }, context) => {
    if ((evidenceArtifact?.identity ?? null) !== evidenceIdentity) {
      context.addIssue({
        code: "custom",
        message: "Failure evidence identity must match its artifact",
        path: ["evidenceIdentity"],
      });
    }
  });

export const catalogDiscoveryCompletionSchema = z.strictObject({
  certificationClaim: certificationClaimSchema,
  checkpoint: connectorCheckpointSchema.nullable(),
  metrics: connectorRunMetricsSchema,
  outcome: z.literal("completed"),
});

export const stockMonitoringTargetOutcomeSchema = z.strictObject({
  evidenceIdentity: identitySchema.nullable(),
  outcome: z.enum(["observed", "confirmed_disappeared", "not_observed"]),
  sourceIdentityValue: identitySchema,
});
export const stockMonitoringTargetSchema = z.strictObject({
  sourceIdentityValue: identitySchema,
});
export const stockMonitoringTargetsSchema = z
  .array(stockMonitoringTargetSchema)
  .max(100);

export const stockMonitoringCompletionSchema = z.strictObject({
  checkpoint: connectorCheckpointSchema.nullable(),
  metrics: connectorRunMetricsSchema,
  outcome: z.literal("completed"),
  targetOutcomes: z.array(stockMonitoringTargetOutcomeSchema),
});

export const commitConnectorBatchCommandSchema = z
  .strictObject({
    batch: connectorObservationBatchSchema,
    run: z.strictObject({
      adapterId: identitySchema,
      adapterVersion: versionSchema,
      identity: identitySchema,
      integrationIdentity: identitySchema,
      job: connectorJobSchema,
      resumeMode: connectorResumeModeSchema,
    }),
    schemaVersion: z.literal(1),
  })
  .superRefine(({ batch, run }, context) => {
    if (batch.runIdentity !== run.identity) {
      context.addIssue({
        code: "custom",
        message: "Batch run identity must match its Connector Run",
        path: ["batch", "runIdentity"],
      });
    }
    if (run.resumeMode === "restart_only" && batch.checkpoint !== null) {
      context.addIssue({
        code: "custom",
        message: "Restart-only runs cannot persist a Connector Checkpoint",
        path: ["batch", "checkpoint"],
      });
    }
  });

export type BrowserAccessGrant = z.infer<typeof browserAccessGrantSchema>;
export type CatalogDiscoveryCompletion = z.infer<
  typeof catalogDiscoveryCompletionSchema
>;
export type CertificationClaim = z.infer<typeof certificationClaimSchema>;
export type CommitConnectorBatchCommand = z.infer<
  typeof commitConnectorBatchCommandSchema
>;
export type ConnectorCheckpoint = z.infer<typeof connectorCheckpointSchema>;
export type ConnectorAdapterManifest = z.infer<
  typeof connectorAdapterManifestSchema
>;
export type ConnectorFailure = z.infer<typeof connectorFailureSchema>;
export type ConnectorJob = z.infer<typeof connectorJobSchema>;
export type ConnectorListingObservation = z.infer<
  typeof connectorListingObservationSchema
>;
export type ConnectorObservationBatch = z.infer<
  typeof connectorObservationBatchSchema
>;
export type ConnectorRunMetrics = z.infer<typeof connectorRunMetricsSchema>;
export type ConnectorResumeMode = z.infer<typeof connectorResumeModeSchema>;
export type SourceEvidenceArtifactInput = z.infer<
  typeof sourceEvidenceArtifactInputSchema
>;
export type StockMonitoringCompletion = z.infer<
  typeof stockMonitoringCompletionSchema
>;
export type StockMonitoringTarget = z.infer<typeof stockMonitoringTargetSchema>;
export type StockMonitoringTargetOutcome = z.infer<
  typeof stockMonitoringTargetOutcomeSchema
>;
export type StorefrontIntegration = z.infer<typeof storefrontIntegrationSchema>;
