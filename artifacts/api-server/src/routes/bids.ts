import { Router, type IRouter } from "express";
import { db, bidsTable, requestsTable, operatorsTable, activityTable, requestMessagesTable, usersTable, buyerNotificationsTable } from "@workspace/db";
import { disputesTable, priceDataPointsTable } from "@workspace/db/schema";
import { eq, sql, and, ne, or, isNull, inArray } from "drizzle-orm";
import {
  CreateBidBody,
  ListBidsForRequestParams,
  ListBidsForRequestResponse,
} from "@workspace/api-zod";
import { requireAuth, requireRole, optionalAuth } from "../middleware/requireAuth";
import { getUncachableStripeClient } from "../stripeClient";
import { logger } from "../lib/logger";
import { sendNewBidEmail, sendOnboardingIncompleteEmail } from "../lib/email";
import { getPublicBaseUrl } from "../lib/publicUrl";
import { resolveFeeRate, calculateFees } from "../lib/fees";

const router: IRouter = Router();

router.get("/requests/:id/bids", optionalAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ListBidsForRequestParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  type BidWithAudit = typeof bidsTable.$inferSelect & { operator_audit_status?: string | null };
  let bids: BidWithAudit[] = [];

  if (req.user?.role === "operator") {
    // Sealed-quote model: operators only see their own quote, never competitors'.
    bids = await db
      .select()
      .from(bidsTable)
      .where(and(eq(bidsTable.request_id, params.data.id), eq(bidsTable.operator_id, req.user.userId)));
  } else if (req.user?.role === "buyer" || req.user?.role === "admin") {
    // For buyers: verify they own this request before exposing sealed bids.
    // Admins bypass the ownership check.
    if (req.user.role === "buyer") {
      const [targetRequest] = await db
        .select({ buyer_email: requestsTable.buyer_email })
        .from(requestsTable)
        .where(eq(requestsTable.id, params.data.id))
        .limit(1);
      if (!targetRequest) {
        res.status(404).json({ error: "Request not found" });
        return;
      }
      if (targetRequest.buyer_email !== req.user.email) {
        res.status(403).json({ error: "You do not own this request" });
        return;
      }
    }

    // Buyers and admins see all bids + operator audit status for the unverified warning
    const rows = await db
      .select({
        id: bidsTable.id,
        request_id: bidsTable.request_id,
        operator_id: bidsTable.operator_id,
        operator_name: bidsTable.operator_name,
        price_per_kg: bidsTable.price_per_kg,
        turnaround_days: bidsTable.turnaround_days,
        notes: bidsTable.notes,
        status: bidsTable.status,
        fee_status: bidsTable.fee_status,
        stripe_session_id: bidsTable.stripe_session_id,
        escrow_status: bidsTable.escrow_status,
        escrow_payment_intent_id: bidsTable.escrow_payment_intent_id,
        escrow_amount_cents: bidsTable.escrow_amount_cents,
        created_at: bidsTable.created_at,
        operator_audit_status: operatorsTable.audit_status,
      })
      .from(bidsTable)
      .leftJoin(
        operatorsTable,
        or(
          eq(bidsTable.operator_id, operatorsTable.user_id),
          and(isNull(operatorsTable.user_id), eq(bidsTable.operator_id, operatorsTable.id)),
        ),
      )
      .where(eq(bidsTable.request_id, params.data.id));
    bids = rows as unknown as BidWithAudit[];
  } else {
    // Unauthenticated — quotes are private in the sealed-bid system.
    bids = [];
  }

  res.json(ListBidsForRequestResponse.parse(bids.map(b => ({
    ...b,
    operator_audit_status: (b as BidWithAudit).operator_audit_status ?? null,
    created_at: b.created_at.toISOString(),
  }))));
});

