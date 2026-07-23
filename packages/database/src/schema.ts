import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const serviceHeartbeat = pgTable("service_heartbeat", {
  observedAt: timestamp("observed_at", {
    mode: "date",
    withTimezone: true,
  }).notNull(),
  serviceName: text("service_name").primaryKey(),
});

export const schema = { serviceHeartbeat };
