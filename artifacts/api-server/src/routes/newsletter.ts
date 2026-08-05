import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { newsletterSubscribersTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole, requireAdminCapability } from "../middleware/requireAuth";
import { logger } from "../lib/logger";
import { z } from "zod/v4";
import rateLimit from "express-rate-limit";

const router: IRouter = Router();

// Public and unauthenticated, so it needs a cap. Ten a day per IP is generous
// for a human and useless for a script.
const subscribeLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many sign-ups from this address — please try again later" },
});

const SubscribeBody = z.object({
  email: z.email().max(320),
  source: z.string().trim().max(40).default("blog"),
  locale: z.enum(["en", "fr", "es"]).default("en"),
});

// ─── POST /newsletter/subscribe ──────────────────────────────────────────────
router.post("/newsletter/subscribe", subscribeLimiter, async (req, res): Promise<void> => {
  const parsed = SubscribeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please enter a valid email address." });
    return;
  }

  const email = parsed.data.email.toLowerCase().trim();

  try {
    // Re-subscribing after opting out is allowed, but a repeat sign-up must not
    // fail loudly — the visitor has done nothing wrong.
    await db
      .insert(newsletterSubscribersTable)
      .values({ email, source: parsed.data.source, locale: parsed.data.locale })
      .onConflictDoUpdate({
        target: newsletterSubscribersTable.email,
        set: { subscribed: true, unsubscribed_at: null, locale: parsed.data.locale },
      });

    logger.info({ source: parsed.data.source }, "Newsletter sign-up recorded");

    // The same response either way: whether an address is already on the list
    // is not something an anonymous caller should be able to probe.
    res.status(201).json({
      ok: true,
      message: "You are on the list. We will email you when the first report goes out.",
    });
  } catch (err) {
    logger.error({ err }, "Newsletter sign-up failed");
    res.status(500).json({ error: "Could not record your address. Please try again." });
  }
});

// ─── POST /newsletter/unsubscribe ────────────────────────────────────────────
router.post("/newsletter/unsubscribe", subscribeLimiter, async (req, res): Promise<void> => {
  const parsed = SubscribeBody.pick({ email: true }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please enter a valid email address." });
    return;
  }

  try {
    await db
      .update(newsletterSubscribersTable)
      .set({ subscribed: false, unsubscribed_at: new Date() })
      .where(eq(newsletterSubscribersTable.email, parsed.data.email.toLowerCase().trim()));

    // Unconditional success: confirming whether the address was on the list
    // would leak membership.
    res.json({ ok: true, message: "You have been removed from the list." });
  } catch (err) {
    logger.error({ err }, "Newsletter unsubscribe failed");
    res.status(500).json({ error: "Could not process the request. Please try again." });
  }
});

// ─── GET /admin/newsletter ───────────────────────────────────────────────────
const adminRead = [requireAuth, requireRole("admin"), requireAdminCapability("read")];

router.get("/admin/newsletter", ...adminRead, async (_req, res) => {
  try {
    const [counts] = await db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`count(*) filter (where ${newsletterSubscribersTable.subscribed})`,
        confirmed: sql<number>`count(*) filter (where ${newsletterSubscribersTable.confirmed_at} is not null)`,
      })
      .from(newsletterSubscribersTable);

    const rows = await db
      .select()
      .from(newsletterSubscribersTable)
      .orderBy(desc(newsletterSubscribersTable.created_at))
      .limit(1000);

    return res.json({
      subscribers: rows,
      total: Number(counts?.total ?? 0),
      active: Number(counts?.active ?? 0),
      confirmed: Number(counts?.confirmed ?? 0),
      notice:
        "Addresses are captured but nothing is sent yet — no SMTP is configured. " +
        "Before sending marketing email, confirm consent: CASL applies in Canada and GDPR in the EU. " +
        "The confirmed_at column is where double opt-in belongs.",
    });
  } catch (err) {
    logger.error({ err }, "Failed to list newsletter subscribers");
    return res.status(500).json({ error: "Could not load subscribers" });
  }
});

export default router;
