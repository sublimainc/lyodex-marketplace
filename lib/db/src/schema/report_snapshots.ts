import { pgTable, serial, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const reportSnapshotsTable = pgTable("report_snapshots", {
  id:               serial("id").primaryKey(),
  type:             text("type").notNull().default("custom"),
  date_range_start: timestamp("date_range_start").notNull(),
  date_range_end:   timestamp("date_range_end").notNull(),
  filters_json:     jsonb("filters_json").notNull().default({}),
  generated_at:     timestamp("generated_at").notNull().defaultNow(),
  generated_by:     integer("generated_by").notNull(),
  generated_by_email: text("generated_by_email").notNull(),
  title:            text("title").notNull().default("Report"),
  data_json:        jsonb("data_json").notNull().default({}),
});

export type ReportSnapshot = typeof reportSnapshotsTable.$inferSelect;
