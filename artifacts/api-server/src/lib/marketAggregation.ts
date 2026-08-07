/**
 * MarketDataAggregationService
 *
 * Transforms raw bids/requests/operator data into anonymized market snapshots.
 * Two data tiers:
 *   1. Operational — includes operator_id for internal admin use only
 *   2. Public resale — fully anonymized aggregates (no IDs, no emails, no names)
 *
 * Privacy rules enforced here:
 *   - Never include personal names, emails, phone numbers, or chat content
 *   - Never include exact user identity
 *   - Only export aggregated category pricing, volume, and performance distributions
 */
import { db } from "@workspace/db";
import { bidsTable, requestsTable, operatorsTable, priceDataPointsTable } from "@workspace/db/schema";
import { eq, avg, count, min, max, sql, gte } from "drizzle-orm";

/**
 * Minimum number of DISTINCT OPERATORS required before a price average may be
 * published. Counting bids instead of operators would be trivially defeated —
 * one operator quoting three times would satisfy the floor and then see their
 * own average published back to them.
 */
const MIN_COHORT = 3;

/**
 * Separate, higher floor for publishing the min/max of a price range.
 *
 * `min` and `max` are not aggregates: each is one operator's exact quote. They
 * are also algebraically dangerous next to an average — with n=3 the third
 * value is recoverable as `3*avg - min - max`, which reconstructs the whole
 * price set. Requiring a larger cohort makes both the direct attribution and
 * the reconstruction impractical.
 */
const MIN_RANGE_COHORT = 5;

export interface CategoryPriceSummary {
  category: string;
  avg_quoted_price: number | null;
  avg_accepted_price: number | null;
  min_price: number | null;
  max_price: number | null;
  quote_count: number;
  accepted_count: number;
  acceptance_rate: number | null;
  total_volume_kg: number;
  avg_lead_time_days: number | null;
}

export interface OperatorPerformanceSummary {
  operator_id: number;
  operator_name: string;
  total_quotes: number;
  accepted_quotes: number;
  win_rate: number;
  avg_price: number | null;
  avg_turnaround_days: number | null;
}

export interface RegionSummary {
  country: string;
  operator_count: number;
  available_count: number;
  /** Null when fewer than MIN_COHORT operators — withheld to protect individual pricing. */
  avg_price_per_kg: number | null;
  avg_turnaround_days: number | null;
}

export interface CertificationCoverage {
  certification: string;
  operator_count: number;
  /** Share of listed operators holding this certification, 0–100. */
  pct_of_operators: number;
  /** How many of those have had the certificate document verified by an admin. */
  verified_count: number;
}

export interface MonthlyTrendPoint {
  /** YYYY-MM */
  month: string;
  rfq_count: number;
  bid_count: number;
  /** Null when fewer than MIN_COHORT bids that month. */
  avg_bid_price: number | null;
}

export interface PublicMarketSnapshot {
  category_stats: CategoryPriceSummary[];
  regions: RegionSummary[];
  certifications: CertificationCoverage[];
  monthly_trends: MonthlyTrendPoint[];
  platform: {
    total_requests: number;
    total_quotes: number;
    total_operators: number;
    available_operators: number;
    accepted_contracts: number;
    platform_acceptance_rate: number | null;
    avg_turnaround_days: number | null;
    avg_quoted_price: number | null;
  };
  /** Distinct operators required before a price average is published. */
  min_cohort: number;
  /** Distinct operators required before a min/max price range is published. */
  min_range_cohort: number;
  privacy_notice: string;
  generated_at: string;
}

