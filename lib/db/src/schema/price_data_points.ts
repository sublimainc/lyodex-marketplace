import { pgTable, serial, text, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";

export const priceDataPointsTable = pgTable("price_data_points", {
  id:                              serial("id").primaryKey(),
  bid_id:                          integer("bid_id").notNull(),
  request_id:                      integer("request_id").notNull(),
  operator_id:                     integer("operator_id").notNull(),
  operator_name:                   text("operator_name"),
  category:                        text("category").notNull(),
  quoted_price:                    real("quoted_price").notNull(),
  currency:                        text("currency").notNull().default("CAD"),
  product_format:                  text("product_format"),
  moq:                             integer("moq"),
  setup_fee:                       real("setup_fee"),
  certifications:                  text("certifications").array(),
  payment_terms:                   text("payment_terms"),
  accepted:                        boolean("accepted").notNull().default(false),
  quote_status:                    text("quote_status").notNull().default("pending"),
  quantity_kg:                     integer("quantity_kg"),
  lead_time_days:                  integer("lead_time_days"),
  confidence_level:                text("confidence_level").notNull().default("medium"),
  anonymized:                      boolean("anonymized").notNull().default(true),
  included_in_market_intelligence: boolean("included_in_market_intelligence").notNull().default(true),
  admin_notes:                     text("admin_notes"),
  created_at:                      timestamp("created_at").notNull().defaultNow(),
  updated_at:                      timestamp("updated_at").notNull().defaultNow(),
});

export type PriceDataPoint = typeof priceDataPointsTable.$inferSelect;
