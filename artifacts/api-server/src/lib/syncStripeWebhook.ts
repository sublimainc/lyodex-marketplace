/**
 * syncStripeWebhook
 *
 * On server startup, checks whether the Stripe fee-webhook endpoint is
 * registered at the current REPLIT_DOMAINS domain. If the domain has changed
 * (e.g. after a deployment or repl rename), the old URL is stale and Stripe
 * will not deliver events.
 *
 * Strategy:
 *  1. Derive the expected URL from REPLIT_DOMAINS.
 *  2. List all Stripe webhook endpoints (up to 100).
 *  3. Find any endpoint whose URL ends with "/api/stripe/fee-webhook".
 *  4a. If found and URL already matches → nothing to do.
 *  4b. If found but URL differs → UPDATE the endpoint URL in place.
 *      The signing secret is preserved, so STRIPE_WEBHOOK_SECRET stays valid.
 *  4c. If not found → CREATE a new endpoint, log the new signing secret,
 *      and write a system alert to the DB so the admin panel shows a warning.
 *  5. Any error is logged as a warning but never throws (server keeps starting).
 */

import Stripe from "stripe";
import { logger } from "./logger";
import { db } from "@workspace/db";
import { systemAlertsTable } from "@workspace/db/schema";
import { eq, isNull } from "drizzle-orm";

const FEE_WEBHOOK_PATH = "/api/stripe/fee-webhook";
const WEBHOOK_ALERT_KEY = "stripe_webhook_secret_update_required";
const REQUIRED_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  "checkout.session.completed",
  "checkout.session.expired",
  "account.application.deauthorized",
];

async function upsertWebhookSecretAlert(secret: string, endpointId: string, endpointUrl: string): Promise<void> {
  try {
    await db
      .update(systemAlertsTable)
      .set({ dismissed_at: new Date() })
      .where(eq(systemAlertsTable.alert_key, WEBHOOK_ALERT_KEY));

    await db.insert(systemAlertsTable).values({
      alert_key: WEBHOOK_ALERT_KEY,
      title: "Stripe webhook secret must be updated",
      message:
        "A new Stripe fee-webhook endpoint was created because no existing endpoint was found. " +
        "The signing secret below must be saved as STRIPE_WEBHOOK_SECRET in Replit Secrets, " +
        "otherwise incoming Stripe events cannot be verified and fee collection will break.",
      metadata: {
        STRIPE_WEBHOOK_SECRET: secret,
        endpoint_id: endpointId,
        endpoint_url: endpointUrl,
        instructions: [
          "1. Copy the STRIPE_WEBHOOK_SECRET value shown in this alert.",
          "2. Open the Replit Secrets panel (lock icon in the sidebar).",
          "3. Set STRIPE_WEBHOOK_SECRET to the copied value.",
          "4. Restart the API server so it picks up the new secret.",
          "5. Dismiss this alert once done.",
        ],
      },
      dismissed_at: null,
    });
  } catch (err) {
    logger.warn({ err }, "syncStripeWebhook: failed to write system alert to DB");
  }
}

export async function syncStripeWebhook(stripe: Stripe): Promise<void> {
  const rawDomains = process.env.REPLIT_DOMAINS;
  if (!rawDomains) {
    logger.debug("REPLIT_DOMAINS not set — skipping Stripe webhook sync");
    return;
  }

  const domain = rawDomains.split(",")[0]!.trim();
  const expectedUrl = `https://${domain}${FEE_WEBHOOK_PATH}`;

  let endpoints: Stripe.WebhookEndpoint[];
  try {
    const list = await stripe.webhookEndpoints.list({ limit: 100 });
    endpoints = list.data;
  } catch (err) {
    logger.warn({ err }, "Stripe webhook sync: failed to list webhook endpoints");
    return;
  }

  const feeEndpoint = endpoints.find((wh) =>
    wh.url.endsWith(FEE_WEBHOOK_PATH)
  );

  if (!feeEndpoint) {
    logger.warn(
      { expectedUrl },
      "Stripe webhook sync: no fee-webhook endpoint found — creating one"
    );
    try {
      const created = await stripe.webhookEndpoints.create({
        url: expectedUrl,
        enabled_events: REQUIRED_EVENTS,
        description: "LyoDex platform fee payment confirmation",
      });
      logger.warn(
        {
          id: created.id,
          url: created.url,
          secret: created.secret ? "(present — store as STRIPE_WEBHOOK_SECRET)" : "(missing)",
        },
        "Stripe webhook sync: new endpoint created. " +
          "IMPORTANT: copy the signing secret from the 'secret' field above " +
          "and save it as STRIPE_WEBHOOK_SECRET in the Replit Secrets panel. " +
          "The secret is only shown once."
      );
      if (created.secret) {
        logger.warn({ STRIPE_WEBHOOK_SECRET: created.secret }, "New Stripe webhook signing secret");
        await upsertWebhookSecretAlert(created.secret, created.id, created.url);
      }
    } catch (err) {
      logger.warn({ err, expectedUrl }, "Stripe webhook sync: failed to create webhook endpoint");
    }
    return;
  }

  if (feeEndpoint.url === expectedUrl) {
    logger.info(
      { id: feeEndpoint.id, url: feeEndpoint.url },
      "Stripe webhook sync: endpoint URL is current — no update needed"
    );
    return;
  }

  logger.info(
    { id: feeEndpoint.id, oldUrl: feeEndpoint.url, newUrl: expectedUrl },
    "Stripe webhook sync: domain has changed — updating endpoint URL"
  );

  try {
    const updated = await stripe.webhookEndpoints.update(feeEndpoint.id, {
      url: expectedUrl,
      enabled_events: REQUIRED_EVENTS,
      ...(feeEndpoint.status === "disabled" ? { disabled: false } : {}),
    });
    logger.info(
      { id: updated.id, url: updated.url, status: updated.status },
      "Stripe webhook sync: endpoint URL updated successfully. " +
        "The signing secret (STRIPE_WEBHOOK_SECRET) is unchanged."
    );
  } catch (err) {
    logger.warn(
      { err, id: feeEndpoint.id, expectedUrl },
      "Stripe webhook sync: failed to update webhook endpoint URL — " +
        "fee-webhook events may not be delivered until the URL is corrected"
    );
  }
}
