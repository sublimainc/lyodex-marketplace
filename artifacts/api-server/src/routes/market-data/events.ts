import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { platformEventsTable } from "@workspace/db/schema";
import { optionalAuth } from "../../middleware/requireAuth";
import { createHash } from "crypto";
import { z } from "zod/v4";
import rateLimit from "express-rate-limit";

const router: IRouter = Router();

// Limit anonymous/authenticated callers to 60 events per minute per IP to
// prevent database flooding and telemetry poisoning via scripted requests.
const eventsLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many events — please try again later" },
});

const EVENT_TYPES = [
  "page_view", "request_view", "operator_view", "quote_submitted",
  "search", "filter_used", "chat_opened", "payment_started",
  "dispute_opened", "bid_submitted",
] as const;

const TrackEventBody = z.object({
  session_id: z.string().max(128).optional(),
  event_type: z.enum(EVENT_TYPES),
  entity_type: z.string().max(64).optional(),
  entity_id: z.number().int().positive().optional(),
  // Limit metadata to 10 keys with string/number/boolean values to prevent
  // large arbitrary payloads from inflating storage.
  metadata: z.record(z.string().max(64), z.union([z.string().max(512), z.number(), z.boolean()]))
    .superRefine((val, ctx) => {
      if (Object.keys(val).length > 10) {
        ctx.addIssue({ code: "custom", message: "metadata may not have more than 10 keys" });
      }
    })
    .optional(),
});

// POST /events — platform interaction tracking.
//
// No PII is stored: the IP is one-way hashed from req.ip (proxy-aware, single
// trusted hop) rather than the spoofable x-forwarded-for header.
//
// Auth requirement is deliberately asymmetric. Requiring a session for every
// event made traffic measurement impossible — almost everyone arriving from an
// ad or a search result is anonymous, so nothing was ever recorded. Anonymous
// callers may therefore send "page_view" and nothing else: it carries no
// entity reference and cannot be used to fabricate marketplace activity. Every
// other event type still needs a session, because those do imply something
// happened to a specific record. The per-IP rate limit above covers flooding
// in both cases.
router.post("/events", eventsLimiter, optionalAuth, async (req, res): Promise<void> => {
  const parsed = TrackEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (!req.user && parsed.data.event_type !== "page_view") {
    res.status(401).json({ error: "Sign in required to record this event" });
    return;
  }

  const ipString = req.ip ?? req.socket.remoteAddress ?? "";
  const ipHash = createHash("sha256").update(ipString).digest("hex").slice(0, 16);

  await db.insert(platformEventsTable).values({
    user_id: req.user?.userId ?? null,
    session_id: parsed.data.session_id ?? null,
    event_type: parsed.data.event_type,
    entity_type: parsed.data.entity_type ?? null,
    entity_id: parsed.data.entity_id ?? null,
    metadata: (parsed.data.metadata as Record<string, unknown>) ?? null,
    ip_hash: ipHash,
  });

  res.status(201).json({ ok: true });
});

export default router;
