import { pgTable, serial, integer, text, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Finished freeze-dried products listed for sale by operators
export const operatorProductsTable = pgTable("operator_products", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id"), // references users.id; null for public market submissions
  operator_name: text("operator_name").notNull().default(""),
  name: text("name").notNull(),
  material_type: text("material_type").notNull(),
  weight_kg: real("weight_kg").notNull(),
  moisture_pct: real("moisture_pct"),
  price_per_unit: real("price_per_unit").notNull(),
  moq: integer("moq").notNull().default(1), // minimum order quantity (units)
  available: boolean("available").notNull().default(true),
  description: text("description"),
  contact_email: text("contact_email").notNull().default(""),
  approval_status: text("approval_status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
  approval_reason: text("approval_reason"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const insertOperatorProductSchema = createInsertSchema(operatorProductsTable).omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type InsertOperatorProduct = z.infer<typeof insertOperatorProductSchema>;
export type OperatorProduct = typeof operatorProductsTable.$inferSelect;
