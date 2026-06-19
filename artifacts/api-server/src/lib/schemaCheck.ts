import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { logger } from "./logger";

const EXPECTED_TABLES = [
  "activity",
  "admin_audit_logs",
  "bids",
  "buyer_notifications",
  "disputes",
  "manufacturers",
  "manufacturer_reviews",
  "message_reads",
  "operator_listings",
  "operator_products",
  "operators",
  "platform_events",
  "price_data_points",
  "request_messages",
  "requests",
  "system_alerts",
  "users",
] as const;

/**
 * Critical columns that must be present for security-sensitive auth logic to
 * function correctly.  A missing column here means authentication controls
 * will fail at runtime — we log a FATAL message so the operator can act
 * immediately without digging through query errors.
 *
 * Format: { table: string; column: string; reason: string }
 */
const REQUIRED_COLUMNS = [
  {
    table: "users",
    column: "session_version",
    reason:
      "session revocation (ban / password reset) depends on this column — run: pnpm --filter @workspace/db run push-force",
  },
] as const;

export async function checkSchema(): Promise<void> {
  if (!process.env["DATABASE_URL"]) {
    logger.warn("DATABASE_URL not set — skipping schema check");
    return;
  }

  try {
    // ── Table presence check ──────────────────────────────────────────────────
    const tableResult = await db.execute(
      sql`SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'`
    );

    const existingTables = new Set(
      (tableResult.rows as Array<{ table_name: string }>).map((r) => r.table_name)
    );
    const missingTables = EXPECTED_TABLES.filter((t) => !existingTables.has(t));

    if (missingTables.length > 0) {
      logger.warn(
        { missing_tables: missingTables },
        `SCHEMA DRIFT DETECTED — ${missingTables.length} table(s) missing from the database. ` +
          `Run: pnpm --filter @workspace/db run push-force`
      );
    } else {
      logger.info("Schema check passed — all expected tables are present");
    }

    // ── Critical column presence check ────────────────────────────────────────
    // Checks only columns whose absence would silently break security controls
    // at runtime.  Uses information_schema for portability.
    const columnResult = await db.execute(
      sql`SELECT table_name, column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'`
    );

    const existingColumns = new Set(
      (columnResult.rows as Array<{ table_name: string; column_name: string }>).map(
        (r) => `${r.table_name}.${r.column_name}`
      )
    );

    for (const { table, column, reason } of REQUIRED_COLUMNS) {
      if (!existingColumns.has(`${table}.${column}`)) {
        logger.error(
          { table, column },
          `FATAL SCHEMA GAP — column "${table}.${column}" is missing: ${reason}`
        );
      }
    }
  } catch (err) {
    logger.warn({ err }, "Schema check failed — could not query information_schema");
  }
}
