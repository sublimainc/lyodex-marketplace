#!/usr/bin/env node
/**
 * Integration test: verify the fee-webhook signature verification path.
 *
 * Requires:
 *   - API server running locally (default: http://localhost:18080)
 *   - STRIPE_WEBHOOK_SECRET set (fails fast if missing)
 *
 * Usage:
 *   STRIPE_WEBHOOK_SECRET=whsec_... API_BASE=http://localhost:18080 \
 *     node scripts/test-fee-webhook-signature.mjs
 *
 * Exit codes:
 *   0 — all assertions passed
 *   1 — prerequisite missing or one or more assertions failed
 */

import crypto from "node:crypto";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!webhookSecret) {
  console.error(
    "Error: STRIPE_WEBHOOK_SECRET is not set.\n" +
      "This test requires the webhook signing secret to verify the constructEvent path.\n" +
      "Set it via Replit Secrets or export it before running this script."
  );
  process.exit(1);
}

const apiBase = process.env.API_BASE ?? "http://localhost:18080";
const endpoint = `${apiBase}/api/stripe/fee-webhook`;

let passed = 0;
let failed = 0;

function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

function buildStripeSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signed = `${timestamp}.${payload}`;
  const sig = crypto.createHmac("sha256", secret).update(signed).digest("hex");
  return `t=${timestamp},v1=${sig}`;
}

console.log(`\nFee-webhook signature verification tests`);
console.log(`Endpoint: ${endpoint}`);
console.log("");

// ─── Test 1: Missing stripe-signature header → 400 ───────────────────────────
{
  const resp = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "checkout.session.completed", data: { object: {} } }),
  });
  assert(
    "Missing stripe-signature header → HTTP 400",
    resp.status === 400,
    `got ${resp.status}`
  );
  const body = await resp.json();
  assert(
    "Missing stripe-signature error message present",
    typeof body.error === "string" && body.error.length > 0,
    JSON.stringify(body)
  );
}

// ─── Test 2: Invalid/tampered signature → 400 ────────────────────────────────
{
  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": "t=1234567890,v1=invalidsignature",
    },
    body: JSON.stringify({ type: "checkout.session.completed", data: { object: {} } }),
  });
  assert(
    "Invalid stripe-signature → HTTP 400",
    resp.status === 400,
    `got ${resp.status}`
  );
}

// ─── Test 3: Valid HMAC signature → 200 ──────────────────────────────────────
{
  const payload = JSON.stringify({
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_integration_check",
        payment_status: "paid",
        metadata: {},
      },
    },
  });
  const sig = buildStripeSignature(payload, webhookSecret);

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": sig,
    },
    body: payload,
  });
  assert(
    "Valid HMAC-signed payload → HTTP 200",
    resp.status === 200,
    `got ${resp.status}`
  );
  const body = await resp.json();
  assert(
    "Valid payload response contains received:true",
    body.received === true,
    JSON.stringify(body)
  );
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log("");
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
