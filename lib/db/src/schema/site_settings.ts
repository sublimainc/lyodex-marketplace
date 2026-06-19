import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const siteSettingsTable = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull().default("false"),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSiteSettingSchema = createInsertSchema(siteSettingsTable).omit({ id: true, updated_at: true });
export type InsertSiteSetting = z.infer<typeof insertSiteSettingSchema>;
export type SiteSetting = typeof siteSettingsTable.$inferSelect;

export const SITE_SETTING_KEYS = ["marketplace_locked", "market_intelligence_locked", "blog_locked", "scheduled_reports_enabled", "scheduled_reports_cadence"] as const;
export type SiteSettingKey = typeof SITE_SETTING_KEYS[number];