router.post("/bids", requireAuth, requireRole("operator", "admin"), async (req, res): Promise<void> => {
  const parsed = CreateBidBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const canonicalOperatorId = req.user!.userId;

  const [targetRequest] = await db
    .select({
      id: requestsTable.id,
      status: requestsTable.status,
      buyer_email: requestsTable.buyer_email,
      material_type: requestsTable.material_type,
      quantity_kg: requestsTable.quantity_kg,
    })
    .from(requestsTable)
    .where(eq(requestsTable.id, parsed.data.request_id))
    .limit(1);

  if (!targetRequest) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  if (targetRequest.status === "closed") {
    res.status(422).json({ error: "This request has been closed and is no longer accepting bids." });
    return;
  }
  if (targetRequest.status === "removed") {
    res.status(422).json({ error: "This request has been removed and is no longer accepting bids." });
    return;
  }

  // Guard: if a bid on this request is already pending escrow payment (buyer selected another
  // operator and the checkout is in progress), block new bids until that session resolves.
  const [existingPendingEscrow] = await db
    .select({ id: bidsTable.id })
    .from(bidsTable)
    .where(and(eq(bidsTable.request_id, parsed.data.request_id), eq(bidsTable.status, "pending_escrow")))
    .limit(1);
  if (existingPendingEscrow) {
    res.status(422).json({ error: "This request has a pending escrow payment and is not currently accepting new bids." });
    return;
  }

  // One live bid per operator per request. Without this an operator could flood
  // a request with bids, distorting the bid_count shown to buyers and the
  // per-category averages published on the market intelligence page.
  // Withdrawn and rejected bids are excluded so an operator can re-bid.
  const [existingOwnBid] = await db
    .select({ id: bidsTable.id })
    .from(bidsTable)
    .where(and(
      eq(bidsTable.request_id, parsed.data.request_id),
      eq(bidsTable.operator_id, canonicalOperatorId),
      inArray(bidsTable.status, ["pending", "pending_escrow", "accepted"]),
    ))
    .limit(1);
  if (existingOwnBid) {
    res.status(409).json({
      error: "You already have an active bid on this request. Withdraw it before submitting a new one.",
    });
    return;
  }

  const [operator] = await db.select().from(operatorsTable).where(eq(operatorsTable.id, canonicalOperatorId));
  const operatorName = operator?.name ?? req.user!.name ?? "Unknown Operator";

  let bid: typeof bidsTable.$inferSelect;
  try {
    [bid] = await db.insert(bidsTable).values({
      ...parsed.data,
      operator_id: canonicalOperatorId,
      operator_name: operatorName,
      status: "pending",
    }).returning();
  } catch (err: any) {
    // The check above is a read-then-write; two simultaneous submissions can
    // both pass it. The partial unique index is the real guarantee, so translate
    // its violation into the same 409 rather than a 500.
    if (err?.code === "23505") {
      res.status(409).json({
        error: "You already have an active bid on this request. Withdraw it before submitting a new one.",
      });
      return;
    }
    throw err;
  }

  await db.update(requestsTable)
    .set({ bid_count: sql`${requestsTable.bid_count} + 1` })
    .where(eq(requestsTable.id, parsed.data.request_id));

  await db.insert(activityTable).values({
    type: "bid",
    message: `${operatorName} submitted a bid at $${parsed.data.price_per_kg}/kg`,
  });

  // Record price data point for market analytics aggregation
  try {
    await db.insert(priceDataPointsTable).values({
      bid_id:                          bid.id,
      request_id:                      parsed.data.request_id,
      operator_id:                     canonicalOperatorId,
      operator_name:                   operatorName,
      category:                        targetRequest.material_type,
      quoted_price:                    parsed.data.price_per_kg,
      accepted:                        false,
      quantity_kg:                     targetRequest.quantity_kg,
      lead_time_days:                  parsed.data.turnaround_days,
      currency:                        "CAD",
      confidence_level:                operator?.audit_status === "audited" ? "high" : "medium",
      anonymized:                      true,
      included_in_market_intelligence: true,
    });
  } catch {
    // Price data point failure must never block the bid response
  }

  // Send a transactional email to the buyer so they know a new bid arrived.
  // Non-blocking: failure is logged but never prevents the bid response.
  if (targetRequest.buyer_email) {
    sendNewBidEmail({
      buyerEmail: targetRequest.buyer_email,
      bidId: bid.id,
      requestId: parsed.data.request_id,
      operatorName,
      pricePerKg: parsed.data.price_per_kg,
      turnaroundDays: parsed.data.turnaround_days,
      materialType: targetRequest.material_type,
      quantityKg: targetRequest.quantity_kg,
    }).catch((err) => {
      logger.warn({ err, bidId: bid.id, buyerEmail: targetRequest.buyer_email }, "Failed to send new bid email to buyer");
    });
  }

  // Record a buyer-visible notification so the request owner sees the new bid.
  // We look up the buyer's user ID by their email (stored on the request).
  try {
    const [buyerUser] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, targetRequest.buyer_email ?? ""))
      .limit(1);

    if (buyerUser) {
      await db.insert(buyerNotificationsTable).values({
        buyer_user_id: buyerUser.id,
        request_id: parsed.data.request_id,
        bid_id: bid.id,
        message: `${operatorName} submitted a bid at $${parsed.data.price_per_kg}/kg for your request`,
        read: false,
      });
    }
  } catch {
    // Notification failure must never block the bid response
  }

  res.status(201).json({
    ...bid,
    created_at: bid.created_at.toISOString(),
  });
});

