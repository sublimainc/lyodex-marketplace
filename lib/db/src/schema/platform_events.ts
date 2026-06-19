import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const platformEventsTable = pgTable("platform_events", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id"),
  session_id: text("session_id"),
  event_type: text("event_type").notNull(),
  entity_type: text("entity_type"),
  entity_id: integer("entity_id"),
  metadata: jsonb("metadata"),
  ip_hash: text("ip_hash"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export type PlatformEvent = typeof platformEventsTable.$inferSelect;
