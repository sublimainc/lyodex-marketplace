# LyoDex

A B2B marketplace connecting buyers with freeze-drying (lyophilization) operators in Canada and the USA. Buyers submit requests, operators browse and bid, and contracts are managed through the platform.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at /api)
- `pnpm --filter @workspace/lyodex run dev` — run the frontend (Vite, proxied at /)
- `pnpm run typecheck` — full typecheck across all packages (set `BUILD_MOBILE=false` to also skip the mobile `tsc` step in CI/headless environments)
- `pnpm run build` — typecheck + build all packages (set `BUILD_MOBILE=false` to skip the mobile bundle step and typecheck in CI/headless environments)
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/db run push-force` — same but non-interactive (used by post-merge script)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS v4 + wouter routing + shadcn/ui
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/` — Drizzle schema: operators, requests, bids, activity
- `artifacts/lyodex/src/pages/` — Frontend pages (Home, Operators, Requests, Dashboard, Login, etc.)
- `artifacts/api-server/src/routes/` — Express routes: operators, requests, bids, dashboard

## Architecture decisions

- Contract-first: OpenAPI spec gates codegen which gates the frontend
- All API routes use Zod schemas generated from the OpenAPI spec for validation
- Frontend uses generated React Query hooks from `@workspace/api-client-react`
- No auth implemented yet — login page is mock/demo only (buyer@lyodex.ca / demo123)
- Seed data: 8 operators, 7 requests, 8 bids, 10 activity items

## Schema sync (prevents "missing column" crashes)

Two complementary safeguards keep the live database in sync with the Drizzle schema:

1. **Post-merge script** (`scripts/post-merge.sh`) — runs `drizzle-kit push --force` automatically after every task merge so new tables/columns are applied before the server restarts. This is the primary protection.

2. **Startup schema check** (`artifacts/api-server/src/lib/schemaCheck.ts`) — on every server boot, queries `information_schema.tables` and logs a `WARN` for any tables in the Drizzle schema that are absent from the database. The server still starts (non-fatal), but the drift is clearly visible in logs. To fix: `pnpm --filter @workspace/db run push-force`.

If a column (not a whole table) goes missing, the startup warning won't catch it — run `pnpm --filter @workspace/db run push-force` manually to reconcile.

## Product

**LyoDex** is a procurement marketplace for lyophilization (freeze-drying) services:
- **Buyers** (pharma, food, biotech companies) submit requests specifying material type, quantity, deadline, and budget
- **Operators** (freeze-dry facilities) browse requests and submit competitive bids
- **Marketplace** shows real-time bid activity with certifications (GMP, HACCP, FDA, Organic, ISO) and ratings
- **Dashboard** shows network health: active operators, live requests, completed contracts, avg pricing

## User preferences

