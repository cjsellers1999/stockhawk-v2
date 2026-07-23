CREATE TABLE "admin_session" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"csrf_token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "admin_session_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"session_token_hash" text NOT NULL,
	CONSTRAINT "admin_session_token_hash_unique" UNIQUE("session_token_hash"),
	CONSTRAINT "admin_session_token_hash_check" CHECK ("admin_session"."session_token_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "admin_session_csrf_hash_check" CHECK ("admin_session"."csrf_token_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "admin_session_expiry_check" CHECK ("admin_session"."expires_at" > "admin_session"."created_at")
);
--> statement-breakpoint
CREATE TABLE "owner_command_receipt" (
	"command_family" text NOT NULL,
	"command_hash" text NOT NULL,
	"command_schema_version" integer NOT NULL,
	"completed_at" timestamp with time zone,
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "owner_command_receipt_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"idempotency_key" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"requested_by_session_id" bigint NOT NULL,
	"status" text NOT NULL,
	"stockhawk_identity" uuid NOT NULL,
	CONSTRAINT "owner_command_receipt_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "owner_command_receipt_job_id_unique" UNIQUE("job_id"),
	CONSTRAINT "owner_command_receipt_stockhawk_identity_unique" UNIQUE("stockhawk_identity"),
	CONSTRAINT "owner_command_receipt_family_check" CHECK ("owner_command_receipt"."command_family" = 'refresh_health'),
	CONSTRAINT "owner_command_receipt_command_hash_check" CHECK ("owner_command_receipt"."command_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "owner_command_receipt_schema_version_check" CHECK ("owner_command_receipt"."command_schema_version" = 1),
	CONSTRAINT "owner_command_receipt_status_check" CHECK ("owner_command_receipt"."status" in ('queued', 'completed')),
	CONSTRAINT "owner_command_receipt_completion_check" CHECK (("owner_command_receipt"."status" = 'queued' and "owner_command_receipt"."completed_at" is null)
        or ("owner_command_receipt"."status" = 'completed' and "owner_command_receipt"."completed_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "owner_command_receipt" ADD CONSTRAINT "owner_command_receipt_session_fk" FOREIGN KEY ("requested_by_session_id") REFERENCES "public"."admin_session"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "owner_command_receipt_session_id_idx" ON "owner_command_receipt" USING btree ("requested_by_session_id");--> statement-breakpoint
CREATE INDEX "owner_command_receipt_family_requested_idx" ON "owner_command_receipt" USING btree ("command_family","requested_at" DESC NULLS LAST,"id" DESC NULLS LAST);
