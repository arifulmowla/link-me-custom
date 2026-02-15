# URL Shortener Product Plan

## 1) Product Vision
Build a modern URL shortener similar to `shorturl.at`, with a free tier for basic use and a premium subscription for advanced branding, analytics, and team features.

## 2) Target Users
- Individuals who want quick short links.
- Creators and marketers who need tracking and branded links.
- Small teams that manage campaign links together.

## 3) Subscription Strategy
Use two plans at launch, then add a team tier later.

| Plan | Suggested Price | Core Limits | Core Value |
|---|---:|---|---|
| Free | $0 | 50 active links, 1,000 clicks/month, basic analytics | Try product and share links quickly |
| Pro | $5/month | Unlimited active links, Unlimited clicks/month, full analytics, custom aliases, expiry rules | Professional link management and tracking |
| Team (Phase 2) | $20/month | Pro features + 5 seats, shared workspace, role-based access | Collaboration for small teams |

## 4) Feature Scope by Plan

### Free
- Create short links with random slug.
- Basic dashboard: link list, total clicks.
- Basic analytics: total clicks and last click time.
- QR code download (low customization).

### Pro
- Custom slug and branded domain support.
- Advanced analytics: referrer, country, device, time-series.
- UTM builder and campaign grouping.
- Link expiration and password protection.
- Bulk link import (CSV).
- Priority support.

### Team (later or not necessary for implement)
- Multi-user workspace.
- Roles: owner, editor, viewer.
- Shared analytics and activity log.

## 5) MVP Scope (First Launch)
Focus on fast delivery with clear free vs paid differentiation.

1. Public short link redirect with click tracking.
2. Auth (email/password or OAuth).
3. User dashboard for create/list/edit/delete links.
4. Free plan limits enforcement.
5. Stripe subscription for Pro plan.
6. Pro-only features: custom slug, richer analytics, expiry.
7. Admin page for abuse reports and user management.

## 6) Recommended Tech Stack
- Frontend: Next.js App Router + React + Tailwind.
- API: Next.js route handlers.
- Database: Mysql.
- Auth: NextAuth (or Clerk if faster for your team).
- Billing: Stripe subscriptions + webhook handling.
- Queue/Jobs: Upstash QStash or BullMQ for heavy analytics aggregation.
- Hosting: Vercel (app) + managed Postgres.

## 7) Core Data Model (Initial)
- `users`: id, email, name, auth_provider, created_at.
- `plans`: id, code (`free`, `pro`), limits_json.
- `subscriptions`: user_id, stripe_customer_id, stripe_subscription_id, status, period_end.
- `domains`: user_id, domain, verified_at, is_primary.
- `links`: id, user_id, domain_id, short_code, target_url, title, expires_at, is_password_protected, created_at.
- `link_clicks`: id, link_id, clicked_at, ip_hash, country, referrer, user_agent, device_type.
- `workspaces` (phase 2): id, name, owner_user_id.
- `workspace_members` (phase 2): workspace_id, user_id, role.

## 8) Security and Abuse Controls
- Rate limit link creation and redirect endpoint.
- Validate and normalize destination URLs.
- Add malicious URL checks (Google Safe Browsing or similar).
- Store hashed IP, not raw IP, for privacy.
- CAPTCHA for suspicious traffic spikes.
- Admin abuse workflow: report, review, disable link.

## 9) Analytics Plan
- Real-time counter update per click.
- Async enrichment for geo/device/referrer.
- Daily aggregated stats table for fast charts.
- Data retention policy (raw click-level data):
- Free plan: 30 days.
- Pro plan: 12 months.

## 10) Delivery Roadmap (8 Weeks)

### Week 1-2: Foundation
- Set up project architecture, database, auth.
- Implement link creation + redirect + click logging.
- Build base dashboard UI.

### Week 3-4: Free Plan Experience
- Add free-plan quotas and usage meter.
- Add basic analytics cards and list filters.
- Add URL validation and anti-abuse baseline.

### Week 5-6: Pro Billing + Features
- Integrate Stripe checkout + webhook sync.
- Unlock Pro features with server-side entitlement checks.
- Implement custom slug, expiry, advanced analytics.

### Week 7: Stability + QA
- Add unit/integration tests for limits, billing, redirects.
- Load test redirect endpoint.
- Add monitoring and error alerts.

### Week 8: Launch
- Prepare landing page, pricing page, legal pages.
- Run beta with 10-20 users.
- Launch publicly and monitor conversion + reliability.

## 11) Key Metrics to Track
- Activation rate: signup -> first short link created.
- Free-to-Pro conversion rate.
- Monthly recurring revenue (MRR).
- Link creation per active user.
- Redirect success latency (p95).
- Abuse incident count per 10k links.
- Churn rate for Pro users.

## 12) Immediate Next Tasks (Execution Order)
1. Finalize plan limits and pricing.
2. Create database schema and migrations.
3. Build redirect route and click tracking.
4. Build dashboard CRUD for links.
5. Add auth and per-user ownership checks.
6. Integrate Stripe and Pro entitlement middleware.
7. Build analytics pages and usage meters.
8. Add tests and monitoring before launch.

## 13) Open Decisions
- Auth provider choice: NextAuth vs Clerk.
- Billing currency and annual discount policy.
- Whether branded/custom domains are in Pro launch or Team phase.
- Exact anti-abuse provider and budget.
