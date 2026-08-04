import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import { WebhookHandlers } from "./webhookHandlers";
import router from "./routes";
import { logger } from "./lib/logger";
import { recordError } from "./lib/errorMonitor";

const app: Express = express();
// Trust the first proxy hop (Replit's reverse proxy / load balancer) so that
// req.ip reflects the real client address rather than the proxy's address.
// This is required for express-rate-limit and ip_hash derivations to work
// correctly. Only one hop is trusted — we do not blindly trust the full
// x-forwarded-for chain, which could be spoofed by a direct client.
app.set("trust proxy", 1);
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// CRITICAL: Stripe webhook routes MUST be registered BEFORE express.json()
// Stripe requires the raw Buffer body for signature verification
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res): Promise<void> => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      res.status(400).json({ error: "Missing stripe-signature header" });
      return;
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (err: any) {
      logger.error({ err }, "Stripe webhook error");
      res.status(400).json({ error: "Webhook processing error" });
    }
  }
);

// ── Stripe Connect thin-event webhook ────────────────────────────────────────
// V2 accounts emit "thin" events — a lightweight notification containing only
// the event ID. We parse it, then fetch the full event from the V2 API.
// Must be registered BEFORE express.json() to preserve the raw Buffer.
// Register this endpoint in your Stripe Dashboard → Webhooks → Connected accounts
// with payload style "Thin" and event types:
//   v2.core.account[requirements].updated
//   v2.core.account[.recipient].capability_status_updated
app.post(
  "/api/stripe/connect-webhook",
  express.raw({ type: "application/json" }),
  async (req, res): Promise<void> => {
    const signature = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;

    try {
      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();
      const stripeAny = stripe as any;

      // Parse the thin event — verifies the Stripe-Signature header when a
      // webhook secret is configured. In dev without a secret we parse as JSON.
      let thinEvent: { id: string; type: string };
      const sig = Array.isArray(signature) ? signature[0] : signature ?? "";

      if (webhookSecret && sig) {
        // Verifies signature and returns the thin event envelope.
        // Cast to any: parseThinEvent exists in Stripe SDK v20 at runtime
        // but the TypeScript types don't yet expose it on the top-level Stripe class.
        thinEvent = (stripe as any).parseThinEvent(req.body as Buffer, sig, webhookSecret) as any;
      } else if (process.env.NODE_ENV !== "production") {
        // Development convenience: skip signature verification
        thinEvent = JSON.parse((req.body as Buffer).toString());
      } else {
        res.status(400).json({ error: "STRIPE_CONNECT_WEBHOOK_SECRET is required in production" });
        return;
      }

      // Fetch the full event object from the V2 API using the thin event's ID
      const event = await stripeAny.v2.core.events.retrieve(thinEvent.id) as any;

      const { db } = await import("@workspace/db");
      const { operatorsTable } = await import("@workspace/db/schema");
      const { eq } = await import("drizzle-orm");

      if (event.type === "v2.core.account[requirements].updated") {
        // Requirements on a connected account changed (regulatory or network update).
        // Log the change so operators know to check their dashboard.
        logger.info(
          { event_id: event.id, account_id: event.related_object?.id },
          "Connect: account requirements updated — operator may need to provide additional information"
        );
      }

      if (
        event.type === "v2.core.account[.recipient].capability_status_updated" ||
        event.type.includes("capability_status_updated")
      ) {
        // A capability status changed on a recipient-configured account.
        // Re-check whether stripe_transfers is now active and update our DB.
        const accountId: string | undefined = event.related_object?.id;
        if (accountId) {
          const account = await stripeAny.v2.core.accounts.retrieve(accountId, {
            include: ["configuration.recipient", "requirements"],
          }) as any;

          const readyToReceive: boolean =
            account?.configuration?.recipient?.capabilities?.stripe_balance
              ?.stripe_transfers?.status === "active";

          if (readyToReceive) {
            await db
              .update(operatorsTable)
              .set({ stripe_onboarded: true })
              .where(eq(operatorsTable.stripe_account_id, accountId));

            logger.info({ accountId }, "Connect: operator fully onboarded — stripe_transfers active");
          } else {
            logger.info({ accountId, event_id: event.id }, "Connect: capability status updated but not yet active");
          }
        }
      }

      res.json({ received: true });
    } catch (err: any) {
      logger.error({ err }, "Connect webhook error");
      res.status(400).json({ error: err.message ?? "Webhook processing failed" });
    }
  }
);

