import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  pgView,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const internalIdentity = (name: string) =>
  bigint(name, { mode: "number" }).primaryKey().generatedAlwaysAsIdentity();
const recordedAt = (name: string) =>
  timestamp(name, { mode: "date", withTimezone: true }).defaultNow().notNull();

export const serviceHeartbeat = pgTable("service_heartbeat", {
  observedAt: timestamp("observed_at", {
    mode: "date",
    withTimezone: true,
  }).notNull(),
  serviceName: text("service_name").primaryKey(),
});

export const storefront = pgTable("storefront", {
  createdAt: recordedAt("created_at"),
  hostname: text("hostname").notNull(),
  id: internalIdentity("id"),
  name: text("name").notNull(),
  origin: text("origin").notNull(),
  stockhawkIdentity: text("stockhawk_identity")
    .notNull()
    .unique("storefront_stockhawk_identity_unique"),
});

export const product = pgTable("product", {
  canonicalName: text("canonical_name").notNull(),
  createdAt: recordedAt("created_at"),
  id: internalIdentity("id"),
  stockhawkIdentity: text("stockhawk_identity")
    .notNull()
    .unique("product_stockhawk_identity_unique"),
  variant: text("variant").notNull(),
});

export const sourceEvidenceArtifact = pgTable(
  "source_evidence_artifact",
  {
    contentHash: text("content_hash").notNull(),
    id: internalIdentity("id"),
    observedAt: timestamp("observed_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    recordedAt: recordedAt("recorded_at"),
    sourceUrl: text("source_url").notNull(),
    stockhawkIdentity: text("stockhawk_identity")
      .notNull()
      .unique("source_evidence_artifact_stockhawk_identity_unique"),
  },
  (table) => [
    check(
      "source_evidence_artifact_content_hash_check",
      sql`${table.contentHash} ~ '^[a-f0-9]{64}$'`,
    ),
  ],
);

export const observationBatch = pgTable(
  "observation_batch",
  {
    commandHash: text("command_hash").notNull(),
    committedAt: recordedAt("committed_at"),
    id: internalIdentity("id"),
    idempotencyKey: text("idempotency_key")
      .notNull()
      .unique("observation_batch_idempotency_key_unique"),
    runIdentity: text("run_identity").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    stockhawkIdentity: text("stockhawk_identity")
      .notNull()
      .unique("observation_batch_stockhawk_identity_unique"),
  },
  (table) => [
    check(
      "observation_batch_command_hash_check",
      sql`${table.commandHash} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      "observation_batch_schema_version_check",
      sql`${table.schemaVersion} = 1`,
    ),
  ],
);

export const retailerListing = pgTable(
  "retailer_listing",
  {
    currentObservationOrder: bigint("current_observation_order", {
      mode: "number",
    }).notNull(),
    currentObservedAt: timestamp("current_observed_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    id: internalIdentity("id"),
    imageUrl: text("image_url"),
    listingPresence: text("listing_presence").notNull(),
    purchaseUrl: text("purchase_url").notNull(),
    rawTitle: text("raw_title").notNull(),
    sourceIdentityNamespace: text("source_identity_namespace").notNull(),
    sourceIdentityRuleVersion: integer(
      "source_identity_rule_version",
    ).notNull(),
    sourceIdentityValue: text("source_identity_value").notNull(),
    stockhawkIdentity: text("stockhawk_identity")
      .notNull()
      .unique("retailer_listing_stockhawk_identity_unique"),
    storefrontId: bigint("storefront_id", { mode: "number" })
      .notNull()
      .references(() => storefront.id, { onDelete: "restrict" }),
  },
  (table) => [
    uniqueIndex("retailer_listing_source_identity_unique").on(
      table.storefrontId,
      table.sourceIdentityNamespace,
      table.sourceIdentityValue,
    ),
    index("retailer_listing_storefront_id_idx").on(table.storefrontId),
    check(
      "retailer_listing_presence_check",
      sql`${table.listingPresence} in ('active', 'inactive')`,
    ),
    check(
      "retailer_listing_source_rule_version_check",
      sql`${table.sourceIdentityRuleVersion} > 0`,
    ),
    check(
      "retailer_listing_observation_order_check",
      sql`${table.currentObservationOrder} >= 0`,
    ),
  ],
);

export const retailerListingObservation = pgTable(
  "retailer_listing_observation",
  {
    batchId: bigint("batch_id", { mode: "number" }).notNull(),
    evidenceArtifactId: bigint("evidence_artifact_id", {
      mode: "number",
    }).notNull(),
    id: internalIdentity("id"),
    imageUrl: text("image_url"),
    observationOrder: bigint("observation_order", {
      mode: "number",
    }).notNull(),
    observedAt: timestamp("observed_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    purchaseUrl: text("purchase_url").notNull(),
    rawTitle: text("raw_title").notNull(),
    retailerListingId: bigint("retailer_listing_id", {
      mode: "number",
    }).notNull(),
    stockhawkIdentity: text("stockhawk_identity")
      .notNull()
      .unique("retailer_listing_observation_stockhawk_identity_unique"),
  },
  (table) => [
    foreignKey({
      columns: [table.batchId],
      foreignColumns: [observationBatch.id],
      name: "listing_observation_batch_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.evidenceArtifactId],
      foreignColumns: [sourceEvidenceArtifact.id],
      name: "listing_observation_evidence_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.retailerListingId],
      foreignColumns: [retailerListing.id],
      name: "listing_observation_listing_fk",
    }).onDelete("restrict"),
    uniqueIndex("retailer_listing_observation_batch_item_unique").on(
      table.batchId,
      table.retailerListingId,
    ),
    unique("retailer_listing_observation_event_facts_unique").on(
      table.id,
      table.batchId,
      table.retailerListingId,
      table.observedAt,
    ),
    index("retailer_listing_observation_evidence_artifact_id_idx").on(
      table.evidenceArtifactId,
    ),
    index("retailer_listing_observation_retailer_listing_id_idx").on(
      table.retailerListingId,
    ),
    check(
      "retailer_listing_observation_order_check",
      sql`${table.observationOrder} >= 0`,
    ),
  ],
);

export const catalogMatch = pgTable(
  "catalog_match",
  {
    active: boolean("active").default(true).notNull(),
    evidenceArtifactId: bigint("evidence_artifact_id", {
      mode: "number",
    }).notNull(),
    id: internalIdentity("id"),
    matchAuthority: text("match_authority").notNull(),
    matchedAt: timestamp("matched_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    productId: bigint("product_id", { mode: "number" })
      .notNull()
      .references(() => product.id, { onDelete: "restrict" }),
    retailerListingId: bigint("retailer_listing_id", { mode: "number" })
      .notNull()
      .references(() => retailerListing.id, { onDelete: "restrict" }),
    retiredAt: timestamp("retired_at", {
      mode: "date",
      withTimezone: true,
    }),
    stockhawkIdentity: text("stockhawk_identity")
      .notNull()
      .unique("catalog_match_stockhawk_identity_unique"),
  },
  (table) => [
    uniqueIndex("catalog_match_active_listing_unique")
      .on(table.retailerListingId)
      .where(sql`${table.active}`),
    foreignKey({
      columns: [table.evidenceArtifactId],
      foreignColumns: [sourceEvidenceArtifact.id],
      name: "catalog_match_evidence_fk",
    }).onDelete("restrict"),
    index("catalog_match_evidence_artifact_id_idx").on(
      table.evidenceArtifactId,
    ),
    index("catalog_match_product_id_idx").on(table.productId),
    index("catalog_match_retailer_listing_id_idx").on(table.retailerListingId),
    check(
      "catalog_match_active_retirement_check",
      sql`(${table.active} and ${table.retiredAt} is null) or (not ${table.active} and ${table.retiredAt} is not null)`,
    ),
  ],
);

export const stockObservation = pgTable(
  "stock_observation",
  {
    batchId: bigint("batch_id", { mode: "number" }).notNull(),
    evidenceArtifactId: bigint("evidence_artifact_id", {
      mode: "number",
    }).notNull(),
    id: internalIdentity("id"),
    observationOrder: bigint("observation_order", {
      mode: "number",
    }).notNull(),
    observedAt: timestamp("observed_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    retailerListingId: bigint("retailer_listing_id", {
      mode: "number",
    }).notNull(),
    status: text("status").notNull(),
    stockhawkIdentity: text("stockhawk_identity")
      .notNull()
      .unique("stock_observation_stockhawk_identity_unique"),
  },
  (table) => [
    foreignKey({
      columns: [table.batchId],
      foreignColumns: [observationBatch.id],
      name: "stock_observation_batch_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.evidenceArtifactId],
      foreignColumns: [sourceEvidenceArtifact.id],
      name: "stock_observation_evidence_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.retailerListingId],
      foreignColumns: [retailerListing.id],
      name: "stock_observation_listing_fk",
    }).onDelete("restrict"),
    uniqueIndex("stock_observation_batch_listing_unique").on(
      table.batchId,
      table.retailerListingId,
    ),
    unique("stock_observation_current_state_facts_unique").on(
      table.id,
      table.retailerListingId,
      table.observationOrder,
      table.observedAt,
      table.status,
    ),
    unique("stock_observation_event_facts_unique").on(
      table.id,
      table.batchId,
      table.retailerListingId,
      table.observedAt,
      table.status,
    ),
    index("stock_observation_evidence_artifact_id_idx").on(
      table.evidenceArtifactId,
    ),
    index("stock_observation_retailer_listing_id_idx").on(
      table.retailerListingId,
    ),
    check(
      "stock_observation_status_check",
      sql`${table.status} in ('in_stock', 'out_of_stock', 'preorder', 'unknown')`,
    ),
    check("stock_observation_order_check", sql`${table.observationOrder} >= 0`),
  ],
);

export const currentStockState = pgTable(
  "current_stock_state",
  {
    observationOrder: bigint("observation_order", {
      mode: "number",
    }).notNull(),
    observedAt: timestamp("observed_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    retailerListingId: bigint("retailer_listing_id", { mode: "number" })
      .primaryKey()
      .references(() => retailerListing.id, { onDelete: "restrict" }),
    status: text("status").notNull(),
    stockObservationId: bigint("stock_observation_id", { mode: "number" })
      .notNull()
      .unique("current_stock_state_stock_observation_id_unique"),
  },
  (table) => [
    foreignKey({
      columns: [
        table.stockObservationId,
        table.retailerListingId,
        table.observationOrder,
        table.observedAt,
        table.status,
      ],
      foreignColumns: [
        stockObservation.id,
        stockObservation.retailerListingId,
        stockObservation.observationOrder,
        stockObservation.observedAt,
        stockObservation.status,
      ],
      name: "current_stock_state_observation_facts_fk",
    }).onDelete("restrict"),
    check(
      "current_stock_state_status_check",
      sql`${table.status} in ('in_stock', 'out_of_stock', 'preorder', 'unknown')`,
    ),
    check(
      "current_stock_state_observation_order_check",
      sql`${table.observationOrder} >= 0`,
    ),
  ],
);

export const searchDocument = pgTable(
  "search_document",
  {
    canonicalProductName: text("canonical_product_name").notNull(),
    classification: text("classification").notNull(),
    imageUrl: text("image_url"),
    lastCheckedAt: timestamp("last_checked_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    listingIdentity: text("listing_identity")
      .notNull()
      .unique("search_document_listing_identity_unique"),
    listingPresence: text("listing_presence").notNull(),
    matchStatus: text("match_status").notNull(),
    productId: bigint("product_id", { mode: "number" })
      .notNull()
      .references(() => product.id, { onDelete: "restrict" }),
    projectionVersion: integer("projection_version").default(1).notNull(),
    purchaseUrl: text("purchase_url").notNull(),
    rawTitle: text("raw_title").notNull(),
    retailerListingId: bigint("retailer_listing_id", { mode: "number" })
      .primaryKey()
      .references(() => retailerListing.id, { onDelete: "restrict" }),
    stockStatus: text("stock_status").notNull(),
    storefrontHostname: text("storefront_hostname").notNull(),
    storefrontId: bigint("storefront_id", { mode: "number" })
      .notNull()
      .references(() => storefront.id, { onDelete: "restrict" }),
    storefrontName: text("storefront_name").notNull(),
    updatedAt: recordedAt("updated_at"),
    variant: text("variant").notNull(),
  },
  (table) => [
    index("search_document_product_id_idx").on(table.productId),
    index("search_document_storefront_id_idx").on(table.storefrontId),
    index("search_document_offer_freshness_idx")
      .on(table.lastCheckedAt.desc(), table.retailerListingId)
      .where(
        sql`${table.classification} = 'offer' and ${table.matchStatus} = 'confirmed' and ${table.listingPresence} = 'active'`,
      ),
    check(
      "search_document_classification_check",
      sql`${table.classification} = 'offer'`,
    ),
    check(
      "search_document_match_status_check",
      sql`${table.matchStatus} = 'confirmed'`,
    ),
    check(
      "search_document_listing_presence_check",
      sql`${table.listingPresence} in ('active', 'inactive')`,
    ),
    check(
      "search_document_stock_status_check",
      sql`${table.stockStatus} in ('in_stock', 'out_of_stock', 'preorder', 'unknown')`,
    ),
    check(
      "search_document_projection_version_check",
      sql`${table.projectionVersion} = 1`,
    ),
  ],
);

export const changeEvent = pgTable(
  "change_event",
  {
    batchId: bigint("batch_id", { mode: "number" })
      .notNull()
      .references(() => observationBatch.id, { onDelete: "restrict" }),
    causalIdempotencyKey: text("causal_idempotency_key")
      .notNull()
      .unique("change_event_causal_idempotency_key_unique"),
    effectiveAt: timestamp("effective_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    eventType: text("event_type").notNull(),
    listingObservationId: bigint("listing_observation_id", {
      mode: "number",
    }),
    newValue: text("new_value").notNull(),
    previousValue: text("previous_value"),
    productId: bigint("product_id", { mode: "number" })
      .notNull()
      .references(() => product.id, { onDelete: "restrict" }),
    recordedAt: recordedAt("recorded_at"),
    retailerListingId: bigint("retailer_listing_id", { mode: "number" })
      .notNull()
      .references(() => retailerListing.id, { onDelete: "restrict" }),
    schemaVersion: integer("schema_version").notNull(),
    stockObservationId: bigint("stock_observation_id", {
      mode: "number",
    }).references(() => stockObservation.id, { onDelete: "restrict" }),
    stockhawkIdentity: text("stockhawk_identity")
      .notNull()
      .unique("change_event_stockhawk_identity_unique"),
    streamPosition: bigint("stream_position", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
  },
  (table) => [
    foreignKey({
      columns: [table.listingObservationId],
      foreignColumns: [retailerListingObservation.id],
      name: "change_event_listing_observation_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [
        table.listingObservationId,
        table.batchId,
        table.retailerListingId,
        table.effectiveAt,
      ],
      foreignColumns: [
        retailerListingObservation.id,
        retailerListingObservation.batchId,
        retailerListingObservation.retailerListingId,
        retailerListingObservation.observedAt,
      ],
      name: "change_event_listing_causality_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [
        table.stockObservationId,
        table.batchId,
        table.retailerListingId,
        table.effectiveAt,
        table.newValue,
      ],
      foreignColumns: [
        stockObservation.id,
        stockObservation.batchId,
        stockObservation.retailerListingId,
        stockObservation.observedAt,
        stockObservation.status,
      ],
      name: "change_event_stock_causality_fk",
    }).onDelete("restrict"),
    index("change_event_batch_id_idx").on(table.batchId),
    index("change_event_listing_observation_id_idx").on(
      table.listingObservationId,
    ),
    index("change_event_product_id_idx").on(table.productId),
    index("change_event_retailer_listing_id_idx").on(table.retailerListingId),
    index("change_event_stock_observation_id_idx").on(table.stockObservationId),
    check(
      "change_event_event_type_check",
      sql`${table.eventType} in ('listing_discovered', 'stock_status_changed')`,
    ),
    check(
      "change_event_payload_check",
      sql`(
        ${table.eventType} = 'listing_discovered'
        and ${table.listingObservationId} is not null
        and ${table.stockObservationId} is null
        and ${table.previousValue} is null
        and ${table.newValue} = 'active'
      ) or (
        ${table.eventType} = 'stock_status_changed'
        and ${table.listingObservationId} is not null
        and ${table.stockObservationId} is not null
        and ${table.previousValue} is not null
        and ${table.previousValue} in ('in_stock', 'out_of_stock', 'preorder', 'unknown')
        and ${table.newValue} in ('in_stock', 'out_of_stock', 'preorder', 'unknown')
        and ${table.previousValue} <> ${table.newValue}
      )`,
    ),
    check("change_event_schema_version_check", sql`${table.schemaVersion} = 1`),
  ],
);

export const searchDocumentSource = pgView("search_document_source", {
  canonicalProductName: text("canonical_product_name").notNull(),
  classification: text("classification").notNull(),
  imageUrl: text("image_url"),
  lastCheckedAt: timestamp("last_checked_at", {
    mode: "date",
    withTimezone: true,
  }).notNull(),
  listingIdentity: text("listing_identity").notNull(),
  listingPresence: text("listing_presence").notNull(),
  matchStatus: text("match_status").notNull(),
  productId: bigint("product_id", { mode: "number" }).notNull(),
  projectionVersion: integer("projection_version").notNull(),
  purchaseUrl: text("purchase_url").notNull(),
  rawTitle: text("raw_title").notNull(),
  retailerListingId: bigint("retailer_listing_id", {
    mode: "number",
  }).notNull(),
  stockStatus: text("stock_status").notNull(),
  storefrontHostname: text("storefront_hostname").notNull(),
  storefrontId: bigint("storefront_id", { mode: "number" }).notNull(),
  storefrontName: text("storefront_name").notNull(),
  updatedAt: timestamp("updated_at", {
    mode: "date",
    withTimezone: true,
  }).notNull(),
  variant: text("variant").notNull(),
}).as(sql`
  select
    matched_product.canonical_name as canonical_product_name,
    'offer'::text as classification,
    listing.image_url,
    stock.observed_at as last_checked_at,
    listing.stockhawk_identity as listing_identity,
    listing.listing_presence,
    'confirmed'::text as match_status,
    matched_product.id as product_id,
    1::integer as projection_version,
    listing.purchase_url,
    listing.raw_title,
    listing.id as retailer_listing_id,
    stock.status as stock_status,
    matched_storefront.hostname as storefront_hostname,
    matched_storefront.id as storefront_id,
    matched_storefront.name as storefront_name,
    now() as updated_at,
    matched_product.variant
  from retailer_listing as listing
  inner join catalog_match as active_match
    on active_match.retailer_listing_id = listing.id
    and active_match.active
  inner join product as matched_product
    on matched_product.id = active_match.product_id
  inner join storefront as matched_storefront
    on matched_storefront.id = listing.storefront_id
  inner join current_stock_state as stock
    on stock.retailer_listing_id = listing.id
`);

export const schema = {
  catalogMatch,
  changeEvent,
  currentStockState,
  observationBatch,
  product,
  retailerListing,
  retailerListingObservation,
  searchDocument,
  searchDocumentSource,
  serviceHeartbeat,
  sourceEvidenceArtifact,
  stockObservation,
  storefront,
};
