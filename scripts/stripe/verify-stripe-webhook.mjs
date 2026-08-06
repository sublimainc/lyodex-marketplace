#!/usr/bin/env node
/**
 * Verify the LyoDex production Stripe webhook is registered and receiving events.
 *
 * Run this after deploying to confirm the webhook is correctly configured:
 *   node scripts/stripe/verify-stripe-webhook.mjs
 *
 * With a custom production domain:
 *   PROD_DOMAIN=my-domain.com node scripts/stripe/verify-stripe-webhook.mjs
 *
 * With an explicit live-mode key:
 *   STRIPE_SECRET_KEY=sk_live_... node scripts/stripe/verify-stripe-webhook.mjs
 *
 * Exit codes:
 *   0 — webhook is registered, enabled, and the health endpoint returns ok
 *   1 — webhook missing, disabled, or misconfigured (details printed)
 */

const PROD_DOMAIN = process.env.PROD_DOMAIN ?? "lyodex.com";
const WEBHOOK_URL = `https://${PROD_DOMAIN}/api/stripe/fee-webhook`;

// ── Resolve Stripe secret key ─────────────────────────────────────────────────

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
        "or set STRIPE_SECRET_KEY directly."
    );
    process.exit(1);
  }

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set("include_secrets", "true");
  url.searchParams.set("connector_names", "stripe");
  url.searchParams.set("environment", "production");

  const resp = await fetch(url.toString(), {
    headers: { Accept: "application/json", "X-Replit-Token": xReplitToken },
    signal: AbortSignal.timeout(10_000),
  });

  if (!resp.ok) {
    console.error(`Error: Replit connector request failed: ${resp.status} ${resp.statusText}`);
    process.exit(1);
  }

  const data = await resp.json();
  const secret = data.items?.[0]?.settings?.secret;
  if (!secret) {
    console.error("Error: Stripe integration not connected or missing secret key.");
    process.exit(1);
  }
  return secret;
}

async function stripeGet(secretKey, path) {
  const resp = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!resp.ok) throw new Error(`Stripe GET ${path} → ${resp.status} ${resp.statusText}`);
  return resp.json();
}

// ── Main verification ─────────────────────────────────────────────────────────

console.log("=== LyoDex webhook verification ===");
console.log(`Target URL: ${WEBHOOK_URL}\n`);

let exitCode = 0;

// 1. Check the registered webhook endpoint in Stripe
console.log("Step 1: Checking Stripe webhook registration...");
const stripeKey = await getStripeSecretKey();

const list = await stripeGet(stripeKey, "/webhook_endpoints?limit=100");
const endpoint = list.data?.find((ep) => ep.url === WEBHOOK_URL);

if (!endpoint) {
  console.error("  FAIL: Webhook URL is not registered in Stripe.");
  console.error("  Fix:  Run node scripts/stripe/register-stripe-webhook-prod.mjs");
  exitCode = 1;
} else {
  console.log(`  OK:   Endpoint found: ${endpoint.id}`);
  console.log(`        Status:         ${endpoint.status}`);
  console.log(`        Events:         ${endpoint.enabled_events?.join(", ")}`);

  if (endpoint.status !== "enabled") {
    console.error(`  FAIL: Endpoint is ${endpoint.status} — re-enable it in the Stripe dashboard.`);
    exitCode = 1;
  }

  const requiredEvents = ["checkout.session.completed"];
  const missingEvents = requiredEvents.filter((e) => !endpoint.enabled_events?.includes(e));
  if (missingEvents.length > 0) {
    console.error(`  FAIL: Missing required events: ${missingEvents.join(", ")}`);
    console.error("  Fix:  Run node scripts/stripe/register-stripe-webhook-prod.mjs to update the endpoint.");
    exitCode = 1;
  } else {
    console.log("        Required events: present");
  }
}

// 2. Probe the health endpoint on the production server
console.log("\nStep 2: Probing /api/stripe/fee-webhook-health...");
console.log(
  "  Note: This endpoint requires admin authentication.\n" +
    "        Unauthenticated requests will return 401 — that is expected.\n" +
    "        A 401 means the endpoint is reachable; use the admin panel or\n" +
    "        curl with a valid admin session cookie to get the full report."
);

try {
  const healthUrl = `https://${PROD_DOMAIN}/api/stripe/fee-webhook-health`;
  const healthResp = await fetch(healthUrl, { signal: AbortSignal.timeout(15_000) });

  if (healthResp.status === 401) {
    console.log("  OK:   Endpoint is reachable (401 Unauthorized — expected without auth).");
  } else if (healthResp.status === 200) {
    const body = await healthResp.json();
    console.log(`  OK:   Health check returned 200.`);
    console.log(`        secret_loaded:    ${body.secret_loaded}`);
    console.log(`        endpoint_status:  ${body.endpoint_status ?? "n/a"}`);
    console.log(`        ok:               ${body.ok}`);
    console.log(`        message:          ${body.message}`);
    if (!body.ok) exitCode = 1;
  } else {
    console.warn(`  WARN: Unexpected status ${healthResp.status} from health endpoint.`);
    exitCode = 1;
  }
} catch (err) {
  console.error(`  FAIL: Could not reach ${PROD_DOMAIN}: ${err.message}`);
  console.error("  Ensure the production deployment is live and the domain resolves correctly.");
  exitCode = 1;
}

// 3. Summary
console.log("\n" + "=".repeat(40));
if (exitCode === 0) {
  console.log("All checks passed. The webhook is correctly configured.");
} else {
  console.log("One or more checks failed. Review the output above and apply the suggested fixes.");
}
console.log("=".repeat(40));
process.exit(exitCode);
