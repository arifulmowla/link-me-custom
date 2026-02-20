# Linkme

Linkme is a URL shortener application built with Next.js App Router.

## Prerequisites

1. Node.js 20+
2. npm 10+
3. A Neon PostgreSQL database

## Environment Setup

1. Copy `.env.example` to `.env`.
2. Fill these values:
- `DATABASE_URL`: Neon pooled connection URL
- `DIRECT_URL`: Neon direct connection URL for Prisma migrations
- `APP_BASE_URL`: public base URL (for local: `http://localhost:3000`)
- `NEXT_PUBLIC_APP_URL`: app URL used by Stripe return redirects
- `IP_HASH_SALT`: secret used to hash visitor IPs before storage
- `AUTH_SECRET`: long random secret for Auth.js sessions
- `AUTH_URL`: app URL (for local: `http://localhost:3000`)
- `GOOGLE_CLIENT_ID`: Google OAuth client id
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `STRIPE_SECRET_KEY`: Stripe secret API key
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret
- `STRIPE_PRICE_PRO_MONTHLY_USD`: Stripe Price ID for `$5/month`
- `STRIPE_PRICE_PRO_YEARLY_USD`: Stripe Price ID for `$48/year`

## Install and Run

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Open `http://localhost:3000`.

## Backend Commands

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run prisma:studio
```

## API Verification

Create a short link:

```bash
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url":"example.com/docs","source":"homepage_hero"}'
```

Expected response:

```json
{ "shortUrl": "http://localhost:3000/abc1234", "code": "abc1234" }
```

Follow the short link:

```bash
curl -i http://localhost:3000/abc1234
```

Expected behavior: HTTP `307` redirect to the original URL when code exists.

## Auth and Dashboard

1. Visit `/login` and sign in with Google.
2. After OAuth, users are redirected through `/auth/claim` to `/dashboard`.
3. Dashboard includes:
- KPI cards: total links, total clicks, last 7 days clicks
- Create link card
- Links table with copy and delete actions
- Usage bar with free/pro limits
- Billing page at `/dashboard/billing`

## Billing and Webhooks

1. Create Stripe products/prices for Pro Monthly (`$5`) and Pro Yearly (`$48`), then set the two price IDs in `.env`.
2. Start the Stripe CLI listener and forward events:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

3. Copy the emitted signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Supported webhook events:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

### Billing API quick checks

Start checkout session (authenticated):

```bash
curl -X POST http://localhost:3000/api/billing/checkout \
  -H "Content-Type: application/json" \
  -d '{"interval":"month"}'
```

Open billing portal (authenticated):

```bash
curl -X POST http://localhost:3000/api/billing/portal
```

Sync plan after checkout return (authenticated):

```bash
curl -X POST http://localhost:3000/api/billing/sync \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"cs_test_..."}'
```

### Local billing troubleshooting

1. Keep `stripe listen --forward-to localhost:3000/api/stripe/webhook` running while testing checkout.
2. Ensure `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO_*`, and webhook secret all belong to the same Stripe account and mode.
3. If checkout succeeds but UI remains Free, open `/dashboard/billing?status=success&session_id=...` and use the sync flow (or call `/api/billing/sync` manually).
