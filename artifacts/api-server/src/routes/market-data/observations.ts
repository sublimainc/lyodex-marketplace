import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  marketObservationsTable,
  OBSERVATION_SOURCE_TYPES,
  OBSERVATION_GRADES,
  PRICE_UNITS,
  CONFIDENCE_LEVELS,
} from "@workspace/db/schema";
import { eq, desc, and, sql, type SQL } from "drizzle-orm";
import { requireAuth, requireRole, requireAdminCapability } from "../../middleware/requireAuth";
import { logger } from "../../lib/logger";
import { z } from "zod/v4";

const router: IRouter = Router();

const adminRead = [requireAuth, requireRole("admin"), requireAdminCapability("read")];
const adminWrite = [requireAuth, requireRole("admin"), requireAdminCapability("moderate")];

/**
 * Market observations — prices gathered outside the platform.
 *
 * Entry is admin-only on purpose. These figures carry no transaction behind
 * them, so the only thing standing between a rumour and a published benchmark
 * is a human deciding to publish it. `included_in_public` defaults to false and
 * has to be turned on deliberately.
 */

const ObservationBody = z.object({
  source_type: z.enum(OBSERVATION_SOURCE_TYPES),
  source_detail: z.string().trim().max(300).optional(),
  source_url: z.union([z.url(), z.literal("")]).optional(),
  confidence: z.enum(CONFIDENCE_LEVELS).default("medium"),

  category: z.string().trim().min(1).max(120),
  grade: z.enum(OBSERVATION_GRADES).default("food"),
  product_detail: z.string().trim().max(300).optional(),

  price_amount: z.coerce.number().positive().max(1_000_000),
  price_unit: z.enum(PRICE_UNITS).default("per_kg"),
  currency: z.enum(["CAD", "USD", "EUR"]).default("CAD"),

  volume_min_kg: z.coerce.number().min(0).max(10_000_000).nullish(),
  volume_max_kg: z.coerce.number().min(0).max(10_000_000).nullish(),

  region: z.string().trim().max(120).optional(),
  country: z.string().trim().min(2).max(60).default("CA"),
  observed_at: z.coerce.date().optional(),

  certifications_required: z.array(z.string().trim().max(60)).max(20).default([]),
  lead_time_days: z.coerce.number().int().min(0).max(3650).nullish(),
  conditions: z.string().trim().max(500).optional(),

  operator_id: z.coerce.number().int().positive().nullish(),
  included_in_public: z.boolean().default(false),
  admin_notes: z.string().trim().max(2000).optional(),
}).refine(
  v => v.volume_min_kg == null || v.volume_max_kg == null || v.volume_max_kg >= v.volume_min_kg,
  { message: "volume_max_kg must be greater than or equal to volume_min_kg", path: ["volume_max_kg"] },
);

// ─── GET /admin/observations ─────────────────────────────────────────────────
router.get("/admin/observations", ...adminRead, async (req, res) => {
  try {
    const { grade, category, country, published } = req.query as Record<string, string | undefined>;
    const conditions: SQL[] = [];
    if (grade) conditions.push(eq(marketObservationsTable.grade, grade));
    if (category) conditions.push(eq(marketObservationsTable.category, category));
    if (country) conditions.push(eq(marketObservationsTable.country, country));
    if (published === "true") conditions.push(eq(marketObservationsTable.included_in_public, true));
    if (published === "false") conditions.push(eq(marketObservationsTable.included_in_public, false));

    const rows = await db
      .select()
      .from(marketObservationsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(marketObservationsTable.observed_at))
      .limit(500);

    return res.json(rows);
  } catch (err) {
    logger.error({ err }, "Failed to list market observations");
    return res.status(500).json({ error: "Could not load observations" });
  }
});

// ─── POST /admin/observations ────────────────────────────────────────────────
router.post("/admin/observations", ...adminWrite, async (req, res) => {
  const parsed = ObservationBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid observation", details: z.treeifyError(parsed.error) });
  }

  try {
    const { source_url, ...rest } = parsed.data;
    const [row] = await db
      .insert(marketObservationsTable)
      .values({
        ...rest,
        source_url: source_url || null,
        // Publishing is an explicit act — record who did it.
        verified_by: parsed.data.included_in_public ? req.user!.userId : null,
        verified_at: parsed.data.included_in_public ? new Date() : null,
      })
      .returning();

    logger.info({ id: row.id, admin: req.user!.email }, "Market observation recorded");
    return res.status(201).json(row);
  } catch (err) {
    logger.error({ err }, "Failed to create market observation");
    return res.status(500).json({ error: "Could not save observation" });
  }
});