// ─── PATCH /bids/:id/accept ────────────────────────────────────────────────────
// Buyer accepts a specific bid: atomically marks bid as "accepted", closes the
// request, posts a thread notification to the operator, records platform
// activity, and creates a Stripe Checkout for the full contract value held in
// escrow (manual capture — funds are authorized but not charged until project
// completion).
router.patch("/bids/:id/accept", requireAuth, requireRole("buyer", "admin"), async (req, res): Promise<void> => {
  const bidId = parseInt(req.params.id as string, 10);
  if (isNaN(bidId)) {
    res.status(400).json({ error: "Invalid bid ID" });
    return;
  }

  const [bid] = await db.select().from(bidsTable).where(eq(bidsTable.id, bidId)).limit(1);
  if (!bid) {
    res.status(404).json({ error: "Bid not found" });
    return;
  }

  if (bid.status !== "pending") {
    const msg = bid.status === "accepted"
      ? "Bid is already accepted"
      : bid.status === "pending_escrow"
      ? "Escrow checkout is already pending for this bid — check your email for the payment link"
      : "Bid is no longer pending";
    res.status(400).json({ error: msg });
    return;
  }

  const [request] = await db
    .select()
    .from(requestsTable)
    .where(eq(requestsTable.id, bid.request_id))
    .limit(1);

  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  if (req.user!.role !== "admin" && request.buyer_email !== req.user!.email) {
    res.status(403).json({ error: "You do not own this request" });
    return;
  }

  if (request.status === "closed" || request.status === "removed") {
    res.status(400).json({ error: "This request is no longer open" });
    return;
  }

  const contractValue = bid.price_per_kg * (request.quantity_kg ?? 0);
  const escrowAmountCents = Math.round(contractValue * 100);
  // Indicative only — the authoritative rate is resolved and snapshotted when
  // escrow is funded in the Stripe webhook.
  const [feeOperatorRow] = await db
    .select({ platform_fee_override: operatorsTable.platform_fee_override })
    .from(operatorsTable)
    .where(eq(operatorsTable.id, bid.operator_id))
    .limit(1);
  const operatorPayout = calculateFees(
    escrowAmountCents,
    resolveFeeRate(feeOperatorRow?.platform_fee_override),
  ).operatorPayout;

  // ── Guard: contract value must be large enough to fund via Stripe escrow ────
  // Stripe requires a minimum charge of 50 cents. Any lower amount means we
  // cannot hold escrow — reject the acceptance before mutating state.
  if (escrowAmountCents < 50) {
    res.status(422).json({
      error: `Contract value ($${contractValue.toFixed(2)}) is too small to fund via escrow. The minimum billable contract value is $0.50.`,
    });
    return;
  }

  // ── Atomic transaction: set bid to pending_escrow (request stays open) ───────
  // The request is NOT closed here. It will be closed by the Stripe webhook once
  // the buyer completes the escrow checkout (checkout.session.completed). This
  // ensures that the marketplace is never locked by an unfunded contract.
  let updatedBid: typeof bidsTable.$inferSelect;

  try {
    updatedBid = await db.transaction(async (tx) => {
      // Serialize all acceptances for this request by taking a row-level lock on
      // the parent request first. Without it, two concurrent accepts on two
      // different bids can both pass the exclusivity check below before either
      // commits (READ COMMITTED sees neither other's uncommitted write), leaving
      // two bids in pending_escrow and the buyer able to fund both.
      // Any concurrent transaction now blocks here until the first one commits,
      // then observes its result.
      const [lockedRequest] = await tx
        .select({ id: requestsTable.id, status: requestsTable.status })
        .from(requestsTable)
        .where(eq(requestsTable.id, bid.request_id))
        .for("update")
        .limit(1);

      if (!lockedRequest) {
        throw new Error("REQUEST_NOT_FOUND");
      }
      // Re-check under the lock: the request may have been closed or removed
      // between the pre-flight read above and acquiring the lock.
      if (lockedRequest.status === "closed" || lockedRequest.status === "removed") {
        throw new Error("REQUEST_NO_LONGER_OPEN");
      }

      // Exclusivity guard: within the transaction, verify no other bid on this
      // request is already pending_escrow or accepted. Without this, a buyer
      // could accept two bids before either webhook fires.
      const [conflicting] = await tx
        .select({ id: bidsTable.id, status: bidsTable.status })
        .from(bidsTable)
        .where(and(
          eq(bidsTable.request_id, bid.request_id),
          ne(bidsTable.id, bidId),
          or(eq(bidsTable.status, "pending_escrow"), eq(bidsTable.status, "accepted"))
        ))
        .limit(1);

      if (conflicting) {
        throw new Error(conflicting.status === "accepted" ? "REQUEST_ALREADY_ACCEPTED" : "ESCROW_ALREADY_PENDING");
      }

      const [pendingEscrow] = await tx
        .update(bidsTable)
        .set({ status: "pending_escrow" })
        .where(and(eq(bidsTable.id, bidId), eq(bidsTable.status, "pending")))
        .returning();

      if (!pendingEscrow) {
        throw new Error("BID_NO_LONGER_PENDING");
      }

      // Notify the operator that their bid has been shortlisted, but escrow is
      // not yet funded — do not call it "accepted" until payment is confirmed.
      await tx.insert(requestMessagesTable).values({
        request_id: bid.request_id,
        user_id: 0,
        sender_name: "LyoDex Platform",
        sender_role: "system",
        body: `Your bid of $${bid.price_per_kg}/kg has been selected by the buyer. The contract will be finalized once the buyer completes the escrow payment. You will receive a confirmation with full details once payment is confirmed.`,
      });

      await tx.insert(activityTable).values({
        type: "contract",
        message: `${req.user!.email} selected ${bid.operator_name}'s bid at $${bid.price_per_kg}/kg for ${request.material_type} — awaiting escrow payment`,
      });

      return pendingEscrow;
    });
  } catch (err: any) {
    if (err?.message === "BID_NO_LONGER_PENDING") {
      res.status(409).json({ error: "This bid is no longer in pending status" });
    } else if (err?.message === "REQUEST_NOT_FOUND") {
      res.status(404).json({ error: "Request not found" });
    } else if (err?.message === "REQUEST_NO_LONGER_OPEN") {
      res.status(409).json({ error: "This request is no longer open" });
    } else if (err?.message === "ESCROW_ALREADY_PENDING") {
      res.status(409).json({ error: "Another bid on this request is already awaiting escrow payment. Only one bid can be accepted at a time." });
    } else if (err?.message === "REQUEST_ALREADY_ACCEPTED") {
      res.status(409).json({ error: "This request has already been awarded to another operator." });
    } else {
      res.status(500).json({ error: "Failed to process bid selection" });
    }
    return;
  }

  // ── Price data point stays UNACCEPTED here ───────────────────────────────
  // Selecting a bid is not the same as awarding a contract: the buyer may never
  // complete the escrow checkout. Marking the price as "accepted" now would
  // publish prices for contracts that never happened.
  //
  // The flag is set in the Stripe webhook (app.ts), in the same transaction
  // that funds escrow and closes the request — i.e. at the moment the contract
  // genuinely exists. `quote_status` records that it is awaiting payment.
  try {
    await db
      .update(priceDataPointsTable)
      .set({ quote_status: "pending_escrow" })
      .where(eq(priceDataPointsTable.bid_id, bidId));
  } catch {
    // Non-blocking — this is bookkeeping, not a gate on the checkout.
  }

  // ── Stripe escrow checkout (buyer pays full contract into escrow) ───────────
  // manual capture: Stripe holds the authorization — funds are NOT charged until
  // POST /bids/:id/complete is called and the PaymentIntent is captured.
  // If Stripe session creation fails we perform a compensating rollback so the
  // bid is never left in an accepted-but-unfunded state.
  let checkoutUrl: string | null = null;
  try {
    const stripe = await getUncachableStripeClient();
    const baseUrl = getPublicBaseUrl();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "cad",
            unit_amount: escrowAmountCents,
            product_data: {
              name: "LyoDex Escrow — Contract Payment",
              description: `${request.material_type} — ${request.quantity_kg} kg @ $${bid.price_per_kg}/kg · Funds held securely until project completion`,
            },
          },
        },
      ],
      payment_intent_data: {
        capture_method: "manual",
        description: `LyoDex escrow for bid #${bidId} — ${request.material_type}`,
        metadata: {
          bid_id: String(bidId),
          request_id: String(bid.request_id),
          type: "escrow",
        },
      },
      success_url: `${baseUrl}/dashboard?escrow_pending=1&bid_id=${bidId}`,
      cancel_url: `${baseUrl}/requests/${request.id}?escrow_cancelled=1`,
      metadata: {
        bid_id: String(bidId),
        request_id: String(bid.request_id),
        type: "escrow",
      },
    });

    await db
      .update(bidsTable)
      .set({ escrow_amount_cents: escrowAmountCents })
      .where(eq(bidsTable.id, bidId));

    checkoutUrl = session.url;
  } catch (stripeErr: any) {
    logger.error({
      msg: "Stripe escrow checkout creation failed — rolling back bid acceptance",
      bid_id: bidId,
      operator_id: bid.operator_id,
      request_id: bid.request_id,
      error: stripeErr?.message ?? String(stripeErr),
    });

    // Compensating rollback: revert the bid from pending_escrow back to pending.
    // The request was never closed so no request-side rollback is needed.
    try {
      await db
        .update(bidsTable)
        .set({ status: "pending" })
        .where(and(eq(bidsTable.id, bidId), eq(bidsTable.status, "pending_escrow")));
    } catch (rollbackErr: any) {
      logger.error({
        msg: "Compensating rollback after Stripe failure also failed — manual intervention required",
        bid_id: bidId,
        request_id: bid.request_id,
        rollbackError: rollbackErr?.message ?? String(rollbackErr),
      });
    }

    res.status(502).json({
      error: "Could not create the escrow checkout session. The bid selection has been rolled back — please try again.",
    });
    return;
  }

  res.json({
    bid: { ...updatedBid, created_at: updatedBid.created_at.toISOString() },
    checkout_url: checkoutUrl,
  });
});

