import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

/**
 * Stripe credential resolution.
 *
 * Two sources, in priority order:
 *
 *   1. `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` environment variables.
 *      This is the portable path and works on any host (Docker, Fly, Render,
 *      a VPS, …). Set these and Replit is not involved at all.
 *
 *   2. The Replit Connectors API, used only when the env vars are absent and
 *      the Replit runtime variables are present.
 *
 * Env vars win so that moving off Replit is a configuration change, not a code
 * change, and so a stale Replit connector can never silently override the keys
 * an operator explicitly configured.
 */

interface StripeCredentials {
  secretKey: string;
  publishableKey: string;
}

function credentialsFromEnv(): StripeCredentials | null {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY?.trim();
  if (!secretKey) return null;

  // The publishable key is only needed by the browser checkout flow. Missing it
  // is not fatal on the server, but it is worth surfacing loudly once.
  if (!publishableKey) {
    console.warn(
      "[stripe] STRIPE_SECRET_KEY is set but STRIPE_PUBLISHABLE_KEY is not — " +
        "client-side Stripe flows will fail until it is provided.",
    );
  }
  return { secretKey, publishableKey: publishableKey ?? "" };
}

async function credentialsFromReplitConnector(): Promise<StripeCredentials> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error(
      "Stripe is not configured. Set STRIPE_SECRET_KEY (and STRIPE_PUBLISHABLE_KEY) " +
        "in the environment, or connect the Stripe integration when running on Replit.",
    );
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
    throw new Error(`Failed to fetch Stripe credentials: ${resp.status} ${resp.statusText}`);
  }

  const data = (await resp.json()) as {
    items?: Array<{ settings?: { secret?: string; publishable?: string } }>;
  };
  const settings = data.items?.[0]?.settings;

  if (!settings?.secret || !settings?.publishable) {
    throw new Error(
      "Stripe integration not connected or missing keys. Connect Stripe via the Integrations tab, " +
        "or set STRIPE_SECRET_KEY / STRIPE_PUBLISHABLE_KEY directly.",
    );
  }

  return { secretKey: settings.secret, publishableKey: settings.publishable };
}

async function getStripeCredentials(): Promise<StripeCredentials> {
  return credentialsFromEnv() ?? (await credentialsFromReplitConnector());
}

/** True when Stripe keys come from the environment rather than a Replit connector. */
export function isStripeConfiguredFromEnv(): boolean {
  return credentialsFromEnv() !== null;
}

// When credentials come from env vars they are stable for the process lifetime,
// so the client is reused. Replit connector tokens rotate, so that path keeps
// constructing a fresh client per call — hence the name.
let envStripeClient: Stripe | null = null;

export async function getUncachableStripeClient(): Promise<Stripe> {
  const envCreds = credentialsFromEnv();
  if (envCreds) {
    envStripeClient ??= new Stripe(envCreds.secretKey, { apiVersion: "2025-08-27.basil" as any });
    return envStripeClient;
  }
  const { secretKey } = await credentialsFromReplitConnector();
  return new Stripe(secretKey, { apiVersion: "2025-08-27.basil" as any });
}

export async function getStripePublishableKey(): Promise<string> {
  const { publishableKey } = await getStripeCredentials();
  return publishableKey;
}

let stripeSync: StripeSync | null = null;

export async function getStripeSync(): Promise<StripeSync> {
  if (!stripeSync) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL required");
    const { secretKey } = await getStripeCredentials();
    stripeSync = new StripeSync({
      poolConfig: { connectionString: databaseUrl, max: 2 },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
