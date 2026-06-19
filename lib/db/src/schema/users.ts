import { pgTable, serial, text, boolean, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  role: text("role").notNull().default("buyer"), // 'buyer' | 'operator' | 'admin'
  admin_role: text("admin_role"), // 'super_admin' | 'support_admin' | 'finance_admin' | 'data_analyst' | 'ad_manager' | null
  banned: boolean("banned").notNull().default(false),
  failed_login_count: integer("failed_login_count").notNull().default(0),
  locked_until: timestamp("locked_until"),
  notifications_cleared_at: timestamp("notifications_cleared_at"),
  password_reset_token: text("password_reset_token"),
  password_reset_expires: timestamp("password_reset_expires"),
  notification_prefs: jsonb("notification_prefs").$type<Record<string, boolean>>(),
  session_version: integer("session_version").notNull().default(1),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, created_at: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