// ─── POST /bids/:id/complete ──────────────────────────────────────────────────
// Buyer or admin marks the project complete. Captures the Stripe PaymentIntent
// (charges the buyer), deducts the 9% platform fee, and records the operator's
// net payout. escrow_status transitions: authorized → captured.
router.post("/bids/:id/complete", requireAuth, requireRole("buyer", "admin"), async (req, res): Promise<void> => {
  const bidId = parseInt(req.params.id as string, 10);
  if (isNaN(bidId)) {
    res.status(400).json({ error: "Invalid bid ID" });
    return;
  }

  const [bid] = await db.select().from(bidsTable).where(eq(bidsTable.id, bidId)).limit(1);
  if (!bid) {
    res.status(404).json({ error: "Bid not found" });
    return;
  }

  if (bid.status !== "accepted") {
    res.status(400).json({ error: "Bid is not accepted" });
    return;
  }

  if (bid.escrow_status !== "authorized") {
    res.status(400).json({
      error: bid.escrow_status === "captured"
        ? "Escrow has already been released for this contract"
        : "Escrow funds have not been authorized yet — buyer must complete checkout first",
    });
    return;
  }

  const [request] = await db
    .select()
    .from(requestsTable)
    .where(eq(requestsTable.id, bid.request_id))
    .limit(1);

  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  if (req.user!.role !== "admin" && request.buyer_email !== req.user!.email) {
    res.status(403).json({ error: "You do not own this request" });
    return;
  }

  if (!bid.escrow_payment_intent_id) {
    res.status(400).json({ error: "No escrow payment intent found for this bid" });
    return;
  }

  // ── Dispute guard: block release if any non-closed dispute exists ─────────
  // Releasing funds during an active dispute would bypass the resolution process.
  const [openDispute] = await db
    .select({ id: disputesTable.id, status: disputesTable.status })
    .from(disputesTable)
    .where(
      and(
        eq(disputesTable.bid_id, bidId),
        ne(disputesTable.status, "closed")
      )
    )
    .limit(1);

  if (openDispute) {
    res.status(409).json({
      error: "Cannot release funds — a dispute is open",
      detail: "The escrow cannot be released while a dispute is active. Contact support@lyodex.com to resolve the dispute first.",
      dispute_status: openDispute.status,
    });
    return;
  }

  // ── Pre-flight: verify operator is ready to receive a Stripe payout ─────────
  // Fetch the operator record + the user's email so we can notify them if
  // onboarding is incomplete. We do this BEFORE capturing the buyer's card so
  // we never charge the buyer when we know the transfer would fail.
  const [operatorRecord] = await db
    .select({
      stripe_account_id: operatorsTable.stripe_account_id,
      platform_fee_override: operatorsTable.platform_fee_override,
      stripe_onboarded: operatorsTable.stripe_onboarded,
      operator_name: operatorsTable.name,
      user_id: operatorsTable.user_id,
    })
    .from(operatorsTable)
    .where(eq(operatorsTable.user_id, bid.operator_id))
    .limit(1);

  // Fetch the operator's email from the users table (needed for notification)
  let operatorEmail: string | null = null;
  if (operatorRecord?.user_id) {
    const [userRow] = await db
      .select({ email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, operatorRecord.user_id))
      .limit(1);
    operatorEmail = userRow?.email ?? null;
  }

  try {
    const stripe = await getUncachableStripeClient();

    // ── Live Stripe onboarding check (fail-closed) ───────────────────────────
    // The DB flag is a cache; always verify live status so we catch accounts
    // that were restricted or had requirements added after the last status poll.
    // If the live check cannot be completed, we MUST NOT proceed — fail closed
    // so a stale DB flag can never allow a transfer that Stripe would reject.
    let operatorReady = false;
    if (operatorRecord?.stripe_account_id) {
      let account: Awaited<ReturnType<typeof stripe.accounts.retrieve>>;
      try {
        account = await stripe.accounts.retrieve(operatorRecord.stripe_account_id);
      } catch (stripeErr: any) {
        logger.error({ stripeErr, bidId, accountId: operatorRecord.stripe_account_id }, "Could not retrieve live Stripe account status — blocking payout (fail-closed)");
        res.status(503).json({
          error: "Unable to verify operator payout readiness",
          detail: "Stripe account status could not be confirmed right now. Please try again in a moment.",
        });
        return;
      }
      operatorReady = account.charges_enabled === true && account.payouts_enabled === true;
      // Keep the DB flag in sync if the operator just became ready
      if (operatorReady && !operatorRecord.stripe_onboarded) {
        await db
          .update(operatorsTable)
          .set({ stripe_onboarded: true })
          .where(eq(operatorsTable.user_id, bid.operator_id));
      }
    }

    if (!operatorReady) {
      // Notify the operator so they know they need to act
      const contractValue = (bid.escrow_amount_cents ?? 0) / 100;
      const operatorPayout = calculateFees(
        bid.escrow_amount_cents ?? 0,
        bid.platform_fee_rate ?? resolveFeeRate(operatorRecord?.platform_fee_override),
      ).operatorPayout;

      logger.warn({ bidId, operatorId: bid.operator_id, hasAccount: !!operatorRecord?.stripe_account_id, onboarded: operatorRecord?.stripe_onboarded }, "Contract completion blocked — operator Stripe onboarding incomplete");

      if (operatorEmail) {
        await sendOnboardingIncompleteEmail({
          operatorEmail,
          operatorName: operatorRecord?.operator_name ?? bid.operator_name,
          bidId,
          requestId: bid.request_id,
          materialType: request.material_type,
          contractValue,
          operatorPayout,
        });
      }

      // Post a thread message visible to buyer and operator
      await db.insert(requestMessagesTable).values({
        request_id: bid.request_id,
        user_id: 0,
        sender_name: "LyoDex Platform",
        sender_role: "system",
        body: `Contract completion is on hold — ${bid.operator_name} has not completed Stripe onboarding and cannot receive the payout yet. The operator has been notified and must finish account setup before funds can be released.`,
      });

      res.status(422).json({
        error: "Operator has not completed Stripe onboarding",
        detail: "The operator must finish setting up their Stripe payout account before the escrow can be released. They have been notified by email.",
      });
      return;
    }

    // Capture the full authorized amount — funds move from the authorization
    // hold into the platform's Stripe balance
    await stripe.paymentIntents.capture(bid.escrow_payment_intent_id);

    const contractValue = (bid.escrow_amount_cents ?? 0) / 100;
    // Use the rate frozen onto the contract when it was awarded, so a later
    // change to PLATFORM_FEE_PERCENT cannot alter an operator's agreed payout.
    // Contracts awarded before that column existed fall back to the legacy 9%.
    const settlement = calculateFees(bid.escrow_amount_cents ?? 0, bid.platform_fee_rate ?? 0.09);
    const platformFee = settlement.fee;
    const operatorPayout = settlement.operatorPayout;
    const operatorPayoutCents = settlement.operatorPayoutCents;

    // ── Stripe Connect transfer ───────────────────────────────────────────────
    // Operator is confirmed ready (checked above). Send their 91% share to
    // their connected account from the platform's balance (just funded by the
    // capture above).
    const transfer = await stripe.transfers.create(
      {
        amount: operatorPayoutCents,
        currency: "cad",
        destination: operatorRecord!.stripe_account_id!,
        description: `LyoDex payout — bid #${bidId} (${request.material_type})`,
        transfer_group: `bid_${bidId}`,
        metadata: {
          bid_id: String(bidId),
          request_id: String(bid.request_id),
          operator_id: String(bid.operator_id),
        },
      },
      // Idempotency key prevents double-transfer if the server crashes between
      // the Stripe call and the DB update (escrow_status: "captured").
      { idempotencyKey: `transfer_bid_${bidId}` }
    );
    const transferId = transfer.id;
    logger.info({ bidId, transferId, operatorPayoutCents, dest: operatorRecord!.stripe_account_id }, "Transfer sent to connected account");

    await db
      .update(bidsTable)
      .set({ escrow_status: "captured" })
      .where(eq(bidsTable.id, bidId));

    await db.insert(activityTable).values({
      type: "contract",
      message: `Contract complete — $${contractValue.toLocaleString("en-CA", { minimumFractionDigits: 2 })} CAD released. ${bid.operator_name} receives $${operatorPayout.toLocaleString("en-CA", { minimumFractionDigits: 2 })} (9% LyoDex fee: $${platformFee.toLocaleString("en-CA", { minimumFractionDigits: 2 })})`,
    });

    // Post a thread message — operator is confirmed ready so a transfer always happens
    const transferNote = `Your payout of $${operatorPayout.toLocaleString("en-CA", { minimumFractionDigits: 2 })} CAD has been transferred to your Stripe account (transfer ID: ${transferId}).`;

    await db.insert(requestMessagesTable).values({
      request_id: bid.request_id,
      user_id: 0,
      sender_name: "LyoDex Platform",
      sender_role: "system",
      body: `Project marked complete. Escrow funds released (contract value: $${contractValue.toLocaleString("en-CA", { minimumFractionDigits: 2 })} CAD, 9% platform fee: $${platformFee.toLocaleString("en-CA", { minimumFractionDigits: 2 })}). ${transferNote}`,
    });

    res.json({
      ok: true,
      contract_value: contractValue,
      platform_fee: platformFee,
      operator_payout: operatorPayout,
      transfer_id: transferId,
    });
  } catch (err: any) {
    logger.error({ err, bid_id: bidId }, "Escrow capture failed");
    res.status(500).json({ error: `Failed to capture escrow: ${err.message}` });
  }
});