class MarketDataAggregationService {
  /**
   * Anonymized pricing + volume aggregates per category.
   * Safe for public display and export — no PII.
   */
  async getCategoryStats(): Promise<CategoryPriceSummary[]> {
    const allQuotes = await db
      .select({
        category: requestsTable.material_type,
        avg_price: avg(bidsTable.price_per_kg),
        min_price: min(bidsTable.price_per_kg),
        max_price: max(bidsTable.price_per_kg),
        quote_count: count(bidsTable.id),
        operator_count: sql<number>`count(distinct ${bidsTable.operator_id})`,
        total_volume: sql<number>`coalesce(sum(${requestsTable.quantity_kg}), 0)`,
        avg_lead_time: avg(bidsTable.turnaround_days),
      })
      .from(bidsTable)
      .innerJoin(requestsTable, eq(bidsTable.request_id, requestsTable.id))
      .groupBy(requestsTable.material_type)
      .orderBy(sql`count(${bidsTable.id}) desc`);

    const acceptedQuotes = await db
      .select({
        category: requestsTable.material_type,
        avg_accepted: avg(bidsTable.price_per_kg),
        accepted_count: count(bidsTable.id),
        accepted_operator_count: sql<number>`count(distinct ${bidsTable.operator_id})`,
      })
      .from(bidsTable)
      .innerJoin(requestsTable, eq(bidsTable.request_id, requestsTable.id))
      .where(eq(bidsTable.status, "accepted"))
      .groupBy(requestsTable.material_type);

    const acceptedMap = new Map(acceptedQuotes.map(a => [a.category, a]));

    return allQuotes
      .filter(q => Number(q.operator_count) >= MIN_COHORT)
      .map(q => {
        const acc = acceptedMap.get(q.category);
        const operatorCount = Number(q.operator_count);
        const acceptedOperators = Number(acc?.accepted_operator_count ?? 0);
        // min/max are individual quotes, so they need their own, higher floor.
        const canPublishRange = operatorCount >= MIN_RANGE_COHORT;
        return {
          category: q.category,
          avg_quoted_price: q.avg_price ? parseFloat(Number(q.avg_price).toFixed(2)) : null,
          // Accepted prices are actual contract values — floored on the number of
          // distinct winning operators, not on total quote volume.
          avg_accepted_price:
            acceptedOperators >= MIN_COHORT && acc?.avg_accepted != null
              ? parseFloat(Number(acc.avg_accepted).toFixed(2))
              : null,
          min_price: canPublishRange ? q.min_price : null,
          max_price: canPublishRange ? q.max_price : null,
          quote_count: Number(q.quote_count),
          accepted_count: Number(acc?.accepted_count ?? 0),
          acceptance_rate: Number(q.quote_count) > 0
            ? parseFloat((Number(acc?.accepted_count ?? 0) / Number(q.quote_count) * 100).toFixed(1))
            : null,
          total_volume_kg: q.total_volume ?? 0,
          avg_lead_time_days: q.avg_lead_time ? parseFloat(Number(q.avg_lead_time).toFixed(1)) : null,
        };
      });
  }

  /**
   * Per-operator performance data for internal admin use only.
   * Includes operator_id — do NOT expose via public API.
   */
  async getOperatorPerformance(): Promise<OperatorPerformanceSummary[]> {
    const allBids = await db
      .select({
        operator_id: bidsTable.operator_id,
        operator_name: bidsTable.operator_name,
        total: count(bidsTable.id),
        avg_price: avg(bidsTable.price_per_kg),
        avg_turnaround: avg(bidsTable.turnaround_days),
      })
      .from(bidsTable)
      .groupBy(bidsTable.operator_id, bidsTable.operator_name)
      .orderBy(sql`count(${bidsTable.id}) desc`);

    const acceptedBids = await db
      .select({
        operator_id: bidsTable.operator_id,
        won: count(bidsTable.id),
      })
      .from(bidsTable)
      .where(eq(bidsTable.status, "accepted"))
      .groupBy(bidsTable.operator_id);

    const wonMap = new Map(acceptedBids.map(a => [a.operator_id, a.won]));

    return allBids.map(b => {
      const won = wonMap.get(b.operator_id) ?? 0;
      return {
        operator_id: b.operator_id,
        operator_name: b.operator_name,
        total_quotes: b.total,
        accepted_quotes: won,
        win_rate: b.total > 0 ? parseFloat((won / b.total * 100).toFixed(1)) : 0,
        avg_price: b.avg_price ? parseFloat(Number(b.avg_price).toFixed(2)) : null,
        avg_turnaround_days: b.avg_turnaround ? parseFloat(Number(b.avg_turnaround).toFixed(1)) : null,
      };
    });
  }

