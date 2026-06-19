import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const adminAuditLogsTable = pgTable("admin_audit_logs", {
  id: serial("id").primaryKey(),
  admin_id: integer("admin_id").notNull(),
  admin_email: text("admin_email").notNull(),
  action: text("action").notNull(),
  entity_type: text("entity_type"),
  entity_id: integer("entity_id"),
  ip_address: text("ip_address"),
  notes: text("notes"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export type AdminAuditLog = typeof adminAuditLogsTable.$inferSelect;
