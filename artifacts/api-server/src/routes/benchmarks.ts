import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { productBenchmarksTable } from "@workspace/db/schema";
import { and, eq, sql, desc, type SQL } from "drizzle-orm";
import { requireAuth, requireRole, requireAdminCapability } from "../middleware/requireAuth";
import { logger } from "../lib/logger";
import { z } from "zod/v4";
import rateLimit from "express-rate-limit";

const router: IRouter = Router();
const adminRead = [requireAuth, requireRole("admin"), requireAdminCapability("read")];
const adminWrite = [requireAuth, requireRole("admin"), requireAdminCapability("moderate")];

/**
 * Retail price benchmark — finished freeze-dried goods, read from sellers' own
 * public catalogues.
 *
 * Two rules shape every query here.
 *
 * Only high-confidence weights inform any published figure. A benchmark row's
 * price per kilo is only as good as the net weight behind it, and a large share
 * of sellers never publish one. Rows resting on a platform shipping-weight field
 * are kept for completeness and excluded from every aggregate.
 *
 * The public endpoint never names a seller. Prices are public facts, but
 * assembling them into a per-competitor table and publishing it under LyoDex's
 * name is a different act from reporting what a category costs. Admins see the
 * seller and the source URL; the public sees the distribution.
 */

const MIN_VENDORS_FOR_PUBLIC = 3;

// ─── GET /admin/benchmarks ───────────────────────────────────────────────────
router.get("/admin/benchmarks", ...adminRead, async (req, res) => {
  const { category, vendor, confidence, published, q } = req.query as Record<string, string | undefined>;
  const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? "500"), 10) || 500, 1), 2000);

  const conditions: SQL[] = [];
  if (category) conditions.push(eq(productBenchmarksTable.category, category));
  if (vendor) conditions.push(eq(productBenchmarksTable.vendor_domain, vendor));
  if (confidence) conditions.push(eq(productBenchmarksTable.weight_confidence, confidence));
  if (published === "true") conditions.push(eq(productBenchmarksTable.included_in_public, true));
  if (published === "false") conditions.push(eq(productBenchmarksTable.included_in_public, false));
  if (q) {
    conditions.push(sql`(${productBenchmarksTable.product_name} ILIKE ${`%${q}%`} OR ${productBenchmarksTable.vendor_name} ILIKE ${`%${q}%`})`);
  }

  try {
    const rows = await db
      .select()
      .from(productBenchmarksTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(productBenchmarksTable.observed_at))
      .limit(limit);

    return res.json(rows);
  } catch (err) {
    logger.error({ err }, "Failed to list product benchmarks");
    return res.status(500).json({ error: "Could not load benchmarks" });
  }
});

// ─── GET /admin/benchmarks/summary ───────────────────────────────────────────
router.get("/admin/benchmarks/summary", ...adminRead, async (_req, res) => {
  try {
    const byCategory = await db
      .select({
        category: productBenchmarksTable.category,
        rows: sql<number>`count(*)`,
        vendors: sql<number>`count(distinct ${productBenchmarksTable.vendor_domain})`,
        published: sql<number>`count(*) filter (where ${productBenchmarksTable.included_in_public})`,
        median: sql<number>`percentile_cont(0.5) within group (order by ${productBenchmarksTable.price_per_kg_cad})`,
        p25: sql<number>`percentile_cont(0.25) within group (order by ${productBenchmarksTable.price_per_kg_cad})`,
        p75: sql<number>`percentile_cont(0.75) within group (order by ${productBenchmarksTable.price_per_kg_cad})`,
        min: sql<number>`min(${productBenchmarksTable.price_per_kg_cad})`,
        max: sql<number>`max(${productBenchmarksTable.price_per_kg_cad})`,
      })
      .from(productBenchmarksTable)
      .where(and(
        eq(productBenchmarksTable.weight_confidence, "high"),
        sql`${productBenchmarksTable.price_per_kg_cad} is not null`,
      ))
      .groupBy(productBenchmarksTable.category)
      .orderBy(sql`count(*) desc`);

    const byVendor = await db
      .select({
        vendor_name: productBenchmarksTable.vendor_name,
        vendor_domain: productBenchmarksTable.vendor_domain,
        vendor_country: productBenchmarksTable.vendor_country,
        vendor_region: productBenchmarksTable.vendor_region,
        currency: productBenchmarksTable.currency,
        rows: sql<number>`count(*)`,
        priced: sql<number>`count(*) filter (where ${productBenchmarksTable.price_per_kg_cad} is not null and ${productBenchmarksTable.weight_confidence} = 'high')`,
        median: sql<number>`percentile_cont(0.5) within group (order by ${productBenchmarksTable.price_per_kg_cad}) filter (where ${productBenchmarksTable.weight_confidence} = 'high')`,
      })
      .from(productBenchmarksTable)
      .groupBy(
        productBenchmarksTable.vendor_name,
        productBenchmarksTable.vendor_domain,
        productBenchmarksTable.vendor_country,
        productBenchmarksTable.vendor_region,
        productBenchmarksTable.currency,
      )
      .orderBy(sql`count(*) desc`);

    const [totals] = await db
      .select({
        rows: sql<number>`count(*)`,
        vendors: sql<number>`count(distinct ${productBenchmarksTable.vendor_domain})`,
        countries: sql<number>`count(distinct ${productBenchmarksTable.vendor_country})`,
        with_price_per_kg: sql<number>`count(*) filter (where ${productBenchmarksTable.price_per_kg_cad} is not null)`,
        high_confidence: sql<number>`count(*) filter (where ${productBenchmarksTable.weight_confidence} = 'high')`,
        published: sql<number>`count(*) filter (where ${productBenchmarksTable.included_in_public})`,
        last_observed: sql<string>`max(${productBenchmarksTable.observed_at})`,
      })
      .from(productBenchmarksTable);

    return res.json({
      totals,
      by_category: byCategory,
      by_vendor: byVendor,
      notice:
        "Aggregates count only rows whose net weight the seller published. Rows resting on a " +
        "platform shipping-weight field are stored but excluded, because many sellers leave that " +
        "field at a placeholder value.",
    });
  } catch (err) {
    logger.error({ err }, "Failed to summarise product benchmarks");
    return res.status(500).json({ error: "Could not load summary" });
  }
});

