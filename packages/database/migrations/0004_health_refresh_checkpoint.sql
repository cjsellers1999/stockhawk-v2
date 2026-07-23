CREATE TABLE "health_refresh_checkpoint" (
	"identity" text PRIMARY KEY NOT NULL,
	"last_receipt_identity" uuid NOT NULL,
	"refresh_count" bigint NOT NULL,
	"refreshed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "health_refresh_checkpoint_receipt_unique" UNIQUE("last_receipt_identity"),
	CONSTRAINT "health_refresh_checkpoint_identity_check" CHECK ("health_refresh_checkpoint"."identity" = 'owner'),
	CONSTRAINT "health_refresh_checkpoint_count_check" CHECK ("health_refresh_checkpoint"."refresh_count" > 0)
);
--> statement-breakpoint
ALTER TABLE "owner_command_receipt" DROP CONSTRAINT "owner_command_receipt_status_check";--> statement-breakpoint
ALTER TABLE "owner_command_receipt" DROP CONSTRAINT "owner_command_receipt_completion_check";--> statement-breakpoint
ALTER TABLE "owner_command_receipt" ADD COLUMN "failed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "health_refresh_checkpoint" ADD CONSTRAINT "health_refresh_checkpoint_receipt_fk" FOREIGN KEY ("last_receipt_identity") REFERENCES "public"."owner_command_receipt"("stockhawk_identity") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_command_receipt" ADD CONSTRAINT "owner_command_receipt_status_check" CHECK ("owner_command_receipt"."status" in ('queued', 'completed', 'failed'));--> statement-breakpoint
ALTER TABLE "owner_command_receipt" ADD CONSTRAINT "owner_command_receipt_completion_check" CHECK (("owner_command_receipt"."status" = 'queued' and "owner_command_receipt"."completed_at" is null and "owner_command_receipt"."failed_at" is null)
        or ("owner_command_receipt"."status" = 'completed' and "owner_command_receipt"."completed_at" is not null and "owner_command_receipt"."failed_at" is null)
        or ("owner_command_receipt"."status" = 'failed' and "owner_command_receipt"."completed_at" is null and "owner_command_receipt"."failed_at" is not null));