  /**
   * Operator supply and pricing by country.
   * Operator counts are plain facts and always shown; average prices are
   * withheld below MIN_COHORT so a single operator's rate card is not exposed.
   */
  async getRegionalStats(): Promise<RegionSummary[]> {
    const rows = await db
      .select({
        country: sql<string>`coalesce(nullif(${operatorsTable.country}, ''), 'Unspecified')`,
        operator_count: count(operatorsTable.id),
        available_count: sql<number>`count(*) filter (where ${operatorsTable.available})`,
        avg_price: avg(operatorsTable.price_per_kg),
        avg_turnaround: avg(operatorsTable.turnaround_days),
      })
      .from(operatorsTable)
      .groupBy(sql`coalesce(nullif(${operatorsTable.country}, ''), 'Unspecified')`)
      .orderBy(sql`count(${operatorsTable.id}) desc`);

    return rows.map(r => ({
      country: r.country,
      operator_count: Number(r.operator_count),
      available_count: Number(r.available_count),
      avg_price_per_kg:
        Number(r.operator_count) >= MIN_COHORT && r.avg_price !== null
          ? parseFloat(Number(r.avg_price).toFixed(2))
          : null,
      avg_turnaround_days:
        Number(r.operator_count) >= MIN_COHORT && r.avg_turnaround !== null
          ? parseFloat(Number(r.avg_turnaround).toFixed(1))
          : null,
    }));
  }

  /**
   * How widely each certification is held across listed operators.
   *
   * This measures *supply-side coverage* (operators holding a cert), which is
   * a fact we can verify. It deliberately does NOT claim to measure buyer
   * demand — RFQ requirements are free-text and cannot be reliably parsed.
   */
  async getCertificationCoverage(): Promise<CertificationCoverage[]> {
    const [totals] = await db.select({ total: count() }).from(operatorsTable);
    const totalOperators = Number(totals?.total ?? 0);
    if (totalOperators === 0) return [];

    const rows = await db
      .select({
        certification: sql<string>`cert`,
        operator_count: sql<number>`count(distinct ${operatorsTable.id})`,
        verified_count: sql<number>`count(distinct ${operatorsTable.id}) filter (where cert = any(${operatorsTable.verified_certifications}))`,
      })
      .from(sql`${operatorsTable}, unnest(${operatorsTable.certifications}) as cert`)
      .groupBy(sql`cert`)
      .orderBy(sql`count(distinct ${operatorsTable.id}) desc`);

    return rows
      .filter(r => r.certification && String(r.certification).trim() !== "")
      .map(r => ({
        certification: String(r.certification),
        operator_count: Number(r.operator_count),
        pct_of_operators: parseFloat(((Number(r.operator_count) / totalOperators) * 100).toFixed(1)),
        verified_count: Number(r.verified_count),
      }));
  }

  /**
   * RFQ volume, bid volume, and average quoted price for the last 6 months.
   * Average price is withheld for any month with fewer than MIN_COHORT bids.
   */
  async getMonthlyTrends(months = 6): Promise<MonthlyTrendPoint[]> {
    const since = new Date();
    since.setUTCDate(1);
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCMonth(since.getUTCMonth() - (months - 1));

    const [rfqRows, bidRows] = await Promise.all([
      db
        .select({
          month: sql<string>`to_char(${requestsTable.created_at}, 'YYYY-MM')`,
          cnt: count(),
        })
        .from(requestsTable)
        .where(gte(requestsTable.created_at, since))
        .groupBy(sql`to_char(${requestsTable.created_at}, 'YYYY-MM')`),
      db
        .select({
          month: sql<string>`to_char(${bidsTable.created_at}, 'YYYY-MM')`,
          cnt: count(),
          operator_count: sql<number>`count(distinct ${bidsTable.operator_id})`,
          avg_price: avg(bidsTable.price_per_kg),
        })
        .from(bidsTable)
        .where(gte(bidsTable.created_at, since))
        .groupBy(sql`to_char(${bidsTable.created_at}, 'YYYY-MM')`),
    ]);

    const rfqMap = new Map(rfqRows.map(r => [r.month, Number(r.cnt)]));
    const bidMap = new Map(bidRows.map(r => [r.month, r]));

    // Emit a continuous series so the chart has no gaps, even for empty months.
    const series: MonthlyTrendPoint[] = [];
    for (let i = 0; i < months; i++) {
      const d = new Date(since);
      d.setUTCMonth(since.getUTCMonth() + i);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      const bid = bidMap.get(key);
      const bidCount = bid ? Number(bid.cnt) : 0;
      // Floored on distinct operators active that month — a single operator
      // bidding three times must not surface their own monthly average.
      const monthOperators = Number(bid?.operator_count ?? 0);
      series.push({
        month: key,
        rfq_count: rfqMap.get(key) ?? 0,
        bid_count: bidCount,
        avg_bid_price:
          monthOperators >= MIN_COHORT && bid?.avg_price != null
            ? parseFloat(Number(bid.avg_price).toFixed(2))
            : null,
      });
    }
    return series;
  }

