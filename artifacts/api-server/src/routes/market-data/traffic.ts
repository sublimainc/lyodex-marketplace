import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { platformEventsTable } from "@workspace/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";
import { requireAuth, requireRole, requireAdminCapability } from "../../middleware/requireAuth";
import { logger } from "../../lib/logger";

const router: IRouter = Router();
const adminRead = [requireAuth, requireRole("admin"), requireAdminCapability("read")];

/**
 * Site traffic for the admin panel.
 *
 * Reads `platform_events`, which the frontend now writes to on every route
 * change. Before this, the table and the POST route both existed but nothing
 * ever called them, so the panel showed no traffic at all — there was no way to
 * tell whether any advertising was reaching anyone.
 *
 * "Visitors" here means distinct session ids. A session id lives in
 * sessionStorage and dies with the browser tab, so this counts visits rather
 * than people. That is a weaker number than a cookie-based unique visitor, and
 * deliberately so: it needs no consent banner and builds no profile. Read it as
 * a trend, not a headcount.
 */

// ─── GET /admin/traffic?days=30 ──────────────────────────────────────────────
router.get("/admin/traffic", ...adminRead, async (req, res) => {
  const requested = parseInt(String(req.query.days ?? "30"), 10);
  const days = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 365) : 30;

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  since.setUTCHours(0, 0, 0, 0);

  const pageViews = and(
    eq(platformEventsTable.event_type, "page_view"),
    gte(platformEventsTable.created_at, since),
  );

  try {
    const [totals, byDay, byPath, byReferrer, topEvents] = await Promise.all([
      db
        .select({
          views: sql<number>`count(*)`,
          sessions: sql<number>`count(distinct ${platformEventsTable.session_id})`,
          signed_in: sql<number>`count(distinct ${platformEventsTable.user_id}) filter (where ${platformEventsTable.user_id} is not null)`,
        })
        .from(platformEventsTable)
        .where(pageViews)
        .then(r => r[0]),

      db
        .select({
          day: sql<string>`to_char(${platformEventsTable.created_at}, 'YYYY-MM-DD')`,
          views: sql<number>`count(*)`,
          sessions: sql<number>`count(distinct ${platformEventsTable.session_id})`,
        })
        .from(platformEventsTable)
        .where(pageViews)
        .groupBy(sql`to_char(${platformEventsTable.created_at}, 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(${platformEventsTable.created_at}, 'YYYY-MM-DD')`),

      db
        .select({
          path: sql<string>`coalesce(${platformEventsTable.metadata}->>'path', '(unknown)')`,
          views: sql<number>`count(*)`,
          sessions: sql<number>`count(distinct ${platformEventsTable.session_id})`,
        })
        .from(platformEventsTable)
        .where(pageViews)
        .groupBy(sql`coalesce(${platformEventsTable.metadata}->>'path', '(unknown)')`)
        .orderBy(sql`count(*) desc`)
        .limit(50),

      // Where visitors came from. Only the hostname is recorded by the client,
      // never the full referring URL.
      db
        .select({
          referrer: sql<string>`coalesce(nullif(${platformEventsTable.metadata}->>'referrer', ''), '(direct)')`,
          sessions: sql<number>`count(distinct ${platformEventsTable.session_id})`,
        })
        .from(platformEventsTable)
        .where(pageViews)
        .groupBy(sql`coalesce(nullif(${platformEventsTable.metadata}->>'referrer', ''), '(direct)')`)
        .orderBy(sql`count(distinct ${platformEventsTable.session_id}) desc`)
        .limit(20),

      // Non-page-view activity: quotes submitted, searches, disputes opened…
      db
        .select({
          event_type: platformEventsTable.event_type,
          count: sql<number>`count(*)`,
        })
        .from(platformEventsTable)
        .where(and(
          gte(platformEventsTable.created_at, since),
          sql`${platformEventsTable.event_type} <> 'page_view'`,
        ))
        .groupBy(platformEventsTable.event_type)
        .orderBy(sql`count(*) desc`),
    ]);

    return res.json({
      period_days: days,
      since: since.toISOString(),
      totals: {
        page_views: Number(totals?.views ?? 0),
        visits: Number(totals?.sessions ?? 0),
        signed_in_users: Number(totals?.signed_in ?? 0),
      },
      by_day: byDay.map(r => ({ day: r.day, views: Number(r.views), visits: Number(r.sessions) })),
      by_path: byPath.map(r => ({ path: r.path, views: Number(r.views), visits: Number(r.sessions) })),
      by_referrer: byReferrer.map(r => ({ referrer: r.referrer, visits: Number(r.sessions) })),
      actions: topEvents.map(r => ({ event_type: r.event_type, count: Number(r.count) })),
      notice:
        "A visit is a browser tab session, not a person — session ids live in sessionStorage and are discarded when the tab closes. " +
        "No cookies, no cross-site tracking, IPs stored only as a truncated hash. Read these as trends.",
    });
  } catch (err) {
    logger.error({ err }, "Failed to build traffic report");
    return res.status(500).json({ error: "Could not load traffic data" });
  }
});

export default router;
