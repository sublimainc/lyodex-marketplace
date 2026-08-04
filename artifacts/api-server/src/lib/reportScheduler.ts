import cron from "node-cron";
import { db } from "@workspace/db";
import {
  siteSettingsTable,
  reportSnapshotsTable,
  requestsTable,
  bidsTable,
  priceDataPointsTable,
  operatorsTable,
  operatorListingsTable,
  operatorProductsTable,
} from "@workspace/db/schema";
import { eq, desc, count, sql, gte, lte, and } from "drizzle-orm";
import { logger } from "./logger";
import { historicalFeeRate } from "./fees";
import { sendScheduledReportEmail } from "./email";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getSettingValue(key: string): Promise<string | null> {
  const [row] = await db
    .select({ value: siteSettingsTable.value })
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, key))
    .limit(1);
  return row?.value ?? null;
}

// ─── Core report generation (mirrors POST /api/admin/reports/generate) ────────

async function generateReportSnapshot(
  cadence: "weekly" | "monthly",
  start: Date,
  end: Date,
): Promise<{ id: number; data_json: unknown }> {
  const [
    avgPriceRows,
    materialRows,
    requestsByMonthRows,
    bidsByMonthRows,
    acceptedBidRows,
    allBidsByOp,
    capacityListingCounts,
    productListingCounts,
  ] = await Promise.all([
    db
      .select({
        category: priceDataPointsTable.category,
        avg_price: sql<number>`avg(${priceDataPointsTable.quoted_price})`,
        cnt: count(),
      })
      .from(priceDataPointsTable)
      .where(
        and(
          gte(priceDataPointsTable.created_at, start),
          lte(priceDataPointsTable.created_at, end),
          eq(priceDataPointsTable.included_in_market_intelligence, true),
        ),
      )
      .groupBy(priceDataPointsTable.category)
      .orderBy(desc(count())),

    db
      .select({ material_type: requestsTable.material_type, cnt: count() })
      .from(requestsTable)
      .where(and(gte(requestsTable.created_at, start), lte(requestsTable.created_at, end)))
      .groupBy(requestsTable.material_type)
      .orderBy(desc(count()))
      .limit(10),

    db
      .select({ month: sql<string>`to_char(created_at, 'YYYY-MM')`, cnt: count() })
      .from(requestsTable)
      .where(and(gte(requestsTable.created_at, start), lte(requestsTable.created_at, end)))
      .groupBy(sql`to_char(created_at, 'YYYY-MM')`)
      .orderBy(sql`to_char(created_at, 'YYYY-MM')`),

    db
      .select({ month: sql<string>`to_char(${bidsTable.created_at}, 'YYYY-MM')`, cnt: count() })
      .from(bidsTable)
      .where(and(gte(bidsTable.created_at, start), lte(bidsTable.created_at, end)))
      .groupBy(sql`to_char(${bidsTable.created_at}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${bidsTable.created_at}, 'YYYY-MM')`),

    db
      .select({
        price_per_kg: bidsTable.price_per_kg,
        platform_fee_rate: bidsTable.platform_fee_rate,
        quantity_kg: requestsTable.quantity_kg,
        month: sql<string>`to_char(${bidsTable.created_at}, 'YYYY-MM')`,
        operator_name: bidsTable.operator_name,
      })
      .from(bidsTable)
      .leftJoin(requestsTable, eq(bidsTable.request_id, requestsTable.id))
      .where(
        and(
          eq(bidsTable.status, "accepted"),
          gte(bidsTable.created_at, start),
          lte(bidsTable.created_at, end),
        ),
      ),

    db
      .select({ operator_name: bidsTable.operator_name, status: bidsTable.status, cnt: count() })
      .from(bidsTable)
      .where(and(gte(bidsTable.created_at, start), lte(bidsTable.created_at, end)))
      .groupBy(bidsTable.operator_name, bidsTable.status),

    db.select({
      total: count(),
      approved: sql<number>`count(*) filter (where approval_status = 'approved')`,
    }).from(operatorListingsTable),

    db.select({
      total: count(),
      approved: sql<number>`count(*) filter (where approval_status = 'approved')`,
    }).from(operatorProductsTable),
  ]);

  const revenueByMonth: Record<string, number> = {};
  let totalContractValue = 0;
  let totalQtyKg = 0;
  for (const r of acceptedBidRows) {
    const key = r.month ?? "unknown";
    const val = (r.price_per_kg ?? 0) * (r.quantity_kg ?? 0);
    revenueByMonth[key] = (revenueByMonth[key] ?? 0) + val * historicalFeeRate(r.platform_fee_rate);
    totalContractValue += val;
    totalQtyKg += r.quantity_kg ?? 0;
  }

  const opStats: Record<string, { total: number; won: number }> = {};
  for (const r of allBidsByOp) {
    if (!opStats[r.operator_name]) opStats[r.operator_name] = { total: 0, won: 0 };
    opStats[r.operator_name].total += Number(r.cnt);
    if (r.status === "accepted") opStats[r.operator_name].won += Number(r.cnt);
  }

  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const data_json = {
    avg_price_by_category: avgPriceRows.map((r) => ({
      category: r.category,
      avg_price: +(Number(r.avg_price)).toFixed(2),
      count: Number(r.cnt),
    })),
    top_materials: materialRows.map((r) => ({ name: r.material_type, value: Number(r.cnt) })),
    requests_by_month: requestsByMonthRows.map((r) => ({ month: r.month, value: Number(r.cnt) })),
    bids_by_month: bidsByMonthRows.map((r) => ({ month: r.month, value: Number(r.cnt) })),
    revenue_by_month: Object.entries(revenueByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({ month, value: +value.toFixed(2) })),
    operator_win_rates: Object.entries(opStats)
      .filter(([, s]) => s.total > 0)
      .map(([name, s]) => ({
        name: name.replace(" Freeze Dry", "").replace(" Solutions", ""),
        win_rate: +(s.won / s.total * 100).toFixed(0),
        total_bids: s.total,
        won_bids: s.won,
      }))
      .sort((a, b) => b.win_rate - a.win_rate)
      .slice(0, 10),
    sales_volume: {
      total_contracts: acceptedBidRows.length,
      total_quantity_kg: +totalQtyKg.toFixed(2),
      total_contract_value: +totalContractValue.toFixed(2),
      platform_fees: +Object.values(revenueByMonth).reduce((a, b) => a + b, 0).toFixed(2),
    },
    listing_performance: {
      total_capacity_listings: Number(capacityListingCounts[0]?.total ?? 0),
      total_product_listings: Number(productListingCounts[0]?.total ?? 0),
      approved_capacity: Number(capacityListingCounts[0]?.approved ?? 0),
      approved_products: Number(productListingCounts[0]?.approved ?? 0),
    },
    summary: `Scheduled ${cadence} report covering ${startStr} to ${endStr}. ${acceptedBidRows.length} contracts completed. ${materialRows.length} material categories active.`,
  };

  const cadenceLabel = cadence === "weekly" ? "Weekly" : "Monthly";
  const reportTitle = `${cadenceLabel} Market Intelligence Report — ${startStr} to ${endStr}`;

  const SYSTEM_USER_ID = 0;
  const SYSTEM_EMAIL = "system@lyodex.com";

  const [snapshot] = await db
    .insert(reportSnapshotsTable)
    .values({
      type: cadence,
      date_range_start: start,
      date_range_end: end,
      filters_json: { scheduled: true, cadence },
      generated_by: SYSTEM_USER_ID,
      generated_by_email: SYSTEM_EMAIL,
      title: reportTitle,
      data_json,
    })
    .returning();

  return { id: snapshot.id, data_json };
}

