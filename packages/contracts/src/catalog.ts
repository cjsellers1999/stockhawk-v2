import { z } from "zod";

const identitySchema = z.string().trim().min(1).max(128);
const httpUrlSchema = z
  .url()
  .refine(
    (value) => value.startsWith("http://") || value.startsWith("https://"),
    "Expected an HTTP(S) URL",
  );
const originSchema = httpUrlSchema.regex(
  /^https?:\/\/[^/?#]+$/,
  "Expected an origin without a path, query, or fragment",
);

export const stockStatusSchema = z.enum([
  "in_stock",
  "out_of_stock",
  "preorder",
  "unknown",
]);

export const commitObservationBatchCommandSchema = z
  .object({
    batchIdentity: identitySchema,
    catalogMatchIdentity: identitySchema,
    evidence: z
      .object({
        contentHash: z.string().regex(/^[a-f\d]{64}$/),
        identity: identitySchema,
        sourceUrl: httpUrlSchema,
      })
      .strict(),
    idempotencyKey: identitySchema,
    listing: z
      .object({
        identity: identitySchema,
        imageUrl: httpUrlSchema.nullable(),
        purchaseUrl: httpUrlSchema,
        rawTitle: z.string().trim().min(1).max(1_000),
        sourceIdentity: z
          .object({
            namespace: z.string().trim().min(1).max(128),
            ruleVersion: z.number().int().positive(),
            value: z.string().trim().min(1).max(1_000),
          })
          .strict(),
      })
      .strict(),
    listingObservationIdentity: identitySchema,
    observedAt: z.iso.datetime({ offset: true }),
    observationOrder: z.number().int().nonnegative(),
    product: z
      .object({
        canonicalName: z.string().trim().min(1).max(1_000),
        identity: identitySchema,
        variant: z.string().trim().min(1).max(1_000),
      })
      .strict(),
    runIdentity: identitySchema,
    schemaVersion: z.literal(1),
    stock: z
      .object({
        identity: identitySchema,
        status: stockStatusSchema,
      })
      .strict(),
    storefront: z
      .object({
        identity: identitySchema,
        name: z.string().trim().min(1).max(500),
        origin: originSchema,
      })
      .strict(),
  })
  .strict();

export type CommitObservationBatchCommand = z.infer<
  typeof commitObservationBatchCommandSchema
>;

const searchTermsSchema = z.preprocess(
  (value) => {
    if (value === undefined) {
      return [];
    }
    return Array.isArray(value) ? value : [value];
  },
  z.array(z.string().trim().min(1).max(200)).max(20),
);

export const offerSearchQuerySchema = z
  .object({
    freshness: z.enum(["all", "fresh", "stale"]).default("all"),
    match: z.enum(["all", "confirmed", "provisional"]).default("all"),
    q: searchTermsSchema,
    stock: z
      .enum(["all", "in_stock", "out_of_stock", "preorder", "unknown"])
      .default("all"),
    view: z.enum(["flat", "storefront"]).default("flat"),
  })
  .strict();

export type OfferSearchQuery = z.infer<typeof offerSearchQuerySchema>;

export const offerSchema = z
  .object({
    canonicalProductName: z.string(),
    imageUrl: httpUrlSchema.nullable(),
    lastCheckedAt: z.iso.datetime({ offset: true }),
    listingIdentity: identitySchema,
    listingPresence: z.literal("active"),
    matchStatus: z.literal("confirmed"),
    purchaseUrl: httpUrlSchema,
    rawTitle: z.string(),
    stockStatus: stockStatusSchema,
    storefrontHostname: z.string().min(1),
    storefrontName: z.string().min(1),
    variant: z.string(),
  })
  .strict();

export type Offer = z.infer<typeof offerSchema>;

export const offerSearchResponseSchema = z
  .object({
    items: z.array(offerSchema),
    total: z.number().int().nonnegative(),
  })
  .strict();

export type OfferSearchResponse = z.infer<typeof offerSearchResponseSchema>;
