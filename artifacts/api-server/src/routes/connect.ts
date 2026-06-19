/**
 * Stripe Connect routes — operator payout onboarding.
 *
 * Flow:
 *  1. POST /api/stripe/connect/create-account
 *       Creates a Stripe V1 connected account for the operator (if none exists),
 *       then returns an Account Link URL to redirect them to Stripe's onboarding.
 *  2. GET  /api/stripe/connect/status
 *       Fetches the live onboarding status directly from the Stripe V1 API.
 *       Never reads from DB cache — always fresh from Stripe.
 *  3. POST /api/stripe/connect/onboarding-link
 *       Generates a fresh Account Link for operators who need to retry/resume
 *       onboarding (e.g. after the link expired or they hit the refresh_url).
 */
import { Router } from "express";
import Stripe from "stripe";
import { db } from "@workspace/db";
import { operatorsTable, usersTable, operatorListingsTable } from "@workspace/db/schema";
import { eq, count } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/requireAuth";
import { getUncachableStripeClient } from "../stripeClient";
import { logger } from "../lib/logger";

const router = Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Return the base URL for Stripe redirect callbacks. */
function getBaseUrl(): string {
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  return domain ? `https://${domain}` : "http://localhost:3000";
}

/**
 * Look up the operator record by the logged-in user's ID.
 * Returns null if the user hasn't created an operator profile yet.
 */
async function getOperatorByUserId(userId: number) {
  const [op] = await db
    .select()
    .from(operatorsTable)
    .where(eq(operatorsTable.user_id, userId))
    .limit(1);
  return op ?? null;
}

// ── POST /api/stripe/connect/create-account ───────────────────────────────────

