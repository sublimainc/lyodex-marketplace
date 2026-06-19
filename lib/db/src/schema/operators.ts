import { pgTable, serial, text, integer, real, boolean, timestamp, jsonb, numeric } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const operatorsTable = pgTable("operators", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id"), // FK to users.id — null for seeded operators not yet linked
  name: text("name").notNull(),
  location: text("location").notNull(),
  description: text("description"),
  capacity_kg: integer("capacity_kg").notNull(),
  price_per_kg: real("price_per_kg").notNull(),
  certifications: text("certifications").array().notNull().default([]),
  verified_certifications: text("verified_certifications").array().notNull().default([]),
  turnaround_days: integer("turnaround_days").notNull(),
  rating: real("rating").notNull().default(0),
  review_count: integer("review_count").notNull().default(0),
  available: boolean("available").notNull().default(true),
  audit_status: text("audit_status").notNull().default("none"), // 'none' | 'pending' | 'audited'
  audit_triggered_at: timestamp("audit_triggered_at"),
  // Stripe Connect — V2 connected account for automatic payouts when escrow is released
  stripe_account_id: text("stripe_account_id"),          // acct_... — set after onboarding starts
  stripe_onboarded: boolean("stripe_onboarded").notNull().default(false), // true once transfers are active
  stripe_disconnected: boolean("stripe_disconnected").notNull().default(false), // true when account was explicitly deauthorized
  cert_documents: jsonb("cert_documents").$type<Record<string, string>>().default({}),
  cert_verified_at: jsonb("cert_verified_at").$type<Record<string, string>>().default({}),
  upload_count: integer("upload_count").notNull().default(0),
  created_at: timestamp("created_at").notNull().defaultNow(),
  // Verification & trust fields
  verification_status: text("verification_status").notNull().default("not_verified"), // 'verified' | 'partially_verified' | 'not_verified'
  source_urls: text("source_urls").array().notNull().default([]),
  website_url: text("website_url"),
  country: text("country"),                   // ISO 2-letter or short name: CA, US, UK, DE, FR, etc.
  city: text("city"),
  role: text("role").notNull().default("operator"), // 'operator' | 'ingredient_seller' | 'machinery_supplier' | 'service_provider'
  provider_types: text("provider_types").array().notNull().default(sql`ARRAY['operator']::text[]`), // multi-select: 'operator' | 'ingredient_seller' | 'service_provider'
  last_verified_date: text("last_verified_date"), // ISO date string e.g. '2025-01-15'
  food_market_focus: boolean("food_market_focus").notNull().default(false),
  pharmaceutical_focus: boolean("pharmaceutical_focus").notNull().default(false),
  contact_page_url: text("contact_page_url"),
  // Platform fee override — null means use global default (currently 9%)
  platform_fee_override: numeric("platform_fee_override"),
  // Map / geo fields
  gps_lat: real("gps_lat"),
  gps_lng: real("gps_lng"),
  service_radius_km: integer("service_radius_km"),
  map_status: text("map_status").notNull().default("active"), // 'active' | 'inactive'
  // Contact
  contact_name: text("contact_name"),
  contact_email: text("contact_email"),
  phone: text("phone"),
});

export const insertOperatorSchema = createInsertSchema(operatorsTable).omit({ id: true, created_at: true });
export type InsertOperator = z.infer<typeof insertOperatorSchema>;
export type Operator = typeof operatorsTable.$inferSelect;
