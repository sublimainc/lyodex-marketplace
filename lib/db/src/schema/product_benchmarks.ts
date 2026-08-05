import { pgTable, serial, text, integer, real, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Retail price benchmark for finished freeze-dried products.
 *
 * Distinct from two neighbouring tables, and the distinction is the point:
 *
 *   price_data_points    — what actually changed hands on this platform
 *   market_observations  — what someone told us a price was, off-platform
 *   product_benchmarks   — what a named seller publicly lists, right now
 *
 * A benchmark row is the weakest kind of evidence about what a *service* costs
 * and the strongest kind about what a *product* sells for. Nobody negotiated it,
 * but nobody can deny it either: it was on the seller's own page, at a URL, on a
 * date. That makes it the right basis for "is my price in line with the market"
 * and the wrong basis for "what should I charge to toll-dry someone's fruit".
 *
 * Every row is reproducible from source_url. Nothing here is estimated: a row
 * whose net weight could not be established keeps its price and leaves
 * price_per_kg null rather than carrying a guess.
 */

/** How the net weight behind price_per_kg was established, best first. */
export const WEIGHT_SOURCES = [
  /** Seller printed "Net weight: 100 g" — believe it. */
  "net_weight_declared",
  /** Size was the variant the shopper picks: "500 g", "3 oz". */
  "variant_title",
  /** Size was in the product name: "Freeze Dried Blueberries 8 LBS". */
  "product_title",
  /** One of the above multiplied by a pack count found in the same text. */
  "derived_multipack",
  /**
   * Shopify's per-variant `grams`. This is a *shipping* weight and many sellers
   * leave it at a placeholder — one Quebec store reports 5 g for both a
   * freeze-dried chili and a $69 bear bag. Never counted in published figures.
   */
  "shipping_weight",
  /** Seller publishes no weight at all. price_per_kg stays null. */
  "none",
] as const;

export const WEIGHT_CONFIDENCE = ["high", "medium", "low", "none"] as const;

export const BENCHMARK_CATEGORIES = [
  "fruit", "vegetable", "meat", "seafood", "dairy", "yogurt", "egg",
  "meal", "candy", "ice_cream", "powder", "herb_spice", "beverage",
  "pet", "other",
] as const;

/** How the row reached us — automated read, or a human reading a page. */
export const COLLECTION_METHODS = ["catalog_feed", "manual_transcription"] as const;

export const productBenchmarksTable = pgTable("product_benchmarks", {
  id: serial("id").primaryKey(),

  // ── Seller ─────────────────────────────────────────────────────────────────
  vendor_name: text("vendor_name").notNull(),
  vendor_domain: text("vendor_domain").notNull(),
  vendor_country: text("vendor_country").notNull(),
  /** Province/state when the registry recorded one — "Quebec", "Colorado". */
  vendor_region: text("vendor_region"),
  /** From the registry: "Marque DTC", "Manufacturier/B2B", "Boutique DTC"… */
  vendor_type: text("vendor_type"),

  // ── Product ────────────────────────────────────────────────────────────────
  product_name: text("product_name").notNull(),
  /** The size or pack the shopper selects. Empty when there is only one. */
  variant: text("variant").notNull().default(""),
  category: text("category").notNull(),
  /** Seller's own categorisation, kept verbatim for auditing our own. */
  vendor_category: text("vendor_category"),

  // ── Weight, and how much to trust it ───────────────────────────────────────
  net_weight_g: real("net_weight_g"),
  weight_source: text("weight_source").notNull().default("none"),
  weight_confidence: text("weight_confidence").notNull().default("none"),

  // ── Price as listed ────────────────────────────────────────────────────────
  price: real("price").notNull(),
  currency: text("currency").notNull(),

  // ── Normalised ─────────────────────────────────────────────────────────────
  /** In the seller's own currency. Null when no weight could be established. */
  price_per_kg: real("price_per_kg"),
  price_per_kg_cad: real("price_per_kg_cad"),
  /**
   * The rate used, and its date. Stored per row so a figure can always be traced
   * back to the conversion that produced it, and restated later without
   * re-crawling anything.
   */
  fx_rate_to_cad: real("fx_rate_to_cad"),
  fx_date: text("fx_date"),

  // ── Provenance ─────────────────────────────────────────────────────────────
  source_url: text("source_url").notNull(),
  in_stock: boolean("in_stock"),
  collection_method: text("collection_method").notNull().default("catalog_feed"),
  /** When the price was seen — NOT when the row was written. */
  observed_at: timestamp("observed_at").notNull().defaultNow(),

  // ── Curation ───────────────────────────────────────────────────────────────
  /**
   * Off by default, matching market_observations. A crawl can pick up a
   * mispriced test product or a seller's placeholder; the public benchmark
   * should never inherit whatever the last run happened to find.
   */
  included_in_public: boolean("included_in_public").notNull().default(false),
  /** Set when an admin has excluded a row, with the reason. */
  excluded_reason: text("excluded_reason"),
  admin_notes: text("admin_notes"),

  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  /**
   * A re-crawl must update the existing row rather than append a duplicate,
   * otherwise every run doubles the dataset and the medians drift toward
   * whichever sellers were crawled most often. The variant is part of the key
   * because one URL legitimately carries several sizes.
   */
  uniqueIndex("product_benchmarks_identity_idx").on(table.source_url, table.variant),
  index("product_benchmarks_category_idx").on(table.category, table.included_in_public),
  index("product_benchmarks_vendor_idx").on(table.vendor_domain),
  index("product_benchmarks_confidence_idx").on(table.weight_confidence),
]);

export const insertProductBenchmarkSchema = createInsertSchema(productBenchmarksTable).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertProductBenchmark = z.infer<typeof insertProductBenchmarkSchema>;
export type ProductBenchmark = typeof productBenchmarksTable.$inferSelect;
export type WeightSource = (typeof WEIGHT_SOURCES)[number];
export type BenchmarkCategory = (typeof BENCHMARK_CATEGORIES)[number];
