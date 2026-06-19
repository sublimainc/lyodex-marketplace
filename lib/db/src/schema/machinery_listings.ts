import { pgTable, serial, integer, text, real, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const machineryListingsTable = pgTable("machinery_listings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull().default("other"),
  listing_status: text("listing_status").notNull().default("pending"),
  condition: text("condition").notNull().default("used"),
  description: text("description"),
  price: real("price"),
  currency: text("currency").notNull().default("CAD"),
  manufacturer_name: text("manufacturer_name"),
  model_number: text("model_number"),
  year_manufactured: integer("year_manufactured"),
  technical_specs: jsonb("technical_specs").$type<Record<string, string>>().default({}),
  images: text("images").array().notNull().default([]),
  contact_name: text("contact_name"),
  contact_email: text("contact_email"),
  phone: text("phone"),
  operator_id: integer("operator_id"),
  user_id: integer("user_id"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMachineryListingSchema = createInsertSchema(machineryListingsTable).omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type InsertMachineryListing = z.infer<typeof insertMachineryListingSchema>;
export type MachineryListing = typeof machineryListingsTable.$inferSelect;
