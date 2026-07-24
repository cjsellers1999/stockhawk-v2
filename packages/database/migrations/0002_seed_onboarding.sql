CREATE TABLE "candidate_site" (
	"comparison_endpoint_key" text NOT NULL,
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "candidate_site_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"import_id" bigint NOT NULL,
	"name" text NOT NULL,
	"normalization_rule_version" integer NOT NULL,
	"stockhawk_identity" text NOT NULL,
	"url" text NOT NULL,
	CONSTRAINT "candidate_site_stockhawk_identity_unique" UNIQUE("stockhawk_identity"),
	CONSTRAINT "candidate_site_import_endpoint_unique" UNIQUE("import_id","comparison_endpoint_key"),
	CONSTRAINT "candidate_site_normalization_version_check" CHECK ("candidate_site"."normalization_rule_version" = 1),
	CONSTRAINT "candidate_site_url_check" CHECK ("candidate_site"."url" ~ '^https?://')
);
--> statement-breakpoint
CREATE TABLE "candidate_site_source_record" (
	"candidate_site_id" bigint NOT NULL,
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "candidate_site_source_record_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"normalization_decision" text NOT NULL,
	"normalization_rule_version" integer NOT NULL,
	"seed_site_record_id" bigint NOT NULL,
	CONSTRAINT "candidate_site_source_record_unique" UNIQUE("candidate_site_id","seed_site_record_id"),
	CONSTRAINT "candidate_site_source_record_seed_unique" UNIQUE("seed_site_record_id"),
	CONSTRAINT "candidate_site_source_record_decision_check" CHECK ("candidate_site_source_record"."normalization_decision" in ('unique_http_endpoint', 'syntactically_equivalent_http_endpoint')),
	CONSTRAINT "candidate_site_source_record_version_check" CHECK ("candidate_site_source_record"."normalization_rule_version" = 1)
);
--> statement-breakpoint
CREATE TABLE "onboarding_case" (
	"attempts" jsonb NOT NULL,
	"candidate_site_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dependencies" jsonb NOT NULL,
	"evidence" jsonb NOT NULL,
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "onboarding_case_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"next_action" text NOT NULL,
	"revision" integer NOT NULL,
	"stage" text NOT NULL,
	"status" text NOT NULL,
	"stockhawk_identity" text NOT NULL,
	"terminal" boolean NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"wait_reason" text,
	CONSTRAINT "onboarding_case_candidate_site_unique" UNIQUE("candidate_site_id"),
	CONSTRAINT "onboarding_case_stockhawk_identity_unique" UNIQUE("stockhawk_identity"),
	CONSTRAINT "onboarding_case_stage_check" CHECK ("onboarding_case"."stage" in ('preflight', 'storefront_audit', 'integration', 'qualification', 'complete')),
	CONSTRAINT "onboarding_case_status_check" CHECK ("onboarding_case"."status" in ('suspended', 'queued', 'in_progress', 'resolved')),
	CONSTRAINT "onboarding_case_terminal_check" CHECK ("onboarding_case"."terminal" = ("onboarding_case"."status" = 'resolved')),
	CONSTRAINT "onboarding_case_wait_check" CHECK ("onboarding_case"."status" <> 'suspended' or "onboarding_case"."wait_reason" is not null),
	CONSTRAINT "onboarding_case_revision_check" CHECK ("onboarding_case"."revision" >= 0),
	CONSTRAINT "onboarding_case_json_arrays_check" CHECK (jsonb_typeof("onboarding_case"."attempts") = 'array'
        and jsonb_typeof("onboarding_case"."dependencies") = 'array'
        and jsonb_typeof("onboarding_case"."evidence") = 'array')
);
--> statement-breakpoint
CREATE TABLE "seed_site_record" (
	"base_url" text NOT NULL,
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "seed_site_record_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"import_id" bigint NOT NULL,
	"legacy_connector_label" text NOT NULL,
	"name" text NOT NULL,
	"raw_record_hash" text NOT NULL,
	"raw_values" jsonb NOT NULL,
	"source_record_id" integer NOT NULL,
	"source_row_number" integer NOT NULL,
	"stockhawk_identity" text NOT NULL,
	CONSTRAINT "seed_site_record_stockhawk_identity_unique" UNIQUE("stockhawk_identity"),
	CONSTRAINT "seed_site_record_import_row_unique" UNIQUE("import_id","source_row_number"),
	CONSTRAINT "seed_site_record_import_source_id_unique" UNIQUE("import_id","source_record_id"),
	CONSTRAINT "seed_site_record_hash_check" CHECK ("seed_site_record"."raw_record_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "seed_site_record_row_check" CHECK ("seed_site_record"."source_row_number" >= 5),
	CONSTRAINT "seed_site_record_values_check" CHECK (jsonb_typeof("seed_site_record"."raw_values") = 'array'),
	CONSTRAINT "seed_site_record_url_check" CHECK ("seed_site_record"."base_url" ~ '^https?://')
);
--> statement-breakpoint
CREATE TABLE "seed_source_import" (
	"column_count" integer NOT NULL,
	"file_name" text NOT NULL,
	"file_sha256" text NOT NULL,
	"headers" jsonb NOT NULL,
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "seed_source_import_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_record_count" integer NOT NULL,
	"stockhawk_identity" text NOT NULL,
	"worksheet_name" text NOT NULL,
	CONSTRAINT "seed_source_import_stockhawk_identity_unique" UNIQUE("stockhawk_identity"),
	CONSTRAINT "seed_source_import_file_worksheet_unique" UNIQUE("file_sha256","worksheet_name"),
	CONSTRAINT "seed_source_import_sha256_check" CHECK ("seed_source_import"."file_sha256" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "seed_source_import_counts_check" CHECK ("seed_source_import"."source_record_count" > 0 and "seed_source_import"."column_count" > 0),
	CONSTRAINT "seed_source_import_headers_check" CHECK (jsonb_typeof("seed_source_import"."headers") = 'array' and jsonb_array_length("seed_source_import"."headers") = "seed_source_import"."column_count")
);
--> statement-breakpoint
ALTER TABLE "owner_command_receipt" DROP CONSTRAINT "owner_command_receipt_family_check";--> statement-breakpoint
ALTER TABLE "owner_command_receipt" ADD COLUMN "command_payload" jsonb;--> statement-breakpoint
UPDATE "owner_command_receipt"
SET "command_payload" = jsonb_build_object(
  'family', "command_family",
  'idempotencyKey', "idempotency_key"::text,
  'schemaVersion', "command_schema_version"
);--> statement-breakpoint
ALTER TABLE "owner_command_receipt" ALTER COLUMN "command_payload" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "candidate_site" ADD CONSTRAINT "candidate_site_import_id_seed_source_import_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."seed_source_import"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_site_source_record" ADD CONSTRAINT "candidate_source_candidate_fk" FOREIGN KEY ("candidate_site_id") REFERENCES "public"."candidate_site"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_site_source_record" ADD CONSTRAINT "candidate_source_seed_record_fk" FOREIGN KEY ("seed_site_record_id") REFERENCES "public"."seed_site_record"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_case" ADD CONSTRAINT "onboarding_case_candidate_site_id_candidate_site_id_fk" FOREIGN KEY ("candidate_site_id") REFERENCES "public"."candidate_site"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seed_site_record" ADD CONSTRAINT "seed_site_record_import_id_seed_source_import_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."seed_source_import"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "candidate_site_import_id_idx" ON "candidate_site" USING btree ("import_id");--> statement-breakpoint
CREATE INDEX "candidate_site_source_record_candidate_idx" ON "candidate_site_source_record" USING btree ("candidate_site_id");--> statement-breakpoint
CREATE INDEX "onboarding_case_status_idx" ON "onboarding_case" USING btree ("status","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "seed_site_record_import_id_idx" ON "seed_site_record" USING btree ("import_id");--> statement-breakpoint
ALTER TABLE "owner_command_receipt" ADD CONSTRAINT "owner_command_receipt_payload_check" CHECK (jsonb_typeof("owner_command_receipt"."command_payload") = 'object'
        and "owner_command_receipt"."command_payload"->>'family' = "owner_command_receipt"."command_family"
        and ("owner_command_receipt"."command_payload"->>'schemaVersion')::integer = "owner_command_receipt"."command_schema_version"
        and "owner_command_receipt"."command_payload"->>'idempotencyKey' = "owner_command_receipt"."idempotency_key"::text);--> statement-breakpoint
ALTER TABLE "owner_command_receipt" ADD CONSTRAINT "owner_command_receipt_family_check" CHECK ("owner_command_receipt"."command_family" in ('refresh_health', 'resume_onboarding'));
