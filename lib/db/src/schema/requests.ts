import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const requestsTable = pgTable("requests", {
  id: serial("id").primaryKey(),
  material_type: text("material_type").notNull(),
  quantity_kg: integer("quantity_kg").notNull(),
  target_moisture: real("target_moisture"),
  deadline: text("deadline").notNull(),
  budget_per_kg: real("budget_per_kg"),
  special_requirements: text("special_requirements"),
  status: text("status").notNull().default("pending"),
  buyer_email: text("buyer_email").notNull(),
  bid_count: integer("bid_count").notNull().default(0),
  created_at: timestamp("created_at").notNull().defaultNow(),
  moderation_note: text("moderation_note"),
  moderated_by: text("moderated_by"),
});

export const insertRequestSchema = createInsertSchema(requestsTable).omit({ id: true, created_at: true, bid_count: true });
export type InsertRequest = z.infer<typeof insertRequestSchema>;
export type FreezeDryRequest = typeof requestsTable.$inferSelect;
