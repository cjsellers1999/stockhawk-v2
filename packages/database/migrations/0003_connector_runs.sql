CREATE TABLE "connector_observation_batch" (
	"batch_payload" jsonb NOT NULL,
	"command_hash" text NOT NULL,
	"committed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "connector_observation_batch_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"run_id" bigint NOT NULL,
	"sequence" integer NOT NULL,
	"stockhawk_identity" text NOT NULL,
	CONSTRAINT "connector_observation_batch_stockhawk_identity_unique" UNIQUE("stockhawk_identity"),
	CONSTRAINT "connector_observation_batch_run_sequence_unique" UNIQUE("run_id","sequence"),
	CONSTRAINT "connector_observation_batch_hash_check" CHECK ("connector_observation_batch"."command_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "connector_observation_batch_sequence_check" CHECK ("connector_observation_batch"."sequence" >= 0),
	CONSTRAINT "connector_observation_batch_payload_check" CHECK (jsonb_typeof("connector_observation_batch"."batch_payload") = 'object'
        and ("connector_observation_batch"."batch_payload"->>'schemaVersion')::integer = 1
        and "connector_observation_batch"."batch_payload"->>'identity' = "connector_observation_batch"."stockhawk_identity"
        and ("connector_observation_batch"."batch_payload"->>'sequence')::integer = "connector_observation_batch"."sequence")
);
--> statement-breakpoint
CREATE TABLE "connector_run" (
	"adapter_id" text NOT NULL,
	"adapter_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "connector_run_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"integration_identity" text NOT NULL,
	"job" text NOT NULL,
	"latest_checkpoint" jsonb,
	"latest_sequence" integer NOT NULL,
	"resume_mode" text NOT NULL,
	"stockhawk_identity" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "connector_run_stockhawk_identity_unique" UNIQUE("stockhawk_identity"),
	CONSTRAINT "connector_run_job_check" CHECK ("connector_run"."job" in ('catalog_discovery', 'stock_monitoring')),
	CONSTRAINT "connector_run_resume_mode_check" CHECK ("connector_run"."resume_mode" in ('checkpoint', 'restart_only')),
	CONSTRAINT "connector_run_sequence_check" CHECK ("connector_run"."latest_sequence" >= 0),
	CONSTRAINT "connector_run_checkpoint_check" CHECK ("connector_run"."resume_mode" <> 'restart_only' or "connector_run"."latest_checkpoint" is null)
);
--> statement-breakpoint
ALTER TABLE "connector_observation_batch" ADD CONSTRAINT "connector_observation_batch_run_id_connector_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."connector_run"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "connector_observation_batch_run_id_idx" ON "connector_observation_batch" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "connector_run_integration_updated_idx" ON "connector_run" USING btree ("integration_identity","updated_at" DESC NULLS LAST);
