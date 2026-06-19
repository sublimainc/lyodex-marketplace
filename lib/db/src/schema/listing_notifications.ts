import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const listingNotificationsTable = pgTable("listing_notifications", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull(),
  listing_type: text("listing_type").notNull(), // 'capacity' | 'product'
  listing_id: integer("listing_id").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertListingNotificationSchema = createInsertSchema(listingNotificationsTable).omit({ id: true, created_at: true });
export type InsertListingNotification = z.infer<typeof insertListingNotificationSchema>;
export type ListingNotification = typeof listingNotificationsTable.$inferSelect;