router.post(
  "/stripe/connect/create-account",
  requireAuth,
  requireRole("operator", "admin"),
  async (req, res): Promise<void> => {
    const userId = req.user!.userId;

    try {
      const operator = await getOperatorByUserId(userId);
      if (!operator) {
        res.status(404).json({ error: "Operator profile not found. Create your profile first." });
        return;
      }

      // Get the user's email for the connected account contact
      const [user] = await db
        .select({ email: usersTable.email })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);

      const email = user?.email ?? req.user!.email;

      console.log("[connect] create-account: operator=%o, email=%s", { id: operator.id, name: operator.name }, email);

      const stripe: Stripe = await getUncachableStripeClient();

      let accountId = operator.stripe_account_id;

      // Only create a new connected account if one doesn't already exist
      if (!accountId) {
        // Use the V1 Express account API so operators get a Stripe-hosted dashboard.
        // The transfers capability enables receiving payouts from the platform balance.
        const account = await stripe.accounts.create({
          type: "express",
          country: "CA",
          email,
          capabilities: {
            transfers: { requested: true },
          },
          business_profile: {
            name: operator.name,
          },
        });

        accountId = account.id;

        // Persist the connected account ID so we can reference it on escrow release.
        // Also clear stripe_disconnected so the dashboard no longer shows "Reconnect".
        await db
          .update(operatorsTable)
          .set({ stripe_account_id: accountId, stripe_disconnected: false })
          .where(eq(operatorsTable.user_id, userId));

        logger.info({ operatorId: operator.id, accountId }, "Created Stripe Connect V1 Express account");
      }

      // Create an Account Link so the operator can complete onboarding on Stripe
      const baseUrl = getBaseUrl();

      console.log("[connect] create-account: creating account link for accountId=%s", accountId);

      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${baseUrl}/dashboard?connect_refresh=1`,
        return_url: `${baseUrl}/dashboard?connect_return=1`,
        type: "account_onboarding",
      });

      res.json({ url: accountLink.url, account_id: accountId });
    } catch (err: any) {
      logger.error({ err }, "Stripe Connect account creation failed");
      res.status(500).json({ error: err.message ?? "Failed to create connected account" });
    }
  }
);

// ── GET /api/stripe/connect/status ────────────────────────────────────────────

router.get(
  "/stripe/connect/status",
  requireAuth,
  requireRole("operator", "admin"),
  async (req, res): Promise<void> => {
    const userId = req.user!.userId;

    const operator = await getOperatorByUserId(userId);

    if (!operator) {
      res.json({ connected: false, onboarded: false, account_id: null, has_profile: false, has_listing: false });
      return;
    }

    // Check whether this operator has at least one capacity listing
    const [listingCountRow] = await db
      .select({ n: count() })
      .from(operatorListingsTable)
      .where(eq(operatorListingsTable.user_id, userId));
    const hasListing = (listingCountRow?.n ?? 0) > 0;

    if (!operator.stripe_account_id) {
      res.json({
        connected: false,
        onboarded: false,
        account_id: null,
        disconnected: operator.stripe_disconnected ?? false,
        has_profile: true,
        has_listing: hasListing,
      });
      return;
    }

    try {
      const stripe: Stripe = await getUncachableStripeClient();

      console.log("[connect] status: retrieving account %s", operator.stripe_account_id);

      // Always retrieve live status directly from Stripe — never rely on DB cache alone.
      const account = await stripe.accounts.retrieve(operator.stripe_account_id);

      // V1: charges_enabled / payouts_enabled are the canonical readiness flags.
      const readyToReceive: boolean = account.charges_enabled === true && account.payouts_enabled === true;

      // If there are currently_due requirements the operator hasn't fulfilled yet,
      // onboarding is not complete.
      const currentlyDue = account.requirements?.currently_due ?? [];
      const onboardingComplete = currentlyDue.length === 0;

      // Build a human-readable requirements status for the frontend
      const requirementsStatus: string | null =
        (account.requirements?.past_due?.length ?? 0) > 0
          ? "past_due"
          : currentlyDue.length > 0
            ? "currently_due"
            : null;

      // If the operator just became fully onboarded, update the DB flag
      if (readyToReceive && !operator.stripe_onboarded) {
        await db
          .update(operatorsTable)
          .set({ stripe_onboarded: true })
          .where(eq(operatorsTable.user_id, userId));
      }

      res.json({
        connected: true,
        account_id: operator.stripe_account_id,
        ready_to_receive: readyToReceive,
        onboarding_complete: onboardingComplete,
        requirements_status: requirementsStatus,
        onboarded: operator.stripe_onboarded || readyToReceive,
        has_profile: true,
        has_listing: hasListing,
      });
    } catch (err: any) {
      logger.warn({ err, accountId: operator.stripe_account_id }, "Failed to fetch live Stripe Connect status");
      // Return what we know from the DB so the UI doesn't break
      res.json({
        connected: true,
        account_id: operator.stripe_account_id,
        ready_to_receive: false,
        onboarding_complete: false,
        requirements_status: null,
        onboarded: operator.stripe_onboarded,
        has_profile: true,
        has_listing: hasListing,
        error: "Could not fetch live status from Stripe",
      });
    }
  }
);

// ── POST /api/stripe/connect/onboarding-link ──────────────────────────────────

router.post(
  "/stripe/connect/onboarding-link",
  requireAuth,
  requireRole("operator", "admin"),
  async (req, res): Promise<void> => {
    const userId = req.user!.userId;

    const operator = await getOperatorByUserId(userId);

    if (!operator?.stripe_account_id) {
      res.status(400).json({ error: "No connected account found. Start onboarding first." });
      return;
    }

    try {
      const stripe: Stripe = await getUncachableStripeClient();
      const baseUrl = getBaseUrl();

      console.log("[connect] onboarding-link: generating fresh link for accountId=%s", operator.stripe_account_id);

      // Generate a fresh Account Link — links expire after a short time,
      // so this endpoint is called whenever the operator needs to resume/retry.
      const accountLink = await stripe.accountLinks.create({
        account: operator.stripe_account_id,
        refresh_url: `${baseUrl}/dashboard?connect_refresh=1`,
        return_url: `${baseUrl}/dashboard?connect_return=1`,
        type: "account_onboarding",
      });

      res.json({ url: accountLink.url });
    } catch (err: any) {
      logger.error({ err }, "Failed to create onboarding link");
      res.status(500).json({ error: err.message ?? "Failed to generate onboarding link" });
    }
  }
);

export default router;
