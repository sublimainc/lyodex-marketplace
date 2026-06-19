import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const pendingUploadsTable = pgTable("pending_uploads", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull(),
  object_path: text("object_path").notNull(),
  consumed: boolean("consumed").notNull().default(false),
  created_at: timestamp("created_at").notNull().defaultNow(),
});
