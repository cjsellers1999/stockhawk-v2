CREATE TABLE "catalog_match" (
	"active" boolean DEFAULT true NOT NULL,
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "catalog_match_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"match_authority" text NOT NULL,
	"matched_at" timestamp with time zone NOT NULL,
	"product_id" bigint NOT NULL,
	"retailer_listing_id" bigint NOT NULL,
	"retired_at" timestamp with time zone,
	"stockhawk_identity" text NOT NULL,
	CONSTRAINT "catalog_match_stockhawk_identity_unique" UNIQUE("stockhawk_identity"),
	CONSTRAINT "catalog_match_active_retirement_check" CHECK (("catalog_match"."active" and "catalog_match"."retired_at" is null) or (not "catalog_match"."active" and "catalog_match"."retired_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "change_event" (
	"batch_id" bigint NOT NULL,
	"causal_idempotency_key" text NOT NULL,
	"effective_at" timestamp with time zone NOT NULL,
	"event_type" text NOT NULL,
	"listing_observation_id" bigint,
	"new_value" text NOT NULL,
	"previous_value" text,
	"product_id" bigint NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retailer_listing_id" bigint NOT NULL,
	"schema_version" integer NOT NULL,
	"stock_observation_id" bigint,
	"stockhawk_identity" text NOT NULL,
	"stream_position" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "change_event_stream_position_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	CONSTRAINT "change_event_causal_idempotency_key_unique" UNIQUE("causal_idempotency_key"),
	CONSTRAINT "change_event_stockhawk_identity_unique" UNIQUE("stockhawk_identity"),
	CONSTRAINT "change_event_event_type_check" CHECK ("change_event"."event_type" in ('listing_discovered', 'stock_status_changed')),
	CONSTRAINT "change_event_schema_version_check" CHECK ("change_event"."schema_version" = 1)
);
--> statement-breakpoint
CREATE TABLE "current_stock_state" (
	"observation_order" bigint NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"retailer_listing_id" bigint PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"stock_observation_id" bigint NOT NULL,
	CONSTRAINT "current_stock_state_stock_observation_id_unique" UNIQUE("stock_observation_id"),
	CONSTRAINT "current_stock_state_status_check" CHECK ("current_stock_state"."status" in ('in_stock', 'out_of_stock', 'preorder', 'unknown')),
	CONSTRAINT "current_stock_state_observation_order_check" CHECK ("current_stock_state"."observation_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "observation_batch" (
	"command_hash" text NOT NULL,
	"committed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "observation_batch_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"idempotency_key" text NOT NULL,
	"run_identity" text NOT NULL,
	"schema_version" integer NOT NULL,
	"stockhawk_identity" text NOT NULL,
	CONSTRAINT "observation_batch_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "observation_batch_command_hash_check" CHECK ("observation_batch"."command_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "observation_batch_schema_version_check" CHECK ("observation_batch"."schema_version" = 1)
);
--> statement-breakpoint
CREATE TABLE "product" (
	"canonical_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "product_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"stockhawk_identity" text NOT NULL,
	"variant" text NOT NULL,
	CONSTRAINT "product_stockhawk_identity_unique" UNIQUE("stockhawk_identity")
);
--> statement-breakpoint
CREATE TABLE "retailer_listing" (
	"current_observation_order" bigint NOT NULL,
	"current_observed_at" timestamp with time zone NOT NULL,
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "retailer_listing_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"image_url" text,
	"listing_presence" text NOT NULL,
	"purchase_url" text NOT NULL,
	"raw_title" text NOT NULL,
	"source_identity_namespace" text NOT NULL,
	"source_identity_rule_version" integer NOT NULL,
	"source_identity_value" text NOT NULL,
	"stockhawk_identity" text NOT NULL,
	"storefront_id" bigint NOT NULL,
	CONSTRAINT "retailer_listing_stockhawk_identity_unique" UNIQUE("stockhawk_identity"),
	CONSTRAINT "retailer_listing_presence_check" CHECK ("retailer_listing"."listing_presence" in ('active', 'inactive')),
	CONSTRAINT "retailer_listing_source_rule_version_check" CHECK ("retailer_listing"."source_identity_rule_version" > 0),
	CONSTRAINT "retailer_listing_observation_order_check" CHECK ("retailer_listing"."current_observation_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "retailer_listing_observation" (
	"batch_id" bigint NOT NULL,
	"evidence_artifact_id" bigint NOT NULL,
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "retailer_listing_observation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"image_url" text,
	"observation_order" bigint NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"purchase_url" text NOT NULL,
	"raw_title" text NOT NULL,
	"retailer_listing_id" bigint NOT NULL,
	"stockhawk_identity" text NOT NULL,
	CONSTRAINT "retailer_listing_observation_stockhawk_identity_unique" UNIQUE("stockhawk_identity"),
	CONSTRAINT "retailer_listing_observation_order_check" CHECK ("retailer_listing_observation"."observation_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "search_document" (
	"canonical_product_name" text NOT NULL,
	"classification" text NOT NULL,
	"image_url" text,
	"last_checked_at" timestamp with time zone NOT NULL,
	"listing_identity" text NOT NULL,
	"listing_presence" text NOT NULL,
	"match_status" text NOT NULL,
	"product_id" bigint NOT NULL,
	"projection_version" integer DEFAULT 1 NOT NULL,
	"purchase_url" text NOT NULL,
	"raw_title" text NOT NULL,
	"retailer_listing_id" bigint PRIMARY KEY NOT NULL,
	"stock_status" text NOT NULL,
	"storefront_hostname" text NOT NULL,
	"storefront_id" bigint NOT NULL,
	"storefront_name" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"variant" text NOT NULL,
	CONSTRAINT "search_document_listing_identity_unique" UNIQUE("listing_identity"),
	CONSTRAINT "search_document_classification_check" CHECK ("search_document"."classification" = 'offer'),
	CONSTRAINT "search_document_match_status_check" CHECK ("search_document"."match_status" = 'confirmed'),
	CONSTRAINT "search_document_listing_presence_check" CHECK ("search_document"."listing_presence" in ('active', 'inactive')),
	CONSTRAINT "search_document_stock_status_check" CHECK ("search_document"."stock_status" in ('in_stock', 'out_of_stock', 'preorder', 'unknown')),
	CONSTRAINT "search_document_projection_version_check" CHECK ("search_document"."projection_version" = 1)
);
--> statement-breakpoint
CREATE TABLE "source_evidence_artifact" (
	"content_hash" text NOT NULL,
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "source_evidence_artifact_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"observed_at" timestamp with time zone NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_url" text NOT NULL,
	"stockhawk_identity" text NOT NULL,
	CONSTRAINT "source_evidence_artifact_stockhawk_identity_unique" UNIQUE("stockhawk_identity"),
	CONSTRAINT "source_evidence_artifact_content_hash_check" CHECK ("source_evidence_artifact"."content_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE TABLE "stock_observation" (
	"batch_id" bigint NOT NULL,
	"evidence_artifact_id" bigint NOT NULL,
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stock_observation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"observation_order" bigint NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"retailer_listing_id" bigint NOT NULL,
	"status" text NOT NULL,
	"stockhawk_identity" text NOT NULL,
	CONSTRAINT "stock_observation_stockhawk_identity_unique" UNIQUE("stockhawk_identity"),
	CONSTRAINT "stock_observation_id_listing_unique" UNIQUE("id","retailer_listing_id"),
	CONSTRAINT "stock_observation_status_check" CHECK ("stock_observation"."status" in ('in_stock', 'out_of_stock', 'preorder', 'unknown')),
	CONSTRAINT "stock_observation_order_check" CHECK ("stock_observation"."observation_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "storefront" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"hostname" text NOT NULL,
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "storefront_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"origin" text NOT NULL,
	"stockhawk_identity" text NOT NULL,
	CONSTRAINT "storefront_stockhawk_identity_unique" UNIQUE("stockhawk_identity")
);
--> statement-breakpoint
ALTER TABLE "catalog_match" ADD CONSTRAINT "catalog_match_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_match" ADD CONSTRAINT "catalog_match_retailer_listing_id_retailer_listing_id_fk" FOREIGN KEY ("retailer_listing_id") REFERENCES "public"."retailer_listing"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_event" ADD CONSTRAINT "change_event_batch_id_observation_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."observation_batch"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_event" ADD CONSTRAINT "change_event_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_event" ADD CONSTRAINT "change_event_retailer_listing_id_retailer_listing_id_fk" FOREIGN KEY ("retailer_listing_id") REFERENCES "public"."retailer_listing"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_event" ADD CONSTRAINT "change_event_stock_observation_id_stock_observation_id_fk" FOREIGN KEY ("stock_observation_id") REFERENCES "public"."stock_observation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_event" ADD CONSTRAINT "change_event_listing_observation_fk" FOREIGN KEY ("listing_observation_id") REFERENCES "public"."retailer_listing_observation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "current_stock_state" ADD CONSTRAINT "current_stock_state_retailer_listing_id_retailer_listing_id_fk" FOREIGN KEY ("retailer_listing_id") REFERENCES "public"."retailer_listing"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "current_stock_state" ADD CONSTRAINT "current_stock_state_observation_listing_fk" FOREIGN KEY ("stock_observation_id","retailer_listing_id") REFERENCES "public"."stock_observation"("id","retailer_listing_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retailer_listing" ADD CONSTRAINT "retailer_listing_storefront_id_storefront_id_fk" FOREIGN KEY ("storefront_id") REFERENCES "public"."storefront"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retailer_listing_observation" ADD CONSTRAINT "listing_observation_batch_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."observation_batch"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retailer_listing_observation" ADD CONSTRAINT "listing_observation_evidence_fk" FOREIGN KEY ("evidence_artifact_id") REFERENCES "public"."source_evidence_artifact"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retailer_listing_observation" ADD CONSTRAINT "listing_observation_listing_fk" FOREIGN KEY ("retailer_listing_id") REFERENCES "public"."retailer_listing"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_document" ADD CONSTRAINT "search_document_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_document" ADD CONSTRAINT "search_document_retailer_listing_id_retailer_listing_id_fk" FOREIGN KEY ("retailer_listing_id") REFERENCES "public"."retailer_listing"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_document" ADD CONSTRAINT "search_document_storefront_id_storefront_id_fk" FOREIGN KEY ("storefront_id") REFERENCES "public"."storefront"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_observation" ADD CONSTRAINT "stock_observation_batch_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."observation_batch"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_observation" ADD CONSTRAINT "stock_observation_evidence_fk" FOREIGN KEY ("evidence_artifact_id") REFERENCES "public"."source_evidence_artifact"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_observation" ADD CONSTRAINT "stock_observation_listing_fk" FOREIGN KEY ("retailer_listing_id") REFERENCES "public"."retailer_listing"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_match_active_listing_unique" ON "catalog_match" USING btree ("retailer_listing_id") WHERE "catalog_match"."active";--> statement-breakpoint
CREATE INDEX "catalog_match_product_id_idx" ON "catalog_match" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "catalog_match_retailer_listing_id_idx" ON "catalog_match" USING btree ("retailer_listing_id");--> statement-breakpoint
CREATE INDEX "change_event_batch_id_idx" ON "change_event" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "change_event_listing_observation_id_idx" ON "change_event" USING btree ("listing_observation_id");--> statement-breakpoint
CREATE INDEX "change_event_product_id_idx" ON "change_event" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "change_event_retailer_listing_id_idx" ON "change_event" USING btree ("retailer_listing_id");--> statement-breakpoint
CREATE INDEX "change_event_stock_observation_id_idx" ON "change_event" USING btree ("stock_observation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "observation_batch_run_identity_unique" ON "observation_batch" USING btree ("run_identity","stockhawk_identity");--> statement-breakpoint
CREATE UNIQUE INDEX "retailer_listing_source_identity_unique" ON "retailer_listing" USING btree ("storefront_id","source_identity_namespace","source_identity_value");--> statement-breakpoint
CREATE INDEX "retailer_listing_storefront_id_idx" ON "retailer_listing" USING btree ("storefront_id");--> statement-breakpoint
CREATE UNIQUE INDEX "retailer_listing_observation_batch_item_unique" ON "retailer_listing_observation" USING btree ("batch_id","retailer_listing_id");--> statement-breakpoint
CREATE INDEX "retailer_listing_observation_evidence_artifact_id_idx" ON "retailer_listing_observation" USING btree ("evidence_artifact_id");--> statement-breakpoint
CREATE INDEX "retailer_listing_observation_retailer_listing_id_idx" ON "retailer_listing_observation" USING btree ("retailer_listing_id");--> statement-breakpoint
CREATE INDEX "search_document_product_id_idx" ON "search_document" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "search_document_storefront_id_idx" ON "search_document" USING btree ("storefront_id");--> statement-breakpoint
CREATE INDEX "search_document_offer_freshness_idx" ON "search_document" USING btree ("last_checked_at" DESC NULLS LAST,"retailer_listing_id") WHERE "search_document"."classification" = 'offer' and "search_document"."match_status" = 'confirmed' and "search_document"."listing_presence" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "stock_observation_batch_listing_unique" ON "stock_observation" USING btree ("batch_id","retailer_listing_id");--> statement-breakpoint
CREATE INDEX "stock_observation_evidence_artifact_id_idx" ON "stock_observation" USING btree ("evidence_artifact_id");--> statement-breakpoint
CREATE INDEX "stock_observation_retailer_listing_id_idx" ON "stock_observation" USING btree ("retailer_listing_id");