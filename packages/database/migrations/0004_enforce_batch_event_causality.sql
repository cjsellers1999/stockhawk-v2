DROP INDEX "observation_batch_run_identity_unique";--> statement-breakpoint
ALTER TABLE "observation_batch" ADD CONSTRAINT "observation_batch_stockhawk_identity_unique" UNIQUE("stockhawk_identity");--> statement-breakpoint
ALTER TABLE "retailer_listing_observation" ADD CONSTRAINT "retailer_listing_observation_event_facts_unique" UNIQUE("id","batch_id","retailer_listing_id","observed_at");--> statement-breakpoint
ALTER TABLE "stock_observation" ADD CONSTRAINT "stock_observation_event_facts_unique" UNIQUE("id","batch_id","retailer_listing_id","observed_at","status");--> statement-breakpoint
ALTER TABLE "change_event" ADD CONSTRAINT "change_event_listing_causality_fk" FOREIGN KEY ("listing_observation_id","batch_id","retailer_listing_id","effective_at") REFERENCES "public"."retailer_listing_observation"("id","batch_id","retailer_listing_id","observed_at") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_event" ADD CONSTRAINT "change_event_stock_causality_fk" FOREIGN KEY ("stock_observation_id","batch_id","retailer_listing_id","effective_at","new_value") REFERENCES "public"."stock_observation"("id","batch_id","retailer_listing_id","observed_at","status") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_event" ADD CONSTRAINT "change_event_payload_check" CHECK ((
        "change_event"."event_type" = 'listing_discovered'
        and "change_event"."listing_observation_id" is not null
        and "change_event"."stock_observation_id" is null
        and "change_event"."previous_value" is null
        and "change_event"."new_value" = 'active'
      ) or (
        "change_event"."event_type" = 'stock_status_changed'
        and "change_event"."listing_observation_id" is not null
        and "change_event"."stock_observation_id" is not null
        and "change_event"."previous_value" is not null
        and "change_event"."previous_value" in ('in_stock', 'out_of_stock', 'preorder', 'unknown')
        and "change_event"."new_value" in ('in_stock', 'out_of_stock', 'preorder', 'unknown')
        and "change_event"."previous_value" <> "change_event"."new_value"
      ));
