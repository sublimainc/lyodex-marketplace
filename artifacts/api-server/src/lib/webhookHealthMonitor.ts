/**
 * webhookHealthMonitor
 *
 * On server startup and every hour thereafter, checks whether the production
 * Stripe fee-webhook endpoint is registered and enabled. If the check fails,
 * sends an admin alert email (rate-limited to at most once per hour).
 *
 * Skipped entirely when NODE_ENV !== "production".
 */

import { getUncachableStripeClient } from "../stripeClient";
import { logger } from "./logger";
import { sendAdminAlertEmail } from "./email";

export interface WebhookHealthResult {
  ok: boolean;
  secret_loaded: boolean;
  webhook_url: string;
  endpoint_status?: string;
  message: string;
}

export async function checkWebhookHealth(): Promise<WebhookHealthResult> {
  const secretLoaded = !!process.env.STRIPE_WEBHOOK_SECRET;
  const prodDomain = process.env.PROD_DOMAIN ?? "lyodex.com";
  const webhookUrl = `https://${prodDomain}/api/stripe/fee-webhook`;

  if (!secretLoaded) {
    return {
      ok: false,
      secret_loaded: false,
      webhook_url: webhookUrl,
      message: "STRIPE_WEBHOOK_SECRET is not set — webhook signature verification will fail in production.",
    };
  }

  try {
    const stripe = await getUncachableStripeClient();
    const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
    const endpoint = endpoints.data.find((ep) => ep.url === webhookUrl);

    if (!endpoint) {
      return {
        ok: false,
        secret_loaded: true,
        webhook_url: webhookUrl,
        message: "Endpoint not found in Stripe. Run scripts/stripe/register-stripe-webhook-prod.mjs to register it.",
      };
    }

    return {
      ok: endpoint.status === "enabled",
      secret_loaded: true,
      webhook_url: webhookUrl,
      endpoint_status: endpoint.status,
      message:
        endpoint.status === "enabled"
          ? "Webhook endpoint is registered and enabled."
          : `Webhook endpoint is ${endpoint.status}. Check the Stripe dashboard.`,
    };
  } catch (err: any) {
    return {
      ok: false,
      secret_loaded: true,
      webhook_url: webhookUrl,
      message: `Could not query Stripe: ${err.message}`,
    };
  }
}

const ALERT_COOLDOWN_MS = 60 * 60 * 1000;
let lastAlertAt = 0;

async function runProbe(): Promise<void> {
  let result: WebhookHealthResult;
  try {
    result = await checkWebhookHealth();
  } catch (err) {
    logger.error({ err }, "webhookHealthMonitor: unexpected error during health check");
    return;
  }

  if (result.ok) {
    logger.info({ webhook_url: result.webhook_url }, "webhookHealthMonitor: webhook is healthy");
    return;
  }

  logger.warn({ result }, "webhookHealthMonitor: webhook health check failed");

  const now = Date.now();
  if (now - lastAlertAt < ALERT_COOLDOWN_MS) {
    logger.info(
      { nextAlertInMs: ALERT_COOLDOWN_MS - (now - lastAlertAt) },
      "webhookHealthMonitor: alert suppressed (rate limit — once per hour)"
    );
    return;
  }

  lastAlertAt = now;

  const subject = "LyoDex Alert: Stripe webhook is disabled or unregistered";
  const body = [
    "The LyoDex Stripe fee-webhook health check has detected a problem.",
    "",
    `Status:       ${result.ok ? "OK" : "FAILED"}`,
    `Secret loaded: ${result.secret_loaded ? "yes" : "no"}`,
    `Webhook URL:  ${result.webhook_url}`,
    result.endpoint_status ? `Endpoint:     ${result.endpoint_status}` : "",
    "",
    `Details: ${result.message}`,
    "",
    "Action required:",
    result.secret_loaded
      ? "  - Log in to the Stripe Dashboard and verify the webhook endpoint is enabled."
      : "  - Set STRIPE_WEBHOOK_SECRET in the Replit Secrets panel and restart the server.",
    "  - Run: node scripts/stripe/register-stripe-webhook-prod.mjs (if endpoint is missing)",
    "",
    "This alert fires at most once per hour.",
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  try {
    await sendAdminAlertEmail(subject, body);
  } catch (err) {
    logger.error({ err }, "webhookHealthMonitor: failed to send admin alert email");
  }
}

const PROBE_INTERVAL_MS = 60 * 60 * 1000;
const STARTUP_DELAY_MS = 30_000;

export function startWebhookHealthMonitor(): void {
  if (process.env.NODE_ENV !== "production") {
    logger.debug("webhookHealthMonitor: skipped (not production)");
    return;
  }

  logger.info(
    { startupDelayMs: STARTUP_DELAY_MS, intervalMs: PROBE_INTERVAL_MS },
    "webhookHealthMonitor: scheduled — will probe after startup delay and then hourly"
  );

  setTimeout(() => {
    void runProbe();
    setInterval(() => void runProbe(), PROBE_INTERVAL_MS);
  }, STARTUP_DELAY_MS);
}
