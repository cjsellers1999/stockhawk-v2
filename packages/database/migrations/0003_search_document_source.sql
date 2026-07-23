CREATE VIEW "public"."search_document_source" AS (
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
);
