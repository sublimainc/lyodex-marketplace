import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const buyerNotificationsTable = pgTable("buyer_notifications", {
  id: serial("id").primaryKey(),
  buyer_user_id: integer("buyer_user_id").notNull(),
  request_id: integer("request_id").notNull(),
  bid_id: integer("bid_id").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertBuyerNotificationSchema = createInsertSchema(buyerNotificationsTable).omit({ id: true, created_at: true });
export type InsertBuyerNotification = z.infer<typeof insertBuyerNotificationSchema>;
export type BuyerNotification = typeof buyerNotificationsTable.$inferSelect;
