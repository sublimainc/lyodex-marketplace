/**
 * syncStripeConnectWebhook
 *
 * On server startup, checks whether the Stripe Connect thin-event webhook
 * endpoint is registered at the current REPLIT_DOMAINS domain. If the domain
 * has changed (e.g. after a deployment or repl rename), the old URL is stale
 * and Stripe will not deliver operator onboarding status events.
 *
 * Strategy:
 *  1. Derive the expected URL from REPLIT_DOMAINS.
 *  2. List all Stripe webhook endpoints (up to 100).
 *  3. Find any Connect endpoint (connect === true) whose URL ends with
 *     "/api/stripe/connect-webhook".
 *  4a. If found and URL already matches → nothing to do.
 *  4b. If found but URL differs → UPDATE the endpoint URL in place.
 *      The signing secret is preserved, so STRIPE_CONNECT_WEBHOOK_SECRET
 *      stays valid. If the update fails, write a system alert.
 *  4c. If not found → log a detailed warning and write a system alert to the
 *      DB so the admin panel shows an actionable warning. The Connect
 *      thin-event webhook must be registered manually in Stripe Dashboard →
 *      Webhooks → Connected accounts because it uses v2 thin-event payload
 *      style which is not yet configurable via the REST API.
 *  5. Any error is logged as a warning but never throws (server keeps starting).
 */

import Stripe from "stripe";
import { logger } from "./logger";
import { db } from "@workspace/db";
import { systemAlertsTable } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getPublicBaseUrl } from "./publicUrl";

const CONNECT_WEBHOOK_PATH = "/api/stripe/connect-webhook";
const CONNECT_MISSING_ALERT_KEY = "stripe_connect_webhook_missing";
const CONNECT_UPDATE_FAILED_ALERT_KEY = "stripe_connect_webhook_update_failed";

const MANUAL_REGISTRATION_STEPS = [
  "1. Open Stripe Dashboard → Developers → Webhooks → Connected accounts.",
  "2. Click 'Add endpoint'.",
  "3. Set the URL to the value shown in this alert.",
  "4. Set the payload style to 'Thin'.",
  "5. Subscribe to events: v2.core.account[requirements].updated, v2.core.account[.recipient].capability_status_updated.",
  "6. Save the endpoint and copy the signing secret.",
  "7. Set STRIPE_CONNECT_WEBHOOK_SECRET in Replit Secrets to the copied value.",
  "8. Restart the API server so it picks up the new secret.",
  "9. Dismiss this alert once done.",
];

async function dismissConnectWebhookAlerts(): Promise<void> {
  try {
    const now = new Date();
    await db
      .update(systemAlertsTable)
      .set({ dismissed_at: now })
      .where(
        inArray(systemAlertsTable.alert_key, [
          CONNECT_MISSING_ALERT_KEY,
          CONNECT_UPDATE_FAILED_ALERT_KEY,
        ])
      );
  } catch (err) {
    logger.warn({ err }, "syncStripeConnectWebhook: failed to auto-dismiss Connect webhook alerts");
  }
}

async function upsertConnectWebhookMissingAlert(expectedUrl: string): Promise<void> {
  try {
    await db
      .update(systemAlertsTable)
      .set({ dismissed_at: new Date() })
      .where(eq(systemAlertsTable.alert_key, CONNECT_MISSING_ALERT_KEY));

    await db.insert(systemAlertsTable).values({
      alert_key: CONNECT_MISSING_ALERT_KEY,
      title: "Stripe Connect webhook not registered",
      message:
        "No Stripe Connect webhook endpoint was found. Operator onboarding status updates " +
        "(account requirements, capability changes) will not be delivered until the endpoint " +
        "is registered manually. This webhook cannot be created via the Stripe API — it must " +
        "be registered in the Stripe Dashboard under Connected accounts.",
      metadata: {
        expected_url: expectedUrl,
        instructions: MANUAL_REGISTRATION_STEPS,
      },
      dismissed_at: null,
    });
  } catch (err) {
    logger.warn({ err }, "syncStripeConnectWebhook: failed to write missing-endpoint alert to DB");
  }
}

