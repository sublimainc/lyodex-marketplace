import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";

export const disputesTable = pgTable("disputes", {
  id: serial("id").primaryKey(),
  request_id: integer("request_id").notNull(),
  bid_id: integer("bid_id").notNull(),
  opened_by_user_id: integer("opened_by_user_id").notNull(),
  opened_by_email: text("opened_by_email").notNull(),
  reason: text("reason").notNull(),
  evidence: text("evidence"),
  status: text("status").notNull().default("open"),
  admin_decision: text("admin_decision"),
  refund_amount: real("refund_amount"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  resolved_at: timestamp("resolved_at"),
});

export type Dispute = typeof disputesTable.$inferSelect;
