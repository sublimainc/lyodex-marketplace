import { Router } from "express";
import { db } from "@workspace/db";
import { manufacturersTable, manufacturerReviewsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth } from "../../middleware/requireAuth";

const router = Router();

router.get("/manufacturers", async (_req, res) => {
  const manufacturers = await db
    .select()
    .from(manufacturersTable)
    .orderBy(desc(manufacturersTable.featured), desc(manufacturersTable.avg_rating));
  res.json(manufacturers);
});

router.get("/manufacturers/:slug", async (req, res): Promise<void> => {
  const slug = String(req.params.slug);
  const [mfr] = await db
    .select()
    .from(manufacturersTable)
    .where(eq(manufacturersTable.slug, slug))
    .limit(1);

  if (!mfr) { res.status(404).json({ error: "Manufacturer not found" }); return; }

  const reviews = await db
    .select()
    .from(manufacturerReviewsTable)
    .where(eq(manufacturerReviewsTable.manufacturer_id, mfr.id))
    .orderBy(desc(manufacturerReviewsTable.created_at));

  res.json({ ...mfr, reviews });
});

const reviewSchema = z.object({
  reviewer_name: z.string().min(2).max(100),
  reviewer_company: z.string().max(120).optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(2000),
});

router.post("/manufacturers/:slug/reviews", requireAuth, async (req, res): Promise<void> => {
  const slug = String(req.params.slug);
  const [mfr] = await db
    .select({ id: manufacturersTable.id })
    .from(manufacturersTable)
    .where(eq(manufacturersTable.slug, slug))
    .limit(1);

  if (!mfr) { res.status(404).json({ error: "Manufacturer not found" }); return; }

  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid review data", details: parsed.error.issues }); return; }

  const { reviewer_name, reviewer_company, rating, comment } = parsed.data;
  const user_id = (req as any).user?.userId ?? null;
  const verified_buyer = user_id !== null;

  const [review] = await db
    .insert(manufacturerReviewsTable)
    .values({ manufacturer_id: mfr.id, user_id, reviewer_name, reviewer_company, rating, comment, verified_buyer })
    .returning();

  const [stats] = await db
    .select({
      avg: sql<number>`round(avg(rating)::numeric, 1)`,
      count: sql<number>`count(*)`,
    })
    .from(manufacturerReviewsTable)
    .where(eq(manufacturerReviewsTable.manufacturer_id, mfr.id));

  await db
    .update(manufacturersTable)
    .set({ avg_rating: Number(stats.avg), review_count: Number(stats.count) })
    .where(eq(manufacturersTable.id, mfr.id));

  res.status(201).json(review);
});

export default router;
