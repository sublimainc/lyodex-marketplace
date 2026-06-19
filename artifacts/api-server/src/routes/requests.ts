import { Router, type IRouter } from "express";
import { db, requestsTable, requestMessagesTable, bidsTable, messageReadsTable } from "@workspace/db";
import { eq, ne, asc, and } from "drizzle-orm";
import {
  CreateRequestBody,
  GetRequestParams,
  GetRequestResponse,
  ListRequestsResponse,
} from "@workspace/api-zod";
import { requireAuth, requireRole, optionalAuth } from "../middleware/requireAuth";
import { logger } from "../lib/logger";
import { z } from "zod/v4";

const router: IRouter = Router();

const MessageBodySchema = z.object({ body: z.string().min(1).max(5000) });

router.get("/requests", optionalAuth, async (req, res): Promise<void> => {
  const requests = await db
    .select()
    .from(requestsTable)
    .where(ne(requestsTable.status, "removed"))
    .orderBy(requestsTable.id);
  const isAuthenticated = !!req.user;
  const isAdmin = req.user?.role === "admin";
  res.json(ListRequestsResponse.parse(requests.map(r => ({
    ...r,
    buyer_email: null,
    special_requirements: isAuthenticated ? r.special_requirements : null,
    moderation_note: isAuthenticated ? r.moderation_note : null,
    moderated_by: isAdmin ? r.moderated_by : null,
    created_at: r.created_at.toISOString(),
  }))));
});

router.post("/requests", requireAuth, requireRole("buyer", "admin"), async (req, res): Promise<void> => {
  const parsed = CreateRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [request] = await db.insert(requestsTable).values({
    ...parsed.data,
    buyer_email: req.user!.email,
    status: "pending",
    bid_count: 0,
  }).returning();
  res.status(201).json(GetRequestResponse.parse({ ...request, created_at: request.created_at.toISOString() }));
});

router.get("/requests/:id", optionalAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetRequestParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [request] = await db.select().from(requestsTable).where(eq(requestsTable.id, params.data.id));
  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  const user = req.user;
  const isOwner = user?.role === "buyer" && user.email === request.buyer_email;
  const isAdmin = user?.role === "admin";
  const isAuthenticated = !!user;
  res.json(GetRequestResponse.parse({
    ...request,
    buyer_email: (isOwner || isAdmin) ? request.buyer_email : null,
    special_requirements: isAuthenticated ? request.special_requirements : null,
    moderation_note: isAuthenticated ? request.moderation_note : null,
    moderated_by: isAdmin ? request.moderated_by : null,
    created_at: request.created_at.toISOString(),
  }));
});

/**
 * Checks whether the authenticated user is a participant of the given request.
 * Returns null if access is granted, or { status, error } to send otherwise.
 *
 * Access rules:
 *   - admin: always allowed
 *   - buyer: allowed only if user.email === request.buyer_email
 *   - operator: allowed only if they have bid on this request AND, once the
 *     request is closed or completed, only if their bid is the accepted one.
 *     Losing operators are locked out after contract award to protect
 *     confidential fulfillment and payout communications.
 *     NOTE: bids.ts stores `req.user!.userId` as `bids.operator_id` (the canonical id),
 *     so we compare directly against user.userId — no operators table lookup needed.
 *   - all others: 403
 */
async function checkParticipant(
  user: NonNullable<import("express").Request["user"]>,
  requestId: number,
  request: { buyer_email: string; status: string }
): Promise<{ status: number; error: string } | null> {
  if (user.role === "admin") return null;
  if (user.role === "buyer" && user.email === request.buyer_email) return null;
  if (user.role === "operator") {
    // bids.operator_id stores user.userId (see artifacts/api-server/src/routes/bids.ts).
    // Explicit Number() coercion ensures correct type match against the integer DB column.
    const operatorUserId = Number(user.userId);
    const [bid] = await db
      .select({ id: bidsTable.id, status: bidsTable.status })
      .from(bidsTable)
      .where(and(eq(bidsTable.request_id, requestId), eq(bidsTable.operator_id, operatorUserId)))
      .limit(1);
    if (!bid) {
      return { status: 403, error: "Only operators who have bid on this request can view or post messages." };
    }
    // After the request is closed (bid accepted) or completed, only the winning
    // operator retains thread access. Losing bidders are excluded to prevent them
    // from reading confidential fulfillment and payout messages.
    if (request.status === "closed" || request.status === "completed") {
      if (bid.status !== "accepted") {
        return { status: 403, error: "Thread access is restricted to the winning operator after contract award." };
      }
    }
    return null;
  }
  return { status: 403, error: "Only the buyer or operators who have bid on this request can view or post messages." };
}

