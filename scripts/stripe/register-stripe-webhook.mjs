#!/usr/bin/env node
/**
 * Register (or update) the LyoDex fee-webhook endpoint in Stripe.
 *
 * This script uses the same Replit connector flow as the API server to obtain
 * Stripe credentials — no manual key export needed when run inside the Replit
 * workspace. If REPLIT_CONNECTORS_HOSTNAME is unavailable (e.g. CI), set
 * STRIPE_SECRET_KEY directly as a fallback.
 *
 * Usage (inside Replit workspace):
 *   node scripts/stripe/register-stripe-webhook.mjs
 *
 * Usage (with explicit key and domain):
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/stripe/register-stripe-webhook.mjs your-domain.replit.dev
 *
 * The script:
 *   1. Resolves Stripe credentials via Replit connector or STRIPE_SECRET_KEY env var
 *   2. Derives the webhook URL from REPLIT_DOMAINS (or argv[2])
 *   3. Lists existing webhook endpoints — skips creation if URL already registered
 *   4. Creates the endpoint and prints the signing secret to store as STRIPE_WEBHOOK_SECRET
 *
 * Events subscribed: checkout.session.completed
 */

async function getStripeSecretKey() {
  if (process.env.STRIPE_SECRET_KEY) {
    return process.env.STRIPE_SECRET_KEY;
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

  const isProduction = process.env.REPLIT_DEPLOYMENT === "1";
  const targetEnvironment = isProduction ? "production" : "development";

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set("include_secrets", "true");
  url.searchParams.set("connector_names", "stripe");
  url.searchParams.set("environment", targetEnvironment);

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
        "Connect Stripe via the Integrations tab in Replit."
    );
    process.exit(1);
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

const stripeSecretKey = await getStripeSecretKey();

const domain = process.env.REPLIT_DOMAINS?.split(",")[0] ?? process.argv[2];
if (!domain) {
  console.error(
    "Error: cannot determine webhook domain.\n" +
      "Either set REPLIT_DOMAINS or pass the domain as the first argument:\n" +
      "  node scripts/stripe/register-stripe-webhook.mjs your-repl.replit.dev"
  );
  process.exit(1);
}

const webhookUrl = `https://${domain}/api/stripe/fee-webhook`;
console.log(`Target webhook URL: ${webhookUrl}`);

const list = await stripeGet(stripeSecretKey, "/webhook_endpoints?limit=20");

const REQUIRED_EVENTS = ["checkout.session.completed"];

const existing = list.data?.find((wh) => wh.url === webhookUrl);
if (existing) {
  console.log(`\nWebhook already registered.`);
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
    "\nNote: The signing secret is only shown at creation time. To rotate it,\n" +
      "delete the webhook in the Stripe dashboard and re-run this script."
  );
  process.exit(0);
}

console.log("No existing webhook for this URL — creating...");

const webhook = await stripePost(stripeSecretKey, "/webhook_endpoints", {
  url: webhookUrl,
  "enabled_events[]": "checkout.session.completed",
  description: "LyoDex platform fee payment confirmation",
});

console.log(`\nWebhook created successfully!`);
console.log(`  ID:     ${webhook.id}`);
console.log(`  URL:    ${webhook.url}`);
console.log(`  Status: ${webhook.status}`);
console.log(`\nSigning secret — copy this into Replit Secrets as STRIPE_WEBHOOK_SECRET:`);
console.log(`  ${webhook.secret}`);
console.log("\nThis secret is only shown once. Store it immediately in the Replit Secrets panel.");
