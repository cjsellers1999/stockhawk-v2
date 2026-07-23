ALTER TABLE "change_event" DROP CONSTRAINT "change_event_event_type_check";--> statement-breakpoint
ALTER TABLE "change_event" DROP CONSTRAINT "change_event_payload_check";--> statement-breakpoint
ALTER TABLE "change_event" ADD CONSTRAINT "change_event_event_type_check" CHECK ("change_event"."event_type" in ('listing_discovered', 'listing_reappeared', 'stock_status_changed'));--> statement-breakpoint
ALTER TABLE "change_event" ADD CONSTRAINT "change_event_payload_check" CHECK ((
        "change_event"."event_type" = 'listing_discovered'
        and "change_event"."listing_observation_id" is not null
        and "change_event"."stock_observation_id" is null
        and "change_event"."previous_value" is null
        and "change_event"."new_value" = 'active'
      ) or (
        "change_event"."event_type" = 'listing_reappeared'
        and "change_event"."listing_observation_id" is not null
        and "change_event"."stock_observation_id" is null
        and "change_event"."previous_value" = 'inactive'
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
