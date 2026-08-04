import { Router, type IRouter } from "express";
import { getUncachableStripeClient, getStripePublishableKey } from "../stripeClient";
import { requireAuth, requireRole, requireAdminCapability } from "../middleware/requireAuth";
import { db } from "@workspace/db";
import { bidsTable, requestsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { checkWebhookHealth } from "../lib/webhookHealthMonitor";
import { getPublicBaseUrl } from "../lib/publicUrl";

const router: IRouter = Router();

router.get("/stripe/config", async (_req, res) => {
  try {
    const publishableKey = await getStripePublishableKey();
    res.json({ publishableKey });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List all active products with their prices — fetched directly from Stripe API
router.get("/stripe/products", async (_req, res) => {
  try {
    const stripe = await getUncachableStripeClient();
    const products = await stripe.products.list({ active: true, expand: ["data.default_price"] });

    const result = await Promise.all(
      products.data.map(async (product) => {
        const prices = await stripe.prices.list({ product: product.id, active: true });
        return {
          id: product.id,
          name: product.name,
          description: product.description,
          metadata: product.metadata,
          prices: prices.data.map((p) => ({
            id: p.id,
            unit_amount: p.unit_amount,
            currency: p.currency,
            recurring: p.recurring,
          })),
        };
      })
    );

    res.json({ data: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create a Stripe Checkout session for a subscription plan
router.post("/stripe/checkout", async (req, res): Promise<void> => {
  const { priceId, email } = req.body as { priceId: string; email?: string };
  if (!priceId) {
    res.status(400).json({ error: "priceId is required" });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();
    const baseUrl = getPublicBaseUrl();

    const sessionParams: any = {
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${baseUrl}/pricing?checkout=success`,
      cancel_url: `${baseUrl}/pricing?checkout=cancel`,
    };
    if (email) sessionParams.customer_email = email;

    const session = await stripe.checkout.sessions.create(sessionParams);
    res.json({ url: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/stripe/fee-checkout ───────────────────────────────────────────
// Creates a Stripe Checkout session for the 9% platform fee on an accepted bid.
// Requires operator or admin role; operator must own the bid.
router.post(
  "/stripe/fee-checkout",
  requireAuth,
  requireRole("operator", "admin"),
  async (req, res) => {
    const { bidId } = req.body as { bidId: number };
    if (!bidId) return res.status(400).json({ error: "bidId is required" });

    const [bid] = await db
      .select()
      .from(bidsTable)
      .where(eq(bidsTable.id, bidId))
      .limit(1);

    if (!bid) return res.status(404).json({ error: "Bid not found" });

    // Enforce ownership: operator can only pay fee for their own bids
    if (req.user!.role === "operator" && bid.operator_id !== req.user!.userId) {
      return res.status(403).json({ error: "You do not own this bid" });
    }

    if (bid.status !== "accepted") return res.status(400).json({ error: "Bid is not accepted" });
    if (bid.fee_status === "paid") return res.status(400).json({ error: "Fee already paid" });

    const [request] = await db
      .select()
      .from(requestsTable)
      .where(eq(requestsTable.id, bid.request_id))
      .limit(1);

    if (!request) return res.status(404).json({ error: "Request not found" });

    const contract_value = bid.price_per_kg * (request.quantity_kg ?? 0);
    const fee_amount_cents = Math.round(contract_value * 0.09 * 100);

    if (fee_amount_cents < 50) {
      return res.status(400).json({ error: "Fee amount too small to process via Stripe (minimum $0.50)" });
    }

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
              unit_amount: fee_amount_cents,
              product_data: {
                name: "LyoDex Platform Fee",
                description: `9% platform fee on ${request.material_type} contract (${request.quantity_kg} kg @ $${bid.price_per_kg}/kg)`,
              },
            },
          },
        ],
        success_url: `${baseUrl}/dashboard?fee_paid=1&bid_id=${bidId}`,
        cancel_url: `${baseUrl}/dashboard?fee_cancelled=1&bid_id=${bidId}`,
        metadata: { bid_id: String(bidId), contract_value: String(contract_value) },
      });

      await db
        .update(bidsTable)
        .set({ fee_status: "pending", stripe_session_id: session.id })
        .where(eq(bidsTable.id, bidId));

      return res.json({ url: session.url, session_id: session.id });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ─── GET /api/stripe/fee-webhook-health ──────────────────────────────────────
// Admin-only health check: confirms STRIPE_WEBHOOK_SECRET is loaded and
// retrieves the current status of the production webhook endpoint from Stripe.
router.get(
  "/stripe/fee-webhook-health",
  requireAuth,
  requireRole("admin"),
  // Payment-infrastructure diagnostics — restricted to finance-capable admins.
  requireAdminCapability("finance"),
  async (_req, res) => {
    const result = await checkWebhookHealth();

    const prodDomain = process.env.PROD_DOMAIN ?? "lyodex.com";
    const webhookUrl = `https://${prodDomain}/api/stripe/fee-webhook`;

    if (!result.ok && result.secret_loaded && result.endpoint_status === undefined) {
      res.status(200).json({ ...result, webhook_url: webhookUrl });
      return;
    }

    try {
      const stripe = await getUncachableStripeClient();
      const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
      const endpoint = endpoints.data.find((ep) => ep.url === webhookUrl);

      if (!endpoint) {
        res.status(200).json(result);
        return;
      }

      res.status(200).json({
        ...result,
        endpoint_id: endpoint.id,
        enabled_events: endpoint.enabled_events,
        api_version: endpoint.api_version,
      });
    } catch {
      res.status(200).json(result);
    }
  }
);

// ─── GET /api/stripe/fee-status/:bidId ───────────────────────────────────────
// Poll the fee payment status for a given bid.
// Requires operator or admin role; operator must own the bid.
router.get(
  "/stripe/fee-status/:bidId",
  requireAuth,
  requireRole("operator", "admin"),
  async (req, res) => {
    const bidId = parseInt(String(req.params.bidId), 10);
    if (isNaN(bidId)) return res.status(400).json({ error: "Invalid bidId" });

    const [bid] = await db
      .select({ fee_status: bidsTable.fee_status, stripe_session_id: bidsTable.stripe_session_id, operator_id: bidsTable.operator_id })
      .from(bidsTable)
      .where(eq(bidsTable.id, bidId))
      .limit(1);

    if (!bid) return res.status(404).json({ error: "Bid not found" });

    // Enforce ownership: operator can only check fee status for their own bids
    if (req.user!.role === "operator" && bid.operator_id !== req.user!.userId) {
      return res.status(403).json({ error: "You do not own this bid" });
    }

    // If still pending, check directly with Stripe for up-to-date status
    if (bid.fee_status === "pending" && bid.stripe_session_id) {
      try {
        const stripe = await getUncachableStripeClient();
        const session = await stripe.checkout.sessions.retrieve(bid.stripe_session_id);
        if (session.payment_status === "paid") {
          await db
            .update(bidsTable)
            .set({ fee_status: "paid" })
            .where(eq(bidsTable.id, bidId));
          return res.json({ fee_status: "paid" });
        }
      } catch {
        // Ignore Stripe errors — return DB state
      }
    }

    return res.json({ fee_status: bid.fee_status });
  }
);

export default router;