async function upsertConnectWebhookUpdateFailedAlert(
  endpointId: string,
  oldUrl: string,
  expectedUrl: string,
  error: unknown,
): Promise<void> {
  try {
    await db
      .update(systemAlertsTable)
      .set({ dismissed_at: new Date() })
      .where(eq(systemAlertsTable.alert_key, CONNECT_UPDATE_FAILED_ALERT_KEY));

    await db.insert(systemAlertsTable).values({
      alert_key: CONNECT_UPDATE_FAILED_ALERT_KEY,
      title: "Stripe Connect webhook URL could not be updated",
      message:
        "The domain changed but the Stripe Connect webhook endpoint URL could not be updated " +
        "automatically. Operator onboarding status events will be delivered to the old URL, " +
        "which is no longer valid. Update the endpoint URL manually in the Stripe Dashboard.",
      metadata: {
        endpoint_id: endpointId,
        old_url: oldUrl,
        expected_url: expectedUrl,
        error: String(error),
        instructions: [
          "1. Open Stripe Dashboard → Developers → Webhooks → Connected accounts.",
          `2. Find the endpoint with ID: ${endpointId} (currently pointing to the old URL).`,
          "3. Edit the endpoint and set the URL to the value shown in 'expected_url' above.",
          "4. Save. The signing secret (STRIPE_CONNECT_WEBHOOK_SECRET) remains unchanged.",
          "5. Dismiss this alert once done.",
        ],
      },
      dismissed_at: null,
    });
  } catch (err) {
    logger.warn({ err }, "syncStripeConnectWebhook: failed to write update-failed alert to DB");
  }
}

export async function syncStripeConnectWebhook(stripe: Stripe): Promise<void> {
  // Auto-registration only makes sense against a real public origin; a
  // localhost base URL would register an endpoint Stripe can never reach.
  let baseUrl: string;
  try {
    baseUrl = getPublicBaseUrl();
  } catch {
    logger.debug("Public base URL unavailable — skipping Stripe Connect webhook sync");
    return;
  }
  if (!baseUrl.startsWith("https://")) {
    logger.debug({ baseUrl }, "Non-HTTPS base URL — skipping Stripe Connect webhook sync");
    return;
  }

  const expectedUrl = `${baseUrl}${CONNECT_WEBHOOK_PATH}`;

  let endpoints: Stripe.WebhookEndpoint[];
  try {
    const list = await stripe.webhookEndpoints.list({ limit: 100 });
    endpoints = list.data;
  } catch (err) {
    logger.warn({ err }, "Stripe Connect webhook sync: failed to list webhook endpoints");
    return;
  }

  const connectEndpoint = endpoints.find((wh) =>
    wh.url.endsWith(CONNECT_WEBHOOK_PATH)
  );

  if (!connectEndpoint) {
    logger.warn(
      { expectedUrl },
      "Stripe Connect webhook sync: no Connect webhook endpoint found at " +
        CONNECT_WEBHOOK_PATH +
        ". Register it manually in Stripe Dashboard → Webhooks → " +
        "Connected accounts with payload style 'Thin' and events: " +
        "v2.core.account[requirements].updated, " +
        "v2.core.account[.recipient].capability_status_updated. " +
        `Set the URL to: ${expectedUrl}`
    );
    await upsertConnectWebhookMissingAlert(expectedUrl);
    return;
  }

  if (connectEndpoint.url === expectedUrl) {
    logger.info(
      { id: connectEndpoint.id, url: connectEndpoint.url },
      "Stripe Connect webhook sync: endpoint URL is current — no update needed"
    );
    await dismissConnectWebhookAlerts();
    return;
  }

  logger.info(
    { id: connectEndpoint.id, oldUrl: connectEndpoint.url, newUrl: expectedUrl },
    "Stripe Connect webhook sync: domain has changed — updating endpoint URL"
  );

  try {
    const updated = await stripe.webhookEndpoints.update(connectEndpoint.id, {
      url: expectedUrl,
      ...(connectEndpoint.status === "disabled" ? { disabled: false } : {}),
    });
    logger.info(
      { id: updated.id, url: updated.url, status: updated.status },
      "Stripe Connect webhook sync: endpoint URL updated successfully. " +
        "The signing secret (STRIPE_CONNECT_WEBHOOK_SECRET) is unchanged."
    );
    await dismissConnectWebhookAlerts();
  } catch (err) {
    logger.warn(
      { err, id: connectEndpoint.id, expectedUrl },
      "Stripe Connect webhook sync: failed to update endpoint URL — " +
        "Connect webhook events may not be delivered until the URL is corrected"
    );
    await upsertConnectWebhookUpdateFailedAlert(
      connectEndpoint.id,
      connectEndpoint.url,
      expectedUrl,
      err,
    );
  }
}
