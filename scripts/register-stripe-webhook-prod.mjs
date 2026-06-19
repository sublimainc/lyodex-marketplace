#!/usr/bin/env node
/**
 * Register (or update) the LyoDex fee-webhook endpoint in Stripe for PRODUCTION.
 *
 * Run this script once after deploying to lyodex.com to register the production
 * webhook endpoint. The signing secret it prints must be stored as
 * STRIPE_WEBHOOK_SECRET in the Replit Secrets panel (production environment).
 *
 * Usage (inside Replit workspace after deployment):
 *   node scripts/register-stripe-webhook-prod.mjs
 *
 * Usage (with an explicit live-mode Stripe key):
 *   STRIPE_SECRET_KEY=sk_live_... node scripts/register-stripe-webhook-prod.mjs
 *
 * Usage (with a custom production domain override):
 *   PROD_DOMAIN=my-custom-domain.com node scripts/register-stripe-webhook-prod.mjs
 *
 * The script:
 *   1. Resolves Stripe credentials — production connector or STRIPE_SECRET_KEY env var
 *   2. Targets the fixed production URL: https://lyodex.com/api/stripe/fee-webhook
 *      (override via PROD_DOMAIN if the production domain differs)
 *   3. Lists existing webhook endpoints — skips creation if URL already registered
 *   4. Creates the endpoint and prints the signing secret to store as STRIPE_WEBHOOK_SECRET
 *
 * Events subscribed: checkout.session.completed
 */

const PROD_DOMAIN = process.env.PROD_DOMAIN ?? "lyodex.com";
const WEBHOOK_URL = `https://${PROD_DOMAIN}/api/stripe/fee-webhook`;
const REQUIRED_EVENTS = ["checkout.session.completed"];

async function getStripeSecretKey() {
  if (process.env.STRIPE_SECRET_KEY) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key.startsWith("sk_live_")) {
      console.warn(
        `Warning: STRIPE_SECRET_KEY does not look like a live-mode key (expected sk_live_...).` +
          `\nMake sure you are using the production Stripe key.`
      );
    }
    return key;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) {
    console.error(
      "Error: cannot resolve Stripe credentials.\n" +
        "Either run inside the Replit workspace (REPLIT_CONNECTORS_HOSTNAME must be set)\n" +
        "or set STRIPE_SECRET_KEY directly as an environment variable."
    );
    process.exit(1);
  }

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set("include_secrets", "true");
  url.searchParams.set("connector_names", "stripe");
  url.searchParams.set("environment", "production");

  const resp = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "X-Replit-Token": xReplitToken,
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!resp.ok) {
    console.error(`Error: Replit connector request failed: ${resp.status} ${resp.statusText}`);
    process.exit(1);
  }

  const data = await resp.json();
  const secret = data.items?.[0]?.settings?.secret;

  if (!secret) {
    console.error(
      "Error: Stripe integration not connected or missing secret key.\n" +
        "Connect Stripe via the Integrations tab in Replit and ensure the\n" +
        "production environment has a live-mode key configured."
    );
    process.exit(1);
  }

  if (!secret.startsWith("sk_live_")) {
    console.warn(
      `Warning: Stripe key resolved from connector does not look like a live-mode key.\n` +
        `Got prefix: ${secret.slice(0, 12)}...\n` +
        `Make sure the Stripe integration is configured with a live-mode key for production.`
    );
  }

  return secret;
}

async function stripeGet(secretKey, path) {
  const resp = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  if (!resp.ok) throw new Error(`Stripe GET ${path} → ${resp.status} ${resp.statusText}`);
  return resp.json();
}

async function stripePost(secretKey, path, body) {
  const resp = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`Stripe POST ${path} → ${resp.status}: ${JSON.stringify(err.error ?? err)}`);
  }
  return resp.json();
}

async function stripePatch(secretKey, path, body) {
  const resp = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`Stripe PATCH ${path} → ${resp.status}: ${JSON.stringify(err.error ?? err)}`);
  }
  return resp.json();
}

console.log("=== LyoDex production webhook registration ===");
console.log(`Target URL: ${WEBHOOK_URL}\n`);

const stripeSecretKey = await getStripeSecretKey();

const list = await stripeGet(stripeSecretKey, "/webhook_endpoints?limit=100");

const existing = list.data?.find((wh) => wh.url === WEBHOOK_URL);
if (existing) {
  console.log("Webhook already registered.");
  console.log(`  ID:     ${existing.id}`);
  console.log(`  Status: ${existing.status}`);
  console.log(`  Events: ${existing.enabled_events?.join(", ")}`);

  const missingEvents = REQUIRED_EVENTS.filter(
    (e) => !existing.enabled_events?.includes(e)
  );
  const needsEnable = existing.status === "disabled";

  if (missingEvents.length > 0 || needsEnable) {
    console.log("\nWebhook needs updating — applying fixes...");
    const updateBody = {};
    if (needsEnable) updateBody.disabled = "false";
    for (const ev of REQUIRED_EVENTS) updateBody["enabled_events[]"] = ev;

    await stripePatch(stripeSecretKey, `/webhook_endpoints/${existing.id}`, updateBody);
    console.log("  Updated: events and status corrected.");
  } else {
    console.log("\nWebhook is correctly configured — no changes needed.");
  }

  console.log(
    "\nNote: The signing secret is only shown at creation time.\n" +
      "If you need to rotate it, delete the webhook in the Stripe dashboard\n" +
      "(https://dashboard.stripe.com/webhooks) and re-run this script."
  );
  process.exit(0);
}

console.log("No existing webhook for this URL — creating...");

const webhook = await stripePost(stripeSecretKey, "/webhook_endpoints", {
  url: WEBHOOK_URL,
  "enabled_events[]": "checkout.session.completed",
  description: "LyoDex platform fee payment confirmation (production)",
});

console.log(`\nWebhook created successfully!`);
console.log(`  ID:     ${webhook.id}`);
console.log(`  URL:    ${webhook.url}`);
console.log(`  Status: ${webhook.status}`);
console.log(`\n${"=".repeat(60)}`);
console.log("ACTION REQUIRED — store this in Replit Secrets immediately:");
console.log(`  Secret name : STRIPE_WEBHOOK_SECRET`);
console.log(`  Secret value: ${webhook.secret}`);
console.log("=".repeat(60));
console.log("\nThis signing secret is shown only once.");
console.log("Paste it into the Replit Secrets panel (production environment).");
console.log("The app will refuse webhook calls without a valid signature in production.");