// ─── PATCH /api/bids/:id/price-details ────────────────────────────────────────
// Enriches the market-intelligence price record for a submitted bid.
// Called by the operator right after bid creation with optional advanced fields.
router.patch("/bids/:id/price-details", requireAuth, requireRole("operator", "admin"), async (req, res): Promise<void> => {
  const bidId = parseInt(String(req.params.id), 10);
  if (isNaN(bidId)) { res.status(400).json({ error: "Invalid bid id" }); return; }

  const { currency, product_format, moq, setup_fee, payment_terms, certifications } = req.body;

  const [existing] = await db
    .select({ operator_id: priceDataPointsTable.operator_id })
    .from(priceDataPointsTable)
    .where(eq(priceDataPointsTable.bid_id, bidId))
    .limit(1);

  if (!existing) { res.status(404).json({ error: "Price record not found" }); return; }
  if (req.user!.role !== "admin" && existing.operator_id !== req.user!.userId) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const update: Record<string, unknown> = { updated_at: new Date() };
  if (currency === "CAD" || currency === "USD") update.currency = currency;
  if (typeof product_format === "string" && product_format) update.product_format = product_format;
  if (typeof moq === "number" && moq > 0) update.moq = moq;
  if (typeof setup_fee === "number" && setup_fee >= 0) update.setup_fee = setup_fee;
  if (typeof payment_terms === "string" && payment_terms) update.payment_terms = payment_terms;
  if (Array.isArray(certifications)) update.certifications = certifications;

  // Upgrade confidence to 'high' if all key fields are now present
  const [record] = await db.select().from(priceDataPointsTable).where(eq(priceDataPointsTable.bid_id, bidId)).limit(1);
  if (record) {
    const hasCurrency   = (update.currency     ?? record.currency)     != null;
    const hasFormat     = (update.product_format ?? record.product_format) != null;
    const hasMoq        = (update.moq            ?? record.moq)            != null;
    const hasTerms      = (update.payment_terms  ?? record.payment_terms)  != null;
    if (hasCurrency && hasFormat && hasMoq && hasTerms) update.confidence_level = "high";
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.update(priceDataPointsTable).set(update as any).where(eq(priceDataPointsTable.bid_id, bidId));
  res.json({ ok: true });
});

export default router;