router.get("/requests/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const requestId = parseInt(rawId, 10);
  if (isNaN(requestId)) {
    res.status(400).json({ error: "Invalid request id" });
    return;
  }
  const [request] = await db
    .select({ id: requestsTable.id, buyer_email: requestsTable.buyer_email, status: requestsTable.status })
    .from(requestsTable)
    .where(eq(requestsTable.id, requestId));
  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  const denied = await checkParticipant(req.user!, requestId, request);
  if (denied) {
    res.status(denied.status).json({ error: denied.error });
    return;
  }
  const messages = await db
    .select()
    .from(requestMessagesTable)
    .where(eq(requestMessagesTable.request_id, requestId))
    .orderBy(asc(requestMessagesTable.created_at));

  // Operators on a pending request can only see their own messages, buyer
  // messages, and system messages — not messages written by competing bidders.
  // Once the request is closed (winning bid selected and escrow funded) the
  // winning operator retains full thread access via the checkParticipant guard.
  let filteredMessages = messages;
  const viewer = req.user!;
  if (viewer.role === "operator" && request.status === "pending") {
    const viewerUserId = Number(viewer.userId);
    filteredMessages = messages.filter(
      (m) => m.sender_role === "system" || m.sender_role === "buyer" || m.user_id === viewerUserId
    );
  }

  res.json(filteredMessages.map(m => ({ ...m, created_at: m.created_at.toISOString() })));
});

router.post("/requests/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const requestId = parseInt(rawId, 10);
  if (isNaN(requestId)) {
    res.status(400).json({ error: "Invalid request id" });
    return;
  }

  const parsed = MessageBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [request] = await db
    .select({ id: requestsTable.id, buyer_email: requestsTable.buyer_email, status: requestsTable.status })
    .from(requestsTable)
    .where(eq(requestsTable.id, requestId));
  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  const user = req.user!;

  const denied = await checkParticipant(user, requestId, request);
  if (denied) {
    res.status(denied.status).json({ error: denied.error });
    return;
  }

  // Detect attempts to move communication off-platform (email, phone, messaging apps).
  // We warn and log but never block — users have the right to communicate freely.
  const OFF_PLATFORM_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b|(\+?1?\s*[-.]?\s*)?(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})|\b(whatsapp|telegram|signal|wechat|viber|skype)\b/i;
  const offPlatformRisk = OFF_PLATFORM_RE.test(parsed.data.body);
  if (offPlatformRisk) {
    logger.warn({ requestId, userId: user.userId, role: user.role }, "Off-platform contact pattern detected in message");
  }

  const [message] = await db.insert(requestMessagesTable).values({
    request_id: requestId,
    user_id: user.userId,
    sender_name: user.name,
    sender_role: user.role,
    body: parsed.data.body,
  }).returning();

  res.status(201).json({ ...message, created_at: message.created_at.toISOString(), off_platform_risk: offPlatformRisk });
});

router.post("/requests/:id/mark-read", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const requestId = parseInt(rawId, 10);
  if (isNaN(requestId)) {
    res.status(400).json({ error: "Invalid request id" });
    return;
  }
  const [request] = await db
    .select({ id: requestsTable.id, buyer_email: requestsTable.buyer_email, status: requestsTable.status })
    .from(requestsTable)
    .where(eq(requestsTable.id, requestId));
  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  const denied = await checkParticipant(req.user!, requestId, request);
  if (denied) {
    res.status(denied.status).json({ error: denied.error });
    return;
  }
  const userId = req.user!.userId;
  const now = new Date();
  await db
    .insert(messageReadsTable)
    .values({ user_id: userId, request_id: requestId, last_read_at: now })
    .onConflictDoUpdate({
      target: [messageReadsTable.user_id, messageReadsTable.request_id],
      set: { last_read_at: now },
    });
  res.json({ ok: true });
});

export default router;
