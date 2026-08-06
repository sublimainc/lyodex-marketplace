# Deploying LyoDex outside Replit

LyoDex runs as a single Node process that serves both the JSON API and the
built web SPA. It needs PostgreSQL, and optionally SMTP (email) and a Google
Cloud Storage bucket (operator certification documents).

Nothing below requires Replit. Existing Replit deployments keep working
unchanged — the Replit-specific paths are fallbacks that only activate when the
portable environment variables are absent.

---

## 1. What Replit was providing, and what replaces it

| Replit feature | Portable replacement | Set via |
|---|---|---|
| Stripe integration (connector API) | Stripe keys read straight from the environment | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` |
| Object-storage sidecar (`127.0.0.1:1106`) | A Google Cloud Storage service account | `GCS_SERVICE_ACCOUNT_KEY` or `GOOGLE_APPLICATION_CREDENTIALS` |
| `REPLIT_DOMAINS` (public hostname) | Explicit public origin | `PUBLIC_APP_URL` |
| Replit Secrets panel | `.env` file, container secrets, or your host's secret manager | — |
| Replit Postgres | Any PostgreSQL 14+ instance | `DATABASE_URL` |

`PUBLIC_APP_URL` matters more than it looks: every email link and every Stripe
success/cancel/return URL is built from it. Set it wrong and payments redirect
to the wrong host. In production the server refuses to start if it cannot
determine a public origin.

The `@replit/vite-plugin-*` packages are dev-only and are loaded dynamically —
you can remove them from `artifacts/lyodex/package.json` without breaking the
build.

---

## 2. Quick start with Docker Compose

```bash
cp .env.example .env
# Fill in at minimum: JWT_SECRET, POSTGRES_PASSWORD, PUBLIC_APP_URL,
# STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY

docker compose up --build
```

Then apply the database schema once:

```bash
corepack pnpm install
DATABASE_URL=postgresql://lyodex:<password>@localhost:5432/lyodex \
  corepack pnpm --filter @workspace/db run push
```

The app is on `http://localhost:8080`; `GET /api/healthz` should return
`{"status":"ok"}`.

---

## 3. Deploying without Docker

```bash
corepack pnpm install --frozen-lockfile
BUILD_MOBILE=false corepack pnpm run build
node --enable-source-maps artifacts/api-server/dist/index.mjs
```

Run it from the repository root: the server resolves the SPA at
`artifacts/lyodex/dist/public` relative to the working directory.

`node_modules` must be present at runtime — the server bundle deliberately
leaves some packages external (nodemailer, `@google-cloud/*`, native modules).

Put a reverse proxy (nginx, Caddy, or your platform's router) in front for TLS.
The app expects to receive `X-Forwarded-*` headers; `trust proxy` is already
configured so rate limiting and IP logging see the real client address.

---

## 4. Generating secrets

```bash
# JWT_SECRET — rotating this invalidates every existing session
openssl rand -hex 48
```

---

## 5. Stripe setup

Two webhook endpoints must exist in the Stripe dashboard:

| Endpoint | Events | Payload style |
|---|---|---|
| `https://<your-domain>/api/stripe/fee-webhook` | `checkout.session.completed` | Snapshot (default) |
| `https://<your-domain>/api/stripe/connect-webhook` | `v2.core.account[requirements].updated`, `v2.core.account[.recipient].capability_status_updated` | **Thin** |

Copy each signing secret into `STRIPE_WEBHOOK_SECRET` and
`STRIPE_CONNECT_WEBHOOK_SECRET`.

On boot the server attempts to register the fee webhook automatically when
`PUBLIC_APP_URL` is an HTTPS origin. It skips silently for local/HTTP origins,
since Stripe cannot reach them.

Helper scripts:

```bash
PROD_DOMAIN=your-domain.com node scripts/stripe/register-stripe-webhook-prod.mjs
PROD_DOMAIN=your-domain.com node scripts/stripe/verify-stripe-webhook.mjs
```

---

## 6. Object storage (certification documents)

Create a GCS bucket and a service account with `roles/storage.objectAdmin`
scoped to it, then set:

```
GCS_SERVICE_ACCOUNT_KEY={"type":"service_account", ...}
GCS_PROJECT_ID=your-project
PRIVATE_OBJECT_DIR=/your-bucket/private
PUBLIC_OBJECT_SEARCH_PATHS=/your-bucket/public
```

Certification documents are private: they are served only through the API,
which checks that the requesting operator owns the document (or that the caller
is an admin). Do not make the private prefix publicly readable.

If you skip this, certification upload and retrieval fail; the rest of the
platform is unaffected.

---

## 7. Email

Without SMTP credentials the server starts normally but sends nothing —
bid notifications, password resets, and dispute mail all silently no-op.

Configure SPF, DKIM, and DMARC for the sending domain or mail will land in
spam. Verify with a service such as mail-tester.com before launch.

---

## 8. Pre-launch checklist

- [ ] `JWT_SECRET` set to a fresh 48-byte random value (not shared with any other environment)
- [ ] `PUBLIC_APP_URL` matches the real public origin, including scheme
- [ ] `ALLOWED_ORIGINS` lists every origin the browser uses (apex **and** `www`)
- [ ] Stripe keys are live keys (`sk_live_` / `pk_live_`), not test keys
- [ ] Both Stripe webhooks registered, and their signing secrets set
- [ ] Database schema applied (`pnpm --filter @workspace/db run push`)
- [ ] A real end-to-end payment completed and the escrow row verified in the database
- [ ] Password reset email received and the reset link works
- [ ] `GET /api/healthz` returns `{"status":"ok"}` over HTTPS
- [ ] Uptime monitoring pointed at `/api/healthz`
- [ ] Database backups configured and a restore tested
- [ ] At least one admin account exists, with an explicit `admin_role`

---

## 9. Admin roles

`users.role = "admin"` grants access to the admin panel; `users.admin_role`
decides what that admin can do:

| `admin_role` | Read | Moderate | Finance | Content | Manage admins |
|---|:--:|:--:|:--:|:--:|:--:|
| `super_admin` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `support_admin` | ✓ | ✓ | | | |
| `finance_admin` | ✓ | | ✓ | | |
| `data_analyst` | ✓ | | | | |
| `ad_manager` | ✓ | | | ✓ | |
| `null` (unset) | ✓ | ✓ | ✓ | ✓ | ✓ |

An admin with no `admin_role` keeps full access, so accounts created before
this column existed are not locked out. Assign explicit sub-roles to narrow
access. The sub-role is re-read from the database on every request, so changes
take effect immediately rather than when the session token expires.

An admin cannot change their own sub-role — that would let the last
`super_admin` strip the platform of anyone able to grant the role back.
