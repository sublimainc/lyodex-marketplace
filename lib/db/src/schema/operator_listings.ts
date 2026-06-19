import { pgTable, serial, integer, text, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Freeze-drying capacity listings posted by operator users
export const operatorListingsTable = pgTable("operator_listings", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull(), // references users.id
  operator_id: integer("operator_id"), // references operators.id (optional link to public operator profile)
  equipment_type: text("equipment_type").notNull(),
  capacity_kg: integer("capacity_kg").notNull(),
  certifications: text("certifications").array().notNull().default([]),
  price_per_kg_min: real("price_per_kg_min").notNull(),
  price_per_kg_max: real("price_per_kg_max").notNull(),
  turnaround_days: integer("turnaround_days").notNull(),
  available: boolean("available").notNull().default(true),
  notes: text("notes"),
  approval_status: text("approval_status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
  approval_reason: text("approval_reason"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const insertOperatorListingSchema = createInsertSchema(operatorListingsTable).omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type InsertOperatorListing = z.infer<typeof insertOperatorListingSchema>;
export type OperatorListing = typeof operatorListingsTable.$inferSelect;