  /**
   * Full anonymized public market snapshot.
   * Safe for external display, reports, or data resale.
   * No PII included — all category names are product types, not personal data.
   */
  async getPublicMarketSnapshot(): Promise<PublicMarketSnapshot> {
    const [
      categoryStats,
      regions,
      certifications,
      monthlyTrends,
      totalRequests,
      totalQuotes,
      totalOperators,
      availableOperators,
      accepted,
      bidAggregates,
    ] = await Promise.all([
      this.getCategoryStats(),
      this.getRegionalStats(),
      this.getCertificationCoverage(),
      this.getMonthlyTrends(),
      db.select({ count: count() }).from(requestsTable).then(r => r[0]),
      db.select({ count: count() }).from(bidsTable).then(r => r[0]),
      db.select({ count: count() }).from(operatorsTable).then(r => r[0]),
      db.select({ count: count() }).from(operatorsTable).where(eq(operatorsTable.available, true)).then(r => r[0]),
      db.select({ count: count() }).from(bidsTable).where(eq(bidsTable.status, "accepted")).then(r => r[0]),
      db
        .select({
          avg_turnaround: avg(bidsTable.turnaround_days),
          avg_price: avg(bidsTable.price_per_kg),
          operator_count: sql<number>`count(distinct ${bidsTable.operator_id})`,
        })
        .from(bidsTable)
        .then(r => r[0]),
    ]);

    const quoteCount = Number(totalQuotes.count);
    const biddingOperators = Number(bidAggregates.operator_count ?? 0);

    return {
      category_stats: categoryStats,
      regions,
      certifications,
      monthly_trends: monthlyTrends,
      platform: {
        total_requests: Number(totalRequests.count),
        total_quotes: quoteCount,
        total_operators: Number(totalOperators.count),
        available_operators: Number(availableOperators.count),
        accepted_contracts: Number(accepted.count),
        platform_acceptance_rate: quoteCount > 0
          ? parseFloat((Number(accepted.count) / quoteCount * 100).toFixed(1))
          : null,
        avg_turnaround_days: bidAggregates.avg_turnaround != null
          ? parseFloat(Number(bidAggregates.avg_turnaround).toFixed(1))
          : null,
        // Withheld until enough distinct operators have bid that no single
        // operator's pricing is identifiable from the platform-wide average.
        avg_quoted_price: biddingOperators >= MIN_COHORT && bidAggregates.avg_price != null
          ? parseFloat(Number(bidAggregates.avg_price).toFixed(2))
          : null,
      },
      min_cohort: MIN_COHORT,
      min_range_cohort: MIN_RANGE_COHORT,
      privacy_notice:
        "All figures are computed from actual LyoDex platform activity, aggregated and anonymized. " +
        `Price averages are withheld unless at least ${MIN_COHORT} distinct operators contributed; ` +
        `price ranges (min/max) require at least ${MIN_RANGE_COHORT}. ` +
        "No personally identifiable information is included. " +
        "Consult legal counsel before commercial data resale.",
      generated_at: new Date().toISOString(),
    };
  }
}

export const marketAggregation = new MarketDataAggregationService();
