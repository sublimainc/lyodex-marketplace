# Threat Model

## Project Overview

LyoDex is a public B2B marketplace for freeze-drying services, with a React frontend and an Express 5 API backed by PostgreSQL via Drizzle. Production traffic reaches a public deployment at `lyodex.com`; the web artifact and API server are production-reachable, while `artifacts/mockup-sandbox` is development-only unless future routing explicitly exposes it.

The application now has real production authentication and payment flows: JWT session cookies for buyers, operators, and admins; Stripe Checkout and Stripe Connect for escrow, fees, and payouts; SMTP email for transactional and admin notifications; and private object storage for operator certification documents.

## Assets

- **User accounts and active sessions** — buyer, operator, and admin identities are carried in JWT cookies. Compromise enables impersonation, business workflow abuse, and admin access.
- **Marketplace business data** — buyer RFQs, operator bids, disputes, job-status messages, and price intelligence. This data is commercially sensitive even when it is not classical PII.
- **Buyer and operator contact details** — especially email addresses stored on requests, users, and notifications. Exposure enables phishing, scraping, and off-platform abuse.
- **Payment and payout state** — Stripe checkout sessions, escrow payment intents, fee state, connected account IDs, and payout readiness. Integrity failures can misroute money or release funds incorrectly.
- **Private certification documents** — uploaded operator cert files and the object paths that reference them. Exposure would leak compliance paperwork and operational details.
- **Application secrets and service credentials** — `JWT_SECRET`, database credentials, Stripe secrets, webhook secrets, SMTP secrets, and admin alert configuration.

## Trust Boundaries

- **Browser / mobile client → API server** — all request bodies, query params, cookies, and headers are untrusted at entry.
- **API server → PostgreSQL** — the API has broad read/write capability over users, marketplace records, disputes, analytics, and audit data.
- **API server → Stripe** — Checkout, Connect, webhook, and transfer flows rely on server-side secrets and event authenticity.
- **API server → SMTP** — server-triggered mail reaches buyers, operators, and admins; email-triggering endpoints can become spam or spoofing amplifiers.
- **API server → Object storage** — private certification documents cross a storage boundary and must stay restricted to authorized principals.
- **Public / authenticated / admin boundaries** — some marketplace browsing is intentionally public, but request participation data, private documents, disputes, payouts, and admin analytics must be constrained server-side.
- **Production / dev-only boundary** — mobile build scripts, mockup sandbox code, and experimental artifacts are normally out of scope unless production code invokes them.

## Scan Anchors

- Production entry points: `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, `artifacts/lyodex/src/main.tsx`.
- Highest-risk API areas: `artifacts/api-server/src/routes/auth.ts`, `bids.ts`, `requests.ts`, `admin.ts`, `stripe.ts`, `connect.ts`, `storage.ts`, `role-dashboard.ts`, `dashboard.ts`, `analytics.ts`, `operators.ts`, and `manufacturers.ts`.
- Identity hot spots: `artifacts/api-server/src/middleware/requireAuth.ts` now reloads live user state and enforces `banned`, `locked_until`, and `session_version`; several buyer-facing ownership checks still key off `requests.buyer_email`, so email-coupled authorization should continue to be treated as sensitive.
- Workflow hot spots: request messaging is keyed only by `request_id`, operator dashboards expose broad request data, and bid acceptance currently closes requests before escrow funding is confirmed.
- Public surfaces: request/operator browsing, public operator creation, manufacturer review submission, analytics snapshots, recent-activity feeds, telemetry/event collection, blog APIs, and health/error-reporting endpoints.
- Authenticated/admin surfaces: request messaging, bid acceptance/completion, buyer notifications, operator dashboards, admin moderation, Stripe webhook health, certification uploads, and private object retrieval.
- Usually ignore unless proven production-reachable: `artifacts/mockup-sandbox/**`, mobile build scripts, local migration backups, and generated/dist artifacts.

## Threat Categories

### Spoofing

Session cookies must correspond to a currently valid account and role, not just a historically signed JWT. Password-reset, login, and webhook flows must not let attackers impersonate users or Stripe events. Public record-creation endpoints must not let unauthenticated users impersonate buyers or operators in ways that affect trusted marketplace workflows.

### Tampering

All marketplace state changes — request creation, bid submission, bid acceptance, dispute handling, operator profile updates, admin moderation, and payout release — must be authorized against the acting user’s current ownership and role. Client-controlled identifiers, emails, object paths, and status fields must never be accepted as sufficient proof of authority on their own.

### Information Disclosure

The sealed-bid marketplace model requires server-side scoping of bids, disputes, messages, certification documents, and contact data. Public endpoints must not expose buyer emails, private document references, internal error details, or commercially sensitive quote data beyond what the product intentionally makes public.

### Denial of Service

Publicly reachable endpoints that create records, send emails, or persist analytics/error data must resist automated flooding. Webhook, storage, and third-party network calls must fail safely without allowing attackers to exhaust database, email, or payment-processing resources.

### Elevation of Privilege

Role checks must be paired with per-resource ownership checks. Admin-only data and actions must not be reachable via stale sessions, missing ownership validation, or business routes that assume a role implies blanket access to all marketplace records.
