import { pgTable, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";

export const messageReadsTable = pgTable("message_reads", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull(),
  request_id: integer("request_id").notNull(),
  last_read_at: timestamp("last_read_at").notNull().defaultNow(),
}, (t) => [unique("message_reads_user_request_uniq").on(t.user_id, t.request_id)]);

export type MessageRead = typeof messageReadsTable.$inferSelect;
