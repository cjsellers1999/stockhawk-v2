CREATE TABLE IF NOT EXISTS "service_heartbeat" (
	"observed_at" timestamp with time zone NOT NULL,
	"service_name" text PRIMARY KEY NOT NULL
);
