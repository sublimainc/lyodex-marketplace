import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { machineryListingsTable } from "@workspace/db/schema";
import { eq, and, or, ilike, desc, asc, sql, type SQL } from "drizzle-orm";
import { optionalAuth, requireAuth } from "../../middleware/requireAuth";
import { logger } from "../../lib/logger";
import { z } from "zod/v4";
import rateLimit from "express-rate-limit";

const router: IRouter = Router();

/**
 * Public machinery marketplace.
 *
 * Only listings an admin has moved to `listing_status = 'active'` are visible
 * here. Submissions land as `pending` and stay invisible until reviewed — the
 * public surface must never imply a listing is vetted when it is not.
 * Admin review/CRUD lives in routes/admin.ts (`/admin/machinery`).
 */

// Listing fields safe for anyone to see. Deliberately excludes the submitter's
// user_id/operator_id and their contact details: many submitters are private
// individuals, and an unauthenticated bulk endpoint returning email + phone for
// every listing is a harvestable contact list. Contact details are served
// per-listing to signed-in users only (see GET /machinery/:id below).
const PUBLIC_COLUMNS = {
  id: machineryListingsTable.id,
  title: machineryListingsTable.title,
  category: machineryListingsTable.category,
  condition: machineryListingsTable.condition,
  description: machineryListingsTable.description,
  price: machineryListingsTable.price,
  currency: machineryListingsTable.currency,
  manufacturer_name: machineryListingsTable.manufacturer_name,
  model_number: machineryListingsTable.model_number,
  year_manufactured: machineryListingsTable.year_manufactured,
  technical_specs: machineryListingsTable.technical_specs,
  images: machineryListingsTable.images,
  created_at: machineryListingsTable.created_at,
};

/** Express may deliver a repeated query param as an array; only accept scalars. */
function scalar(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

// ─── GET /machinery ───────────────────────────────────────────────────────────
// Browsing is public, but rate-limited: without a cap this is a cheap way to
// scrape the whole catalogue repeatedly.
const browseLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — please slow down" },
});

router.get("/machinery", browseLimiter, async (req, res): Promise<void> => {
  try {
    const search = scalar(req.query.search);
    const category = scalar(req.query.category);
    const country = scalar(req.query.country);
    const sort = scalar(req.query.sort);

    const conditions: SQL[] = [eq(machineryListingsTable.listing_status, "active")];

    if (search) {
      const q = `%${search}%`;
      const match = or(
        ilike(machineryListingsTable.title, q),
        ilike(machineryListingsTable.manufacturer_name, q),
        ilike(machineryListingsTable.model_number, q),
        ilike(machineryListingsTable.description, q),
      );
      if (match) conditions.push(match);
    }
    if (category && category !== "all") {
      conditions.push(eq(machineryListingsTable.category, category));
    }
    // Country is not a first-class column; listings encode it in technical_specs.
    // The value is parameter-bound by drizzle, not interpolated.
    if (country && country !== "all") {
      conditions.push(sql`${machineryListingsTable.technical_specs}->>'country' = ${country}`);
    }

    const orderBy =
      sort === "price_asc" ? asc(machineryListingsTable.price)
      : sort === "price_desc" ? desc(machineryListingsTable.price)
      : desc(machineryListingsTable.created_at);

    const rows = await db
      .select(PUBLIC_COLUMNS)
      .from(machineryListingsTable)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(200);

    res.json({ listings: rows, total: rows.length });
  } catch (err) {
    logger.error({ err }, "Failed to list machinery");
    res.status(500).json({ error: "Could not load listings" });
  }
});

// ─── GET /machinery/:id ───────────────────────────────────────────────────────
// Single listing including seller contact details. Requires a signed-in user so
// contact data cannot be scraped anonymously in bulk.
router.get("/machinery/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  try {
    const [row] = await db
      .select({
        ...PUBLIC_COLUMNS,
        contact_name: machineryListingsTable.contact_name,
        contact_email: machineryListingsTable.contact_email,
        phone: machineryListingsTable.phone,
      })
      .from(machineryListingsTable)
      .where(and(
        eq(machineryListingsTable.id, id),
        eq(machineryListingsTable.listing_status, "active"),
      ))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    res.json(row);
  } catch (err) {
    logger.error({ err }, "Failed to load machinery listing");
    res.status(500).json({ error: "Could not load listing" });
  }
});

// ─── POST /machinery ──────────────────────────────────────────────────────────
// Anyone may submit; nothing is published until an admin approves it.
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many submissions — please try again later" },
});

const SubmitBody = z.object({
  title: z.string().trim().min(3).max(200),
  category: z.string().trim().max(64).default("other"),
  condition: z.string().trim().max(32).default("used"),
  description: z.string().trim().max(5000).optional(),
  price: z.coerce.number().min(0).max(100_000_000).nullish(),
  currency: z.enum(["CAD", "USD"]).default("CAD"),
  manufacturer_name: z.string().trim().max(200).optional(),
  model_number: z.string().trim().max(200).optional(),
  year_manufactured: z.coerce.number().int().min(1900).max(2100).nullish(),
  // Bounded so a submitter cannot store an arbitrarily large JSON blob.
  technical_specs: z
    .record(z.string().max(64), z.string().max(500))
    .refine(o => Object.keys(o).length <= 40, { message: "Too many spec fields (max 40)" })
    .default({}),
  contact_name: z.string().trim().max(200).optional(),
  contact_email: z.email().max(320),
  phone: z.string().trim().max(64).optional(),
});

router.post("/machinery", submitLimiter, optionalAuth, async (req, res): Promise<void> => {
  const parsed = SubmitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid listing", details: z.treeifyError(parsed.error) });
    return;
  }

  try {
    const [row] = await db
      .insert(machineryListingsTable)
      .values({
        ...parsed.data,
        // Images are not accepted here: the public form has no authenticated
        // upload path, and trusting client-supplied URLs would let anyone
        // embed arbitrary remote content on the marketplace.
        images: [],
        // Never trust a client-supplied status — review is the whole point.
        listing_status: "pending",
        user_id: req.user?.userId ?? null,
      })
      .returning({ id: machineryListingsTable.id });

    res.status(201).json({
      id: row?.id,
      status: "pending",
      message: "Submitted for review. Listings appear publicly once approved.",
    });
  } catch (err) {
    logger.error({ err }, "Failed to submit machinery listing");
    res.status(500).json({ error: "Could not submit listing" });
  }
});

export default router;