// ─── Main scheduler job ───────────────────────────────────────────────────────

async function runScheduledReport(cadence: "weekly" | "monthly"): Promise<void> {
  try {
    const enabledVal = await getSettingValue("scheduled_reports_enabled");
    if (enabledVal !== "true") {
      logger.info({ cadence }, "Scheduled report skipped — reports are disabled");
      return;
    }

    const storedCadence = await getSettingValue("scheduled_reports_cadence");
    const activeCadence: "weekly" | "monthly" = storedCadence === "monthly" ? "monthly" : "weekly";

    if (activeCadence !== cadence) {
      logger.info({ cadence, activeCadence }, "Scheduled report skipped — cadence mismatch");
      return;
    }

    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    if (cadence === "weekly") {
      start.setDate(start.getDate() - 7);
    } else {
      start.setDate(start.getDate() - 30);
    }

    logger.info({ cadence, start, end }, "Generating scheduled market intelligence report");

    const { id, data_json } = await generateReportSnapshot(cadence, start, end);
    const dataTyped = data_json as Parameters<typeof sendScheduledReportEmail>[0]["data"];

    await sendScheduledReportEmail({
      cadence,
      dateRangeStart: start.toISOString().slice(0, 10),
      dateRangeEnd: end.toISOString().slice(0, 10),
      reportId: id,
      data: dataTyped,
    });

    logger.info({ cadence, reportId: id }, "Scheduled market intelligence report sent");
  } catch (err) {
    logger.error({ err, cadence }, "Scheduled report job failed");
  }
}

// ─── Start the scheduler ──────────────────────────────────────────────────────

export function startReportScheduler(): void {
  // Weekly: every Monday at 07:00 UTC
  cron.schedule("0 7 * * 1", () => {
    void runScheduledReport("weekly");
  }, { timezone: "UTC" });

  // Monthly: 1st of each month at 07:00 UTC
  cron.schedule("0 7 1 * *", () => {
    void runScheduledReport("monthly");
  }, { timezone: "UTC" });

  logger.info("Report scheduler started (weekly: Mon 07:00 UTC, monthly: 1st 07:00 UTC)");
}
