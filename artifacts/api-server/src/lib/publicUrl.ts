/**
 * The public base URL of this deployment.
 *
 * Every absolute URL the server hands out — email links, Stripe success/cancel
 * redirects, Connect onboarding return URLs — must come from here. Previously
 * each call site read `REPLIT_DOMAINS` directly, which meant that off Replit
 * they all silently fell back to a hardcoded default and produced links
 * pointing at the wrong host.
 *
 * Resolution order:
 *   1. `PUBLIC_APP_URL`  — explicit, portable, wins everywhere. Set this.
 *   2. `REPLIT_DOMAINS`  — injected by Replit; keeps existing deploys working.
 *   3. `PROD_DOMAIN`     — used by the webhook registration scripts.
 *   4. `http://localhost:${PORT}` in development, so local runs are usable.
 *
 * In production with none of the above set, this throws rather than emitting
 * links to a host that is not ours.
 */

let cached: string | null = null;

function resolve(): string {
  const explicit = process.env.PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const replitDomain = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim();
  if (replitDomain) return `https://${replitDomain}`;

  const prodDomain = process.env.PROD_DOMAIN?.trim();
  if (prodDomain) return `https://${prodDomain}`;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "PUBLIC_APP_URL is required in production. Set it to the public origin of " +
        "this deployment (e.g. https://lyodex.com) so email links and Stripe " +
        "redirects point at the right host.",
    );
  }

  return `http://localhost:${process.env.PORT ?? "3000"}`;
}

export function getPublicBaseUrl(): string {
  cached ??= resolve();
  return cached;
}

/** Absolute URL for a path on this deployment. `path` should start with "/". */
export function publicUrl(path: string): string {
  return `${getPublicBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
