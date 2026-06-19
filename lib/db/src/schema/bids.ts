import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bidsTable = pgTable("bids", {
  id: serial("id").primaryKey(),
  request_id: integer("request_id").notNull(),
  operator_id: integer("operator_id").notNull(),
  operator_name: text("operator_name").notNull().default(""),
  price_per_kg: real("price_per_kg").notNull(),
  turnaround_days: integer("turnaround_days").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("pending"),
  fee_status: text("fee_status").notNull().default("none"),
  stripe_session_id: text("stripe_session_id"),
  escrow_status: text("escrow_status").notNull().default("none"),
  escrow_payment_intent_id: text("escrow_payment_intent_id"),
  escrow_amount_cents: integer("escrow_amount_cents"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  // Job tracking (set once bid is accepted)
  job_status: text("job_status"),             // null | 'pending_materials' | 'materials_received' | 'in_process' | 'done' | 'issue'
  job_status_note: text("job_status_note"),   // operator's explanation for 'issue' status
  materials_received_at: timestamp("materials_received_at"),  // when operator logged materials received
  processing_start_date: text("processing_start_date"),       // YYYY-MM-DD, set when materials received
  job_status_updated_at: timestamp("job_status_updated_at"),  // last status change
});

export const insertBidSchema = createInsertSchema(bidsTable).omit({ id: true, created_at: true });
export type InsertBid = z.infer<typeof insertBidSchema>;
export type Bid = typeof bidsTable.$inferSelect;
