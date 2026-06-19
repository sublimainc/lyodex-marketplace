import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const systemAlertsTable = pgTable("system_alerts", {
  id: serial("id").primaryKey(),
  alert_key: text("alert_key").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  dismissed_at: timestamp("dismissed_at"),
});

export const insertSystemAlertSchema = createInsertSchema(systemAlertsTable).omit({ id: true, created_at: true });
export type InsertSystemAlert = z.infer<typeof insertSystemAlertSchema>;
export type SystemAlert = typeof systemAlertsTable.$inferSelect;
