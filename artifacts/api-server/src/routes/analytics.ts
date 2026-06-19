import { Router, type IRouter } from "express";
import { marketAggregation } from "../lib/marketAggregation";
import { requireAuth, requireRole } from "../middleware/requireAuth";

const router: IRouter = Router();

// GET /market/analytics — anonymized public market snapshot (no PII)
// Safe for external display, reports, and eventual data resale.
router.get("/market/analytics", async (_req, res): Promise<void> => {
  const snapshot = await marketAggregation.getPublicMarketSnapshot();
  res.json(snapshot);
});

// GET /admin/operator-performance — per-operator stats (admin only, includes operator_id)
// Internal use only — not suitable for direct public export.
router.get("/admin/operator-performance", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const performance = await marketAggregation.getOperatorPerformance();
  res.json(performance);
});

export default router;
