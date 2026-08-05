import { pgTable, serial, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Newsletter subscribers.
 *
 * The sign-up form existed on the blog page as pure decoration: no route, no
 * table, no handler. Clicking Subscribe did nothing at all, so every address
 * anyone ever entered was silently discarded.
 *
 * Capture works without SMTP configured — collecting the address is the part
 * that matters during launch, and sending can be switched on later. What must
 * never happen is the reverse: a form that accepts an address and drops it.
 */
export const newsletterSubscribersTable = pgTable("newsletter_subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  /** "blog", "footer", … — tells you which surface actually converts. */
  source: text("source").notNull().default("blog"),
  /** Language the visitor was reading in, so a future send can match it. */
  locale: text("locale").notNull().default("en"),
  /**
   * Cleared when someone unsubscribes. Rows are kept rather than deleted so a
   * later re-import cannot silently resurrect an address that opted out.
   */
  subscribed: boolean("subscribed").notNull().default(true),
  unsubscribed_at: timestamp("unsubscribed_at"),
  /**
   * Double opt-in is required by CASL in Canada and by GDPR in the EU before
   * sending marketing email. The column exists from day one so the obligation
   * is visible in the schema rather than discovered later.
   */
  confirmed_at: timestamp("confirmed_at"),
  created_at: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("newsletter_subscribed_idx").on(table.subscribed),
]);

export const insertNewsletterSubscriberSchema = createInsertSchema(newsletterSubscribersTable).omit({
  id: true,
  created_at: true,
});

export type InsertNewsletterSubscriber = z.infer<typeof insertNewsletterSubscriberSchema>;
export type NewsletterSubscriber = typeof newsletterSubscribersTable.$inferSelect;
