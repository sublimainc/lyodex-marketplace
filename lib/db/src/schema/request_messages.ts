import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const requestMessagesTable = pgTable("request_messages", {
  id: serial("id").primaryKey(),
  request_id: integer("request_id").notNull(),
  user_id: integer("user_id").notNull(),
  sender_name: text("sender_name").notNull(),
  sender_role: text("sender_role").notNull(),
  body: text("body").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertRequestMessageSchema = createInsertSchema(requestMessagesTable).omit({ id: true, created_at: true });
export type InsertRequestMessage = z.infer<typeof insertRequestMessageSchema>;
export type RequestMessage = typeof requestMessagesTable.$inferSelect;
