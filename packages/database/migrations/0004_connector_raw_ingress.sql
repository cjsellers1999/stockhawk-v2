CREATE TABLE "connector_evidence_artifact" (
	"artifact_payload" jsonb NOT NULL,
	"batch_id" bigint NOT NULL,
	"content" text NOT NULL,
	"content_hash" text NOT NULL,
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "connector_evidence_artifact_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"media_type" text NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"source_url" text NOT NULL,
	"stockhawk_identity" text NOT NULL,
	CONSTRAINT "connector_evidence_artifact_stockhawk_identity_unique" UNIQUE("stockhawk_identity"),
	CONSTRAINT "connector_evidence_artifact_hash_check" CHECK ("connector_evidence_artifact"."content_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "connector_evidence_artifact_payload_check" CHECK (jsonb_typeof("connector_evidence_artifact"."artifact_payload") = 'object'
        and "connector_evidence_artifact"."artifact_payload"->>'identity' = "connector_evidence_artifact"."stockhawk_identity")
);
--> statement-breakpoint
CREATE TABLE "connector_listing_observation" (
	"access_method" text NOT NULL,
	"batch_id" bigint NOT NULL,
	"evidence_artifact_id" bigint NOT NULL,
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "connector_listing_observation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"observation_payload" jsonb NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"parent_source_identity_namespace" text NOT NULL,
	"parent_source_identity_rule_version" integer NOT NULL,
	"parent_source_identity_value" text NOT NULL,
	"stockhawk_identity" text NOT NULL,
	"variant_source_identity_namespace" text NOT NULL,
	"variant_source_identity_rule_version" integer NOT NULL,
	"variant_source_identity_value" text NOT NULL,
	CONSTRAINT "connector_listing_observation_stockhawk_identity_unique" UNIQUE("stockhawk_identity"),
	CONSTRAINT "connector_listing_observation_batch_variant_unique" UNIQUE("batch_id","variant_source_identity_namespace","variant_source_identity_rule_version","variant_source_identity_value"),
	CONSTRAINT "connector_listing_observation_access_method_check" CHECK ("connector_listing_observation"."access_method" in ('http', 'browser')),
	CONSTRAINT "connector_listing_observation_rule_version_check" CHECK ("connector_listing_observation"."parent_source_identity_rule_version" > 0
        and "connector_listing_observation"."variant_source_identity_rule_version" > 0),
	CONSTRAINT "connector_listing_observation_payload_check" CHECK (jsonb_typeof("connector_listing_observation"."observation_payload") = 'object')
);
--> statement-breakpoint
ALTER TABLE "connector_evidence_artifact" ADD CONSTRAINT "connector_evidence_batch_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."connector_observation_batch"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connector_listing_observation" ADD CONSTRAINT "connector_listing_observation_batch_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."connector_observation_batch"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connector_listing_observation" ADD CONSTRAINT "connector_listing_observation_evidence_fk" FOREIGN KEY ("evidence_artifact_id") REFERENCES "public"."connector_evidence_artifact"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "connector_evidence_artifact_batch_id_idx" ON "connector_evidence_artifact" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "connector_listing_observation_batch_id_idx" ON "connector_listing_observation" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "connector_listing_observation_evidence_id_idx" ON "connector_listing_observation" USING btree ("evidence_artifact_id");