// ─── PATCH /admin/observations/:id ───────────────────────────────────────────
router.patch("/admin/observations/:id", ...adminWrite, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = ObservationBody.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid update", details: z.treeifyError(parsed.error) });
  }

  try {
    const updates: Record<string, unknown> = { ...parsed.data, updated_at: new Date() };
    // Track who put a figure in front of the public, and when.
    if (parsed.data.included_in_public === true) {
      updates.verified_by = req.user!.userId;
      updates.verified_at = new Date();
    }
    if (parsed.data.included_in_public === false) {
      updates.verified_by = null;
      updates.verified_at = null;
    }

    const [row] = await db
      .update(marketObservationsTable)
      .set(updates as never)
      .where(eq(marketObservationsTable.id, id))
      .returning();

    if (!row) return res.status(404).json({ error: "Observation not found" });
    return res.json(row);
  } catch (err) {
    logger.error({ err }, "Failed to update market observation");
    return res.status(500).json({ error: "Could not update observation" });
  }
});

// ─── DELETE /admin/observations/:id ──────────────────────────────────────────
router.delete("/admin/observations/:id", ...adminWrite, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const [row] = await db
      .delete(marketObservationsTable)
      .where(eq(marketObservationsTable.id, id))
      .returning({ id: marketObservationsTable.id });
    if (!row) return res.status(404).json({ error: "Observation not found" });
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete market observation");
    return res.status(500).json({ error: "Could not delete observation" });
  }
});

// ─── GET /market/observations ────────────────────────────────────────────────
// Public. Returns only reviewed-and-published rows, and never the source
// identity — an operator who tells us their price must not find their name
// attached to it on a public page.
router.get("/market/observations", async (_req, res) => {
  try {
    const rows = await db
      .select({
        category: marketObservationsTable.category,
        grade: marketObservationsTable.grade,
        product_detail: marketObservationsTable.product_detail,
        price_amount: marketObservationsTable.price_amount,
        price_unit: marketObservationsTable.price_unit,
        currency: marketObservationsTable.currency,
        volume_min_kg: marketObservationsTable.volume_min_kg,
        volume_max_kg: marketObservationsTable.volume_max_kg,
        region: marketObservationsTable.region,
        country: marketObservationsTable.country,
        observed_at: marketObservationsTable.observed_at,
        certifications_required: marketObservationsTable.certifications_required,
        lead_time_days: marketObservationsTable.lead_time_days,
        conditions: marketObservationsTable.conditions,
        confidence: marketObservationsTable.confidence,
        // source_type is published (it tells a reader how the figure was
        // obtained) but source_detail and source_url are not.
        source_type: marketObservationsTable.source_type,
      })
      .from(marketObservationsTable)
      .where(eq(marketObservationsTable.included_in_public, true))
      .orderBy(desc(marketObservationsTable.observed_at))
      .limit(500);

    // Count of distinct sources per category+grade, so the page can say how
    // thin or well-supported a benchmark is instead of implying certainty.
    const coverage = await db
      .select({
        category: marketObservationsTable.category,
        grade: marketObservationsTable.grade,
        observation_count: sql<number>`count(*)`,
        distinct_sources: sql<number>`count(distinct coalesce(${marketObservationsTable.source_detail}, ${marketObservationsTable.id}::text))`,
      })
      .from(marketObservationsTable)
      .where(eq(marketObservationsTable.included_in_public, true))
      .groupBy(marketObservationsTable.category, marketObservationsTable.grade);

    res.set("Cache-Control", "public, max-age=300");
    return res.json({
      observations: rows,
      coverage: coverage.map(c => ({
        category: c.category,
        grade: c.grade,
        observation_count: Number(c.observation_count),
        distinct_sources: Number(c.distinct_sources),
      })),
      notice:
        "Observed prices reported to LyoDex by operators, buyers and published sources. " +
        "These are not averages computed from contracts awarded on the platform — see Market intelligence for those. " +
        "Source identities are never published.",
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Failed to load public observations");
    return res.status(500).json({ error: "Observations are temporarily unavailable" });
  }
});

export default router;
