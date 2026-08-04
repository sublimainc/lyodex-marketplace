import { Router, type IRouter } from "express";
import { marketAggregation } from "../lib/marketAggregation";
import { requireAuth, requireRole } from "../middleware/requireAuth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// GET /market/analytics — anonymized public market snapshot (no PII)
// Safe for external display, reports, and eventual data resale.
router.get("/market/analytics", async (_req, res): Promise<void> => {
  try {
    const snapshot = await marketAggregation.getPublicMarketSnapshot();
    // Recomputed per request from live platform data; never serve a stale cache
    // as if it were current, since the page states when the figures were built.
    res.set("Cache-Control", "public, max-age=300");
    res.json(snapshot);
  } catch (err) {
    logger.error({ err }, "Failed to build public market snapshot");
    res.status(500).json({ error: "Market data is temporarily unavailable" });
  }
});

// GET /admin/operator-performance — per-operator stats (admin only, includes operator_id)
// Internal use only — not suitable for direct public export.
router.get("/admin/operator-performance", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const performance = await marketAggregation.getOperatorPerformance();
  res.json(performance);
});

export default router;
