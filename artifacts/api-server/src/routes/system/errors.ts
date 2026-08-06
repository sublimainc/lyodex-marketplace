import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod/v4";
import rateLimit from "express-rate-limit";
import { recordError } from "../../lib/errorMonitor";

const router: IRouter = Router();

// Limit unauthenticated callers to 5 reports per minute per IP so a single
// source cannot flood the error monitor or trigger false health alerts.
const clientErrorLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many error reports — please try again later" },
});

const ClientErrorBody = z.object({
  message: z.string().max(2000),
  stack: z.string().max(10000).optional(),
  url: z.string().max(500).optional(),
  userAgent: z.string().max(500).optional(),
  timestamp: z.number().optional(),
});

router.post("/errors/client", clientErrorLimiter, (req: Request, res: Response): void => {
  const parsed = ClientErrorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid error report payload" });
    return;
  }

  const { message, stack, url, userAgent } = parsed.data;
  recordError(message, "client", stack ?? undefined);

  req.log?.info({ url, userAgent, errorMessage: message }, "client error reported");

  res.status(202).json({ received: true });
});

export default router;