- App name: LyoDex
- Brand colors: deep teal (#0F6E56 primary) + carbon neutrals
- Font: Inter
- Bilingual EN/FR noted in docs (not yet implemented)
- No emojis in UI

## Deployment

### Email addresses

| Address | Purpose | Used by |
|---|---|---|
| `info@lyodex.com` | General inquiries, marketing | Footer contact column |
| `support@lyodex.com` | Buyer & operator transactional mail | New bid notifications, fee receipts |
| `dispute@lyodex.com` | Dispute case confirmation & resolution | Dispute opened/resolved emails to buyers |
| `audit@lyodex.com` | Internal admin alerts & audit events | Admin alert emails, fallback ADMIN_EMAIL |

All four addresses are clickable `mailto:` links in the site footer. Outbound email requires SMTP secrets (see below).

### Production Secrets (required before publishing)

These secrets must be set in the **Replit Secrets** panel before the first deployment:

| Secret | Description |
|---|---|
| `JWT_SECRET` | 96-char random hex string — set ✓ (generates one at startup in dev, required in prod) |
| `DATABASE_URL` | PostgreSQL connection string — set ✓ (Replit-managed DB) |
| `STRIPE_SECRET_KEY` | Set via the Stripe integration in the Integrations tab |
| `STRIPE_PUBLISHABLE_KEY` | Set via the Stripe integration |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret — **dev**: run `node scripts/register-stripe-webhook.mjs`; **prod**: run `node scripts/register-stripe-webhook-prod.mjs` after deploying to lyodex.com |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Connect thin-event webhook secret — register `/api/stripe/connect-webhook` in Stripe Dashboard → Webhooks → Connected accounts (payload style: Thin, events: `v2.core.account[requirements].updated`, `v2.core.account[.recipient].capability_status_updated`) |
| `SMTP_HOST` | SMTP server hostname (e.g. `smtp.gmail.com`, `smtp.sendgrid.net`) |
| `SMTP_PORT` | SMTP port — `587` (STARTTLS, default) or `465` (SSL) |
| `SMTP_USER` | SMTP login username (often the sending email address) |
| `SMTP_PASS` | SMTP password or app-specific password |
| `ADMIN_EMAIL` | Override for admin alert destination — defaults to `audit@lyodex.com` |

### Publishing to lyodex.com

1. **Click Publish** in the Replit UI (Deploy tab). Build command: `pnpm run build`.
   The API server starts via `node --enable-source-maps artifacts/api-server/dist/index.mjs`.
   The frontend is served as a static site from `artifacts/lyodex/dist/public/`.

2. **Add the custom domain** — In Replit Deployments → Settings → Custom Domains:
   - Add `lyodex.com` (apex)
   - Add `www.lyodex.com` (www subdomain)
   - Replit will provide a CNAME target (e.g. `<repl-id>.replit.app`)

3. **Configure DNS at your registrar**:
   - For `www`: add a `CNAME` record pointing to the Replit-provided target
   - For the apex (`lyodex.com`): your registrar may require an `A` record or `ALIAS`/`ANAME` record — use the IP or alias Replit provides
   - TTL: 300–3600 seconds; propagation typically takes 5–60 minutes

4. **Register the production Stripe webhook** (first deploy only, or after a domain change):
   ```
   node scripts/register-stripe-webhook-prod.mjs
   ```
   Copy the printed signing secret into Replit Secrets as `STRIPE_WEBHOOK_SECRET`.
   The script targets `https://lyodex.com/api/stripe/fee-webhook` and is idempotent —
   safe to re-run; it skips creation if the endpoint already exists.
   To use a different production domain, set `PROD_DOMAIN=your-domain.com` before running.

5. **Verify the deployment**:
   - `https://lyodex.com` — should load the LyoDex marketplace
   - `https://lyodex.com/api/healthz` — should return `{"ok":true}`
   - HTTPS (TLS) is provisioned automatically by Replit once DNS resolves

6. **Verify the Stripe webhook** (run after step 4 and DNS resolves):
   ```
   node scripts/verify-stripe-webhook.mjs
   ```
   This script checks:
   - The webhook URL is registered in Stripe and set to `enabled`
   - All required events (`checkout.session.completed`) are subscribed
   - The production server responds at `/api/stripe/fee-webhook-health` (expects 401 without auth — confirms the route is reachable)

   For a full health report including whether `STRIPE_WEBHOOK_SECRET` is loaded, log into LyoDex as admin and call:
   ```
   GET /api/stripe/fee-webhook-health   (admin session cookie required)
   ```
   Response fields: `ok`, `secret_loaded`, `endpoint_status`, `enabled_events`, `message`.

### Artifact production config

| Artifact | Build | Serve |
|---|---|---|
| `lyodex` (web) | `pnpm --filter @workspace/lyodex run build` | Static, `artifacts/lyodex/dist/public/` |
| `api-server` | `pnpm --filter @workspace/api-server run build` | `node artifacts/api-server/dist/index.mjs` |

## Gotchas

- postcss.config.mjs in .migration-backup conflicts with Tailwind v4 — do not copy it
- Original upload had no source code, only config/docs — frontend was built from documentation
- `pnpm dev` at workspace root has no script — run per-artifact with --filter
- Vite configs require `PORT` env var at dev time but skip that check during `vite build`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
