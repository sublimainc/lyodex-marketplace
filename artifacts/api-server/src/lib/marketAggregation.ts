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
import { eq, avg, count, min, max, sql } from "drizzle-orm";

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

export interface PublicMarketSnapshot {
  category_stats: CategoryPriceSummary[];
  platform: {
    total_requests: number;
    total_quotes: number;
    total_operators: number;
    accepted_contracts: number;
    platform_acceptance_rate: number | null;
    avg_turnaround_days: number | null;
  };
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
      })
      .from(bidsTable)
      .innerJoin(requestsTable, eq(bidsTable.request_id, requestsTable.id))
      .where(eq(bidsTable.status, "accepted"))
      .groupBy(requestsTable.material_type);

    const acceptedMap = new Map(acceptedQuotes.map(a => [a.category, a]));

    const MIN_COHORT = 3;

    return allQuotes
      .filter(q => q.quote_count >= MIN_COHORT)
      .map(q => {
        const acc = acceptedMap.get(q.category);
        return {
          category: q.category,
          avg_quoted_price: q.avg_price ? parseFloat(Number(q.avg_price).toFixed(2)) : null,
          avg_accepted_price: acc?.avg_accepted ? parseFloat(Number(acc.avg_accepted).toFixed(2)) : null,
          min_price: q.min_price,
          max_price: q.max_price,
          quote_count: q.quote_count,
          accepted_count: acc?.accepted_count ?? 0,
          acceptance_rate: q.quote_count > 0
            ? parseFloat(((acc?.accepted_count ?? 0) / q.quote_count * 100).toFixed(1))
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
   * Full anonymized public market snapshot.
   * Safe for external display, reports, or data resale.
   * No PII included — all category names are product types, not personal data.
   */
  async getPublicMarketSnapshot(): Promise<PublicMarketSnapshot> {
    const [categoryStats, totalRequests, totalQuotes, totalOperators, accepted, avgTurnaround] =
      await Promise.all([
        this.getCategoryStats(),
        db.select({ count: count() }).from(requestsTable).then(r => r[0]),
        db.select({ count: count() }).from(bidsTable).then(r => r[0]),
        db.select({ count: count() }).from(operatorsTable).then(r => r[0]),
        db.select({ count: count() }).from(bidsTable).where(eq(bidsTable.status, "accepted")).then(r => r[0]),
        db.select({ avg: avg(bidsTable.turnaround_days) }).from(bidsTable).then(r => r[0]),
      ]);

    return {
      category_stats: categoryStats,
      platform: {
        total_requests: totalRequests.count,
        total_quotes: totalQuotes.count,
        total_operators: totalOperators.count,
        accepted_contracts: accepted.count,
        platform_acceptance_rate: totalQuotes.count > 0
          ? parseFloat((accepted.count / totalQuotes.count * 100).toFixed(1))
          : null,
        avg_turnaround_days: avgTurnaround.avg
          ? parseFloat(Number(avgTurnaround.avg).toFixed(1))
          : null,
      },
      privacy_notice:
        "All data is aggregated and anonymized. No personally identifiable information is included. " +
        "Consult legal counsel before production release or commercial data resale.",
      generated_at: new Date().toISOString(),
    };
  }
}

export const marketAggregation = new MarketDataAggregationService();
