ALTER TABLE "current_stock_state" DROP CONSTRAINT "current_stock_state_observation_listing_fk";--> statement-breakpoint
ALTER TABLE "stock_observation" DROP CONSTRAINT "stock_observation_id_listing_unique";--> statement-breakpoint
ALTER TABLE "stock_observation" ADD CONSTRAINT "stock_observation_current_state_facts_unique" UNIQUE("id","retailer_listing_id","observation_order","observed_at","status");--> statement-breakpoint
ALTER TABLE "catalog_match" ADD COLUMN "evidence_artifact_id" bigint;--> statement-breakpoint
UPDATE "catalog_match"
SET "evidence_artifact_id" = (
	SELECT "observation"."evidence_artifact_id"
	FROM "retailer_listing_observation" AS "observation"
	WHERE "observation"."retailer_listing_id" = "catalog_match"."retailer_listing_id"
	ORDER BY
		abs(extract(epoch FROM ("observation"."observed_at" - "catalog_match"."matched_at"))),
		"observation"."id"
	LIMIT 1
);--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "catalog_match"
		WHERE "evidence_artifact_id" IS NULL
	) THEN
		RAISE EXCEPTION 'Catalog Match has no retained listing-observation evidence';
	END IF;
END
$$;--> statement-breakpoint
ALTER TABLE "catalog_match" ALTER COLUMN "evidence_artifact_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog_match" ADD CONSTRAINT "catalog_match_evidence_fk" FOREIGN KEY ("evidence_artifact_id") REFERENCES "public"."source_evidence_artifact"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "current_stock_state" ADD CONSTRAINT "current_stock_state_observation_facts_fk" FOREIGN KEY ("stock_observation_id","retailer_listing_id","observation_order","observed_at","status") REFERENCES "public"."stock_observation"("id","retailer_listing_id","observation_order","observed_at","status") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_match_evidence_artifact_id_idx" ON "catalog_match" USING btree ("evidence_artifact_id");
