import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { getStats } from "../lib/errorMonitor";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/healthz/errors", (_req, res) => {
  const stats = getStats();
  // Health status is determined only by server-side errors.
  // Client-submitted error counts are excluded so unauthenticated callers
  // cannot force a degraded state by flooding POST /errors/client.
  // recentSamples (which contain raw error messages) are not returned on this
  // public endpoint to prevent inadvertent disclosure of internal failure details.
  const healthy = stats.serverErrorsLastMinute < stats.alertThreshold;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    errorsLastMinute: stats.errorsLastMinute,
    serverErrorsLastMinute: stats.serverErrorsLastMinute,
    clientErrorsLastMinute: stats.clientErrorsLastMinute,
    alertThreshold: stats.alertThreshold,
  });
});

export default router;
