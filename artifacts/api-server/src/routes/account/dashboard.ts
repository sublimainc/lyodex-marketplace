import { Router, type IRouter } from "express";
import { db, operatorsTable, requestsTable, bidsTable, activityTable } from "@workspace/db";
import { eq, sql, gte } from "drizzle-orm";
import {
  GetDashboardSummaryResponse,
  GetRecentActivityResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../../middleware/requireAuth";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const [totalOps] = await db.select({ count: sql<number>`count(*)::int` }).from(operatorsTable);
  const [activeReqs] = await db.select({ count: sql<number>`count(*)::int` }).from(requestsTable).where(eq(requestsTable.status, "active"));
  const [completedContracts] = await db.select({ count: sql<number>`count(*)::int` }).from(requestsTable).where(eq(requestsTable.status, "completed"));
  const [avgPrice] = await db.select({ avg: sql<number>`avg(price_per_kg)` }).from(operatorsTable);

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [bidsThisWeek] = await db.select({ count: sql<number>`count(*)::int` }).from(bidsTable).where(gte(bidsTable.created_at, oneWeekAgo));

  const summary = {
    total_operators: totalOps.count ?? 0,
    active_requests: activeReqs.count ?? 0,
    completed_contracts: completedContracts.count ?? 0,
    avg_price_per_kg: Number((avgPrice.avg ?? 0).toFixed(2)),
    total_bids_this_week: bidsThisWeek.count ?? 0,
  };

  res.json(GetDashboardSummaryResponse.parse(summary));
});

router.get("/dashboard/recent-activity", requireAuth, async (req, res): Promise<void> => {
  const items = await db.select().from(activityTable).orderBy(sql`${activityTable.timestamp} desc`).limit(20);
  res.json(GetRecentActivityResponse.parse(items.map(a => ({
    ...a,
    timestamp: a.timestamp.toISOString(),
  }))));
});

export default router;
