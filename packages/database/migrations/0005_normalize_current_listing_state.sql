DROP VIEW "public"."search_document_source";--> statement-breakpoint
CREATE TABLE "current_listing_state" (
	"listing_observation_id" bigint NOT NULL,
	"retailer_listing_id" bigint PRIMARY KEY NOT NULL,
	CONSTRAINT "current_listing_state_listing_observation_id_unique" UNIQUE("listing_observation_id")
);--> statement-breakpoint
ALTER TABLE "retailer_listing_observation" ADD CONSTRAINT "retailer_listing_observation_id_listing_unique" UNIQUE("id","retailer_listing_id");--> statement-breakpoint
ALTER TABLE "current_listing_state" ADD CONSTRAINT "current_listing_state_listing_fk" FOREIGN KEY ("retailer_listing_id") REFERENCES "public"."retailer_listing"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "current_listing_state" ADD CONSTRAINT "current_listing_state_observation_listing_fk" FOREIGN KEY ("listing_observation_id","retailer_listing_id") REFERENCES "public"."retailer_listing_observation"("id","retailer_listing_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
INSERT INTO "current_listing_state" ("listing_observation_id", "retailer_listing_id")
SELECT "current_observation"."id", "listing"."id"
FROM "retailer_listing" AS "listing"
CROSS JOIN LATERAL (
	SELECT "observation"."id"
	FROM "retailer_listing_observation" AS "observation"
	WHERE "observation"."retailer_listing_id" = "listing"."id"
		AND "observation"."observation_order" = "listing"."current_observation_order"
		AND "observation"."observed_at" = "listing"."current_observed_at"
		AND "observation"."raw_title" = "listing"."raw_title"
		AND "observation"."purchase_url" = "listing"."purchase_url"
		AND "observation"."image_url" IS NOT DISTINCT FROM "listing"."image_url"
	ORDER BY "observation"."id" DESC
	LIMIT 1
) AS "current_observation";--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "retailer_listing" AS "listing"
		LEFT JOIN "current_listing_state" AS "current"
			ON "current"."retailer_listing_id" = "listing"."id"
		WHERE "current"."retailer_listing_id" IS NULL
	) THEN
		RAISE EXCEPTION 'Retailer Listing current facts lack an exact immutable observation';
	END IF;
END
$$;--> statement-breakpoint
DROP INDEX "search_document_product_id_idx";--> statement-breakpoint
DROP INDEX "search_document_storefront_id_idx";--> statement-breakpoint
DROP INDEX "search_document_offer_freshness_idx";--> statement-breakpoint
ALTER TABLE "retailer_listing" DROP CONSTRAINT "retailer_listing_observation_order_check";--> statement-breakpoint
ALTER TABLE "retailer_listing" DROP COLUMN "current_observation_order";--> statement-breakpoint
ALTER TABLE "retailer_listing" DROP COLUMN "current_observed_at";--> statement-breakpoint
ALTER TABLE "retailer_listing" DROP COLUMN "image_url";--> statement-breakpoint
ALTER TABLE "retailer_listing" DROP COLUMN "purchase_url";--> statement-breakpoint
ALTER TABLE "retailer_listing" DROP COLUMN "raw_title";--> statement-breakpoint
CREATE VIEW "public"."search_document_source" AS (
  select
    matched_product.canonical_name as canonical_product_name,
    'offer'::text as classification,
    listing_observation.image_url,
    stock.observed_at as last_checked_at,
    listing.stockhawk_identity as listing_identity,
    listing.listing_presence,
    'confirmed'::text as match_status,
    matched_product.id as product_id,
    1::integer as projection_version,
    listing_observation.purchase_url,
    listing_observation.raw_title,
    listing.id as retailer_listing_id,
    stock.status as stock_status,
    matched_storefront.hostname as storefront_hostname,
    matched_storefront.id as storefront_id,
    matched_storefront.name as storefront_name,
    now() as updated_at,
    matched_product.variant
  from retailer_listing as listing
  inner join current_listing_state as listing_state
    on listing_state.retailer_listing_id = listing.id
  inner join retailer_listing_observation as listing_observation
    on listing_observation.id = listing_state.listing_observation_id
    and listing_observation.retailer_listing_id = listing.id
  inner join catalog_match as active_match
    on active_match.retailer_listing_id = listing.id
    and active_match.active
  inner join product as matched_product
    on matched_product.id = active_match.product_id
  inner join storefront as matched_storefront
    on matched_storefront.id = listing.storefront_id
  inner join current_stock_state as stock
    on stock.retailer_listing_id = listing.id
);
