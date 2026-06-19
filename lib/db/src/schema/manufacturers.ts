import { pgTable, serial, text, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const manufacturersTable = pgTable("manufacturers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  tagline: text("tagline"),
  description: text("description"),
  website_url: text("website_url"),
  logo_url: text("logo_url"),
  cover_image_url: text("cover_image_url"),
  images: text("images").array().notNull().default([]),
  country: text("country"),
  city: text("city"),
  founded_year: integer("founded_year"),
  specialties: text("specialties").array().notNull().default([]),
  market_focus: text("market_focus").array().notNull().default([]),
  featured: boolean("featured").notNull().default(false),
  avg_rating: real("avg_rating").notNull().default(0),
  review_count: integer("review_count").notNull().default(0),
  created_at: timestamp("created_at").notNull().defaultNow(),
  // Additional admin-managed fields
  contact_name: text("contact_name"),
  contact_email: text("contact_email"),
  phone: text("phone"),
  certifications: text("certifications").array().notNull().default([]),
  production_capabilities: text("production_capabilities"),
  active: boolean("active").notNull().default(true),
});

export const manufacturerReviewsTable = pgTable("manufacturer_reviews", {
  id: serial("id").primaryKey(),
  manufacturer_id: integer("manufacturer_id").notNull(),
  user_id: integer("user_id"),
  reviewer_name: text("reviewer_name").notNull(),
  reviewer_company: text("reviewer_company"),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  verified_buyer: boolean("verified_buyer").notNull().default(false),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertManufacturerSchema = createInsertSchema(manufacturersTable).omit({ id: true, created_at: true });
export type InsertManufacturer = z.infer<typeof insertManufacturerSchema>;
export type Manufacturer = typeof manufacturersTable.$inferSelect;
export type ManufacturerReview = typeof manufacturerReviewsTable.$inferSelect;