// ─── PATCH /admin/benchmarks/:id ─────────────────────────────────────────────
const PatchBody = z.object({
  included_in_public: z.boolean().optional(),
  category: z.string().trim().min(1).max(40).optional(),
  excluded_reason: z.string().trim().max(300).nullish(),
  admin_notes: z.string().trim().max(2000).nullish(),
});

router.patch("/admin/benchmarks/:id", ...adminWrite, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = PatchBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: z.treeifyError(parsed.error) });
  }

  try {
    const [row] = await db
      .update(productBenchmarksTable)
      .set({ ...parsed.data, updated_at: new Date() })
      .where(eq(productBenchmarksTable.id, id))
      .returning();

    if (!row) return res.status(404).json({ error: "Not found" });
    logger.info({ id, admin: req.user!.email }, "Product benchmark updated");
    return res.json(row);
  } catch (err) {
    logger.error({ err }, "Failed to update product benchmark");
    return res.status(500).json({ error: "Could not update benchmark" });
  }
});

// ─── GET /market/product-benchmarks (public) ─────────────────────────────────
const publicLimiter = rateLimit({ windowMs: 60_000, max: 30, standardHeaders: true, legacyHeaders: false });

router.get("/market/product-benchmarks", publicLimiter, async (_req, res) => {
  try {
    const rows = await db
      .select({
        category: productBenchmarksTable.category,
        observations: sql<number>`count(*)`,
        vendors: sql<number>`count(distinct ${productBenchmarksTable.vendor_domain})`,
        median_cad_per_kg: sql<number>`round(percentile_cont(0.5) within group (order by ${productBenchmarksTable.price_per_kg_cad})::numeric, 2)`,
        p25_cad_per_kg: sql<number>`round(percentile_cont(0.25) within group (order by ${productBenchmarksTable.price_per_kg_cad})::numeric, 2)`,
        p75_cad_per_kg: sql<number>`round(percentile_cont(0.75) within group (order by ${productBenchmarksTable.price_per_kg_cad})::numeric, 2)`,
        last_observed: sql<string>`max(${productBenchmarksTable.observed_at})`,
      })
      .from(productBenchmarksTable)
      .where(and(
        eq(productBenchmarksTable.included_in_public, true),
        eq(productBenchmarksTable.weight_confidence, "high"),
        sql`${productBenchmarksTable.price_per_kg_cad} is not null`,
      ))
      .groupBy(productBenchmarksTable.category)
      // Withheld below this many distinct sellers. With one or two, the
      // "distribution" is a specific company's price list wearing a statistic's
      // clothing, and a competitor could read it straight off the page.
      .having(sql`count(distinct ${productBenchmarksTable.vendor_domain}) >= ${MIN_VENDORS_FOR_PUBLIC}`)
      .orderBy(sql`count(*) desc`);

    return res.json({
      categories: rows,
      currency: "CAD",
      min_vendors: MIN_VENDORS_FOR_PUBLIC,
      notice:
        "Retail prices for finished freeze-dried products, read from sellers' public catalogues. " +
        "Individual sellers are never named. A category appears only once at least " +
        `${MIN_VENDORS_FOR_PUBLIC} distinct sellers are behind it. These are retail prices for goods — ` +
        "they are not a rate for freeze-drying someone else's material, which is a service price.",
    });
  } catch (err) {
    logger.error({ err }, "Failed to build public product benchmark");
    return res.status(500).json({ error: "Could not load benchmark" });
  }
});

export default router;
