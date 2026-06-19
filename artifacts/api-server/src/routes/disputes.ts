import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { disputesTable, bidsTable, requestsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/requireAuth";
import { z } from "zod/v4";
import { logger } from "../lib/logger";
import { sendDisputeOpenedEmail } from "../lib/email";

const router: IRouter = Router();

const CreateDisputeBody = z.object({
  request_id: z.number().int().positive(),
  bid_id: z.number().int().positive(),
  reason: z.string().min(20).max(2000),
  evidence: z.string().max(5000).optional(),
});

// POST /disputes — buyer opens a dispute on an accepted contract
router.post("/disputes", requireAuth, requireRole("buyer"), async (req, res): Promise<void> => {
  const parsed = CreateDisputeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const user = req.user!;

  const [request] = await db
    .select({ id: requestsTable.id, buyer_email: requestsTable.buyer_email })
    .from(requestsTable)
    .where(and(eq(requestsTable.id, parsed.data.request_id)))
    .limit(1);

  if (!request || request.buyer_email !== user.email) {
    res.status(404).json({ error: "Request not found or you are not the buyer." });
    return;
  }

  const [bid] = await db
    .select()
    .from(bidsTable)
    .where(and(eq(bidsTable.id, parsed.data.bid_id), eq(bidsTable.request_id, parsed.data.request_id)))
    .limit(1);

  if (!bid) {
    res.status(404).json({ error: "Quote not found." });
    return;
  }

  if (bid.status !== "accepted") {
    res.status(422).json({ error: "Disputes can only be opened on accepted quotes." });
    return;
  }

  const [existing] = await db
    .select({ id: disputesTable.id })
    .from(disputesTable)
    .where(eq(disputesTable.bid_id, parsed.data.bid_id))
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "A dispute for this contract already exists." });
    return;
  }

  const [dispute] = await db.insert(disputesTable).values({
    request_id: parsed.data.request_id,
    bid_id: parsed.data.bid_id,
    opened_by_user_id: user.userId,
    opened_by_email: user.email,
    reason: parsed.data.reason,
    evidence: parsed.data.evidence ?? null,
  }).returning();

  logger.info(
    { disputeId: dispute.id, requestId: parsed.data.request_id, bidId: parsed.data.bid_id, openedBy: user.email },
    "Dispute opened"
  );

  // Send confirmation to buyer from dispute@lyodex.com — non-blocking
  sendDisputeOpenedEmail({
    disputeId: dispute.id,
    requestId: parsed.data.request_id,
    buyerEmail: user.email,
    reason: parsed.data.reason,
  }).catch(err => logger.warn({ err, disputeId: dispute.id }, "Failed to send dispute opened email"));

  res.status(201).json({ ...dispute, created_at: dispute.created_at.toISOString(), resolved_at: null });
});

// GET /requests/:id/disputes — buyer or admin views disputes on a request
router.get("/requests/:id/disputes", requireAuth, async (req, res): Promise<void> => {
  const requestId = parseInt(String(req.params.id), 10);
  if (isNaN(requestId)) {
    res.status(400).json({ error: "Invalid request id" });
    return;
  }

  const user = req.user!;

  const [request] = await db
    .select({ id: requestsTable.id, buyer_email: requestsTable.buyer_email })
    .from(requestsTable)
    .where(eq(requestsTable.id, requestId))
    .limit(1);

  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  const isOwner = user.role === "buyer" && user.email === request.buyer_email;
  const isAdmin = user.role === "admin";

  if (!isOwner && !isAdmin) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const disputes = await db
    .select()
    .from(disputesTable)
    .where(eq(disputesTable.request_id, requestId));

  res.json(disputes.map(d => ({
    ...d,
    created_at: d.created_at.toISOString(),
    resolved_at: d.resolved_at ? d.resolved_at.toISOString() : null,
  })));
});

export default router;