// Fee webhook: raw body required for Stripe signature verification
app.post(
  "/api/stripe/fee-webhook",
  express.raw({ type: "application/json" }),
  async (req, res): Promise<void> => {
    const { getUncachableStripeClient } = await import("./stripeClient");
    const { db } = await import("@workspace/db");
    const { bidsTable } = await import("@workspace/db/schema");
    const { eq } = await import("drizzle-orm");

    const signature = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: any;

    if (!webhookSecret) {
      // Sandbox convenience: no secret configured — only allow in development
      if (process.env.NODE_ENV === "production") {
        res.status(400).json({ error: "STRIPE_WEBHOOK_SECRET is required in production" });
        return;
      }
      try {
        event = JSON.parse(req.body.toString());
      } catch {
        res.status(400).json({ error: "Invalid JSON body" });
        return;
      }
    } else {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      if (!sig) {
        res.status(400).json({ error: "Missing stripe-signature header" });
        return;
      }
      try {
        const stripe = await getUncachableStripeClient();
        event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
      } catch (err: any) {
        res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
        return;
      }
    }

    // ── account.application.deauthorized ─────────────────────────────────────
    // Fires when an operator revokes access to this platform from their Stripe
    // dashboard. Clear their connected account so they are prompted to reconnect.
    if (event.type === "account.application.deauthorized") {
      const accountId: string | undefined = event.account ?? event.data?.object?.id;
      if (accountId) {
        const { operatorsTable, usersTable } = await import("@workspace/db/schema");
        const [operator] = await db
          .select()
          .from(operatorsTable)
          .where(eq(operatorsTable.stripe_account_id, accountId))
          .limit(1);

        await db
          .update(operatorsTable)
          .set({ stripe_account_id: null, stripe_onboarded: false, stripe_disconnected: true })
          .where(eq(operatorsTable.stripe_account_id, accountId));
        logger.info({ accountId }, "Connect: account deauthorized — cleared stripe_account_id, flagged stripe_disconnected");

        if (operator?.user_id) {
          const [user] = await db
            .select({ email: usersTable.email })
            .from(usersTable)
            .where(eq(usersTable.id, operator.user_id))
            .limit(1);
          if (user?.email) {
            const { sendStripeDisconnectedEmail } = await import("./lib/email");
            await sendStripeDisconnectedEmail({ operatorEmail: user.email, operatorName: operator.name });
          } else {
            logger.warn({ accountId, operatorId: operator.id }, "Connect: deauthorized operator has no linked user email — skipping notification email");
          }
        } else {
          logger.warn({ accountId }, "Connect: deauthorized operator has no user_id — skipping notification email");
        }
      }
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const bidId = session.metadata?.bid_id ? parseInt(session.metadata.bid_id, 10) : null;
      const sessionType = session.metadata?.type; // 'escrow' | undefined (legacy fee sessions have no type)

      if (bidId && !isNaN(bidId)) {
        const [bid] = await db
          .select()
          .from(bidsTable)
          .where(eq(bidsTable.id, bidId))
          .limit(1);

        if (!bid) {
          logger.warn({ bidId }, "Webhook: bid not found");
        } else if (sessionType === "escrow") {
          // ── Escrow session: buyer has funded the contract ─────────────────
          // The PaymentIntent is in 'requires_capture' state — funds are held.
          const paymentIntentId = typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent as any)?.id ?? null;

          if (bid.status === "pending_escrow") {
            // ── Full state transition: pending_escrow → accepted ─────────────
            // The request is closed here (not in the accept handler) so the
            // marketplace is never locked by an unfunded contract.
            const { requestsTable, requestMessagesTable, activityTable, priceDataPointsTable } = await import("@workspace/db/schema");
            const { ne, and: txAnd } = await import("drizzle-orm");
            const contractValue = (session.amount_total ?? (bid.escrow_amount_cents ?? 0)) / 100;
            const operatorPayout = +(contractValue * 0.91).toFixed(2);

            await db.transaction(async (tx) => {
              // Idempotent guard: if another bid for this request is already
              // accepted (e.g. a concurrent checkout completion), reject this one
              // to prevent two accepted bids on the same request.
              const [alreadyAccepted] = await tx
                .select({ id: bidsTable.id })
                .from(bidsTable)
                .where(txAnd(
                  eq(bidsTable.request_id, bid.request_id),
                  ne(bidsTable.id, bidId),
                  eq(bidsTable.status, "accepted")
                ))
                .limit(1);

              if (alreadyAccepted) {
                logger.warn({ bidId, alreadyAcceptedBidId: alreadyAccepted.id, requestId: bid.request_id },
                  "Webhook: duplicate escrow completion — another bid already accepted for this request; reverting this bid to rejected");
                await tx.update(bidsTable)
                  .set({ status: "rejected", escrow_status: "authorized", escrow_payment_intent_id: paymentIntentId })
                  .where(eq(bidsTable.id, bidId));
                // This bid never became a contract — make sure its price is not
                // counted as an awarded price in market intelligence.
                await tx.update(priceDataPointsTable)
                  .set({ accepted: false, quote_status: "rejected" })
                  .where(eq(priceDataPointsTable.bid_id, bidId));
                return; // exit transaction — no further state changes
              }

              await tx.update(requestsTable)
                .set({ status: "closed" })
                .where(eq(requestsTable.id, bid.request_id));

              await tx.update(bidsTable).set({
                status: "accepted",
                job_status: "pending_materials",
                escrow_status: "authorized",
                escrow_payment_intent_id: paymentIntentId,
                escrow_amount_cents: session.amount_total ?? bid.escrow_amount_cents,
              }).where(eq(bidsTable.id, bidId));

              // The contract now genuinely exists — escrow is funded and the
              // request is closed. This is the only place a price may be marked
              // as an awarded contract price, since it is the only point at
              // which money has actually moved. Same transaction as the bid
              // update so the two can never disagree.
              await tx.update(priceDataPointsTable).set({
                accepted: true,
                quote_status: "accepted",
                updated_at: new Date(),
              }).where(eq(priceDataPointsTable.bid_id, bidId));

              await tx.insert(requestMessagesTable).values({
                request_id: bid.request_id,
                user_id: 0,
                sender_name: "LyoDex Platform",
                sender_role: "system",
                body: `Escrow funded — your bid of $${bid.price_per_kg}/kg has been officially accepted. Once the project is complete, you will receive $${operatorPayout.toLocaleString("en-CA", { minimumFractionDigits: 2 })} CAD (91% of contract value — the 9% LyoDex platform fee is deducted on release).`,
              });

              await tx.insert(activityTable).values({
                type: "contract",
                message: `Escrow funded: ${bid.operator_name}'s bid at $${bid.price_per_kg}/kg is now an active contract`,
              });
            });

            logger.info({ bidId, paymentIntentId, amount: session.amount_total }, "Escrow authorized — contract activated");
          } else if (bid.escrow_status !== "authorized") {
            // ── Legacy / already-accepted bid: just record escrow authorization ─
            await db.update(bidsTable).set({
              escrow_status: "authorized",
              escrow_payment_intent_id: paymentIntentId,
              escrow_amount_cents: session.amount_total ?? bid.escrow_amount_cents,
            }).where(eq(bidsTable.id, bidId));

            logger.info({ bidId, paymentIntentId, amount: session.amount_total }, "Escrow authorized (bid was already accepted)");
          }
        } else {
          // ── Legacy fee session: operator paid the platform fee ────────────
          if (bid.stripe_session_id === session.id && bid.fee_status !== "paid") {
            await db.update(bidsTable).set({ fee_status: "paid" }).where(eq(bidsTable.id, bidId));

            const { requestsTable, operatorsTable, usersTable } = await import("@workspace/db/schema");
            try {
              const [request] = await db
                .select()
                .from(requestsTable)
                .where(eq(requestsTable.id, bid.request_id))
                .limit(1);

              const [operator] = await db
                .select()
                .from(operatorsTable)
                .where(eq(operatorsTable.id, bid.operator_id))
                .limit(1);

              let operatorEmail: string | null = null;
              if (operator?.user_id) {
                const [user] = await db
                  .select({ email: usersTable.email })
                  .from(usersTable)
                  .where(eq(usersTable.id, operator.user_id))
                  .limit(1);
                operatorEmail = user?.email ?? null;
              }

              if (request && operator && operatorEmail) {
                const contractValue = bid.price_per_kg * (request.quantity_kg ?? 0);
                const feeAmountCents = Math.round(contractValue * 0.09 * 100);
                const { sendFeeReceiptEmail } = await import("./lib/email");
                await sendFeeReceiptEmail({
                  operatorEmail,
                  operatorName: operator.name,
                  bidId,
                  materialType: request.material_type,
                  quantityKg: request.quantity_kg ?? 0,
                  pricePerKg: bid.price_per_kg,
                  contractValue,
                  feeAmount: feeAmountCents,
                  stripeSessionId: session.id,
                  turnaroundDays: bid.turnaround_days,
                });
              } else {
                logger.warn({ bidId }, "Fee receipt email skipped — missing operator email or related data");
              }
            } catch (emailErr) {
              logger.error({ err: emailErr, bidId }, "Fee receipt email failed");
            }
          }
        }
      }
    }

    // ── checkout.session.expired ─────────────────────────────────────────────
    // When a buyer abandons the escrow checkout, revert the bid from
    // pending_escrow back to pending so the request re-enters the open market.
    if (event.type === "checkout.session.expired") {
      const expiredSession = event.data.object;
      const expiredBidId = expiredSession.metadata?.bid_id ? parseInt(expiredSession.metadata.bid_id, 10) : null;
      const expiredSessionType = expiredSession.metadata?.type;

      if (expiredBidId && !isNaN(expiredBidId) && expiredSessionType === "escrow") {
        const { bidsTable: bt } = await import("@workspace/db/schema");
        const [expiredBid] = await db
          .select({ id: bt.id, status: bt.status, request_id: bt.request_id })
          .from(bt)
          .where(eq(bt.id, expiredBidId))
          .limit(1);

        if (expiredBid && expiredBid.status === "pending_escrow") {
          await db
            .update(bt)
            .set({ status: "pending" })
            .where(eq(bt.id, expiredBidId));
          logger.info({ bidId: expiredBidId }, "Escrow checkout session expired — bid reverted from pending_escrow to pending");
        }
      }
    }

    res.json({ received: true });
  }
);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : null;
app.use(cors({
  origin: allowedOrigins
    ? (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) cb(null, true);
        else cb(new Error(`CORS: origin not allowed — ${origin}`));
      }
    : true,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// ── Serve frontend in production ──────────────────────────────────────────────
// The built Vite output is at artifacts/lyodex/dist/public/ relative to the
// project root. In development this folder won't exist, so the block is skipped.
const frontendDist = path.join(process.cwd(), "artifacts/lyodex/dist/public");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist, { maxAge: "1h", index: false }));
  // SPA fallback — all non-API routes return index.html so wouter handles routing
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
} else {
  logger.info({ frontendDist }, "Frontend dist not found — skipping static serving (dev mode)");
}

app.use((err: unknown, req: Request, res: Response, _next: NextFunction): void => {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  recordError(message, "server", stack);
  logger.error({ err, url: req.url, method: req.method }, "unhandled Express error");
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default app;
