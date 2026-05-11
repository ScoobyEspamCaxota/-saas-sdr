# Vendora — Design Spec (MVP)

**Date:** 2026-05-10
**Status:** Approved for implementation planning
**Owner:** Joaor (kakatros40@gmail.com)
**Project root:** `C:\Users\Joaor\Projects\saas-sdr`

---

## 1. Product Overview

**Name:** Vendora
**One-liner:** "Seu SDR de IA. Encontra leads, escreve email personalizado, agenda reunião — enquanto você dorme."
**Market:** Brazil (PT-BR), B2B SMB (10–200 employees) doing outbound without a dedicated SDR.
**Initial verticals:** marketing agencies, B2B consultancies, SaaS startups.
**Differentiation vs Apollo/Instantly:** PT-BR native UI + Claude prompts tuned for Brazilian business culture, Stripe BR billing, lower price point, founder-led support in Portuguese.

### Goals (MVP, 90 days post-launch)
- 50+ signups
- 10+ paying customers
- MRR ≥ R$ 3.000
- NPS > 40
- Monthly churn < 10%

### Non-goals (out of MVP scope)
- LinkedIn outreach
- Automatic lead sourcing (Apollo/Sales Nav integration)
- Multi-touch sequences (follow-ups beyond a single send)
- Calendar booking automation
- Team seats beyond hard-coded plan limits
- A/B testing of subject/copy
- White-label
- Mobile app

---

## 2. User Flow (MVP)

1. User signs up via email or Google (Supabase Auth).
2. Onboarding wizard captures: company name, ICP definition (free-text), value proposition (free-text).
3. User connects a Gmail account via Google OAuth (scopes: `gmail.send`, `gmail.readonly`).
4. User uploads a CSV of leads (required cols: `email`, `full_name`; optional: `company`, `job_title`, `linkedin_url`, custom).
5. User creates a campaign: name, choose Gmail account, choose lead segment, edit prompt template (default seeded from ICP + value prop).
6. System generates a personalized email per lead via Claude Haiku 4.5 (background, Inngest).
7. User reviews/edits each generated email in a per-message UI; can approve all or reject some.
8. User clicks "Send campaign" → background worker sends through user's Gmail at rate ≤ 30/day per Gmail account, paced over the day.
9. Tracking pixel embedded in each email logs opens.
10. Reply detection (Gmail watch + push, with 15-min polling fallback) classifies replies (`interested | objection | not_now | unsubscribe | oof`) via Claude Sonnet 4.6 with summary; user notified in-app and via Resend transactional email.
11. Dashboard shows per-campaign metrics: sent / open rate / reply rate / interested count, plus a global usage bar against plan quota.

---

## 3. Pricing & Plans

| Plan | Price (BRL/mo) | Email cap | Gmail accounts | Seats | Notes |
|---|---|---|---|---|---|
| Free | R$ 0 | 50 | 1 | 1 | Watermark "enviado via Vendora", no priority |
| Starter | R$ 197 | 200 | 1 | 1 | No watermark |
| Growth | R$ 497 | 1.000 | 3 | 3 | A/B copy variants enabled (post-MVP gate visible but disabled) |
| Scale | R$ 1.497 | 5.000 | 10 | 10 | API access (post-MVP), priority support |

- **Trial:** 14-day Growth, no card required. After trial → Free unless upgraded.
- **Quota enforcement:** `profiles.emails_sent_this_month` checked before enqueueing send job; resets monthly via Inngest cron.
- **Currency:** BRL via Stripe BR. Card and Pix.

---

## 4. Architecture

### 4.1 High-Level Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Next.js App Router, RSC + Client Components)      │
│  - Landing page (SEO)                                       │
│  - App: /dashboard /campaigns /leads /settings              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Next.js API Routes (Vercel)                                │
│  - /api/auth/* (Supabase callbacks, Google OAuth callback)  │
│  - /api/leads (CRUD, CSV upload)                            │
│  - /api/campaigns/[id]/generate (enqueue Inngest)           │
│  - /api/campaigns/[id]/send (enqueue Inngest)               │
│  - /api/track/open/[messageId].gif                          │
│  - /api/webhooks/stripe                                     │
│  - /api/webhooks/gmail-push                                 │
│  - /api/inngest (Inngest serve handler)                     │
└─────────────────────────────────────────────────────────────┘
        │                    │                  │
        ▼                    ▼                  ▼
┌──────────────┐    ┌──────────────┐   ┌─────────────┐
│ Supabase     │    │ Inngest      │   │ Stripe      │
│ - Postgres   │    │ Functions:   │   │ Billing     │
│ - Auth       │    │ - generate-  │   │ (BR)        │
│ - Storage    │    │   campaign-  │   │             │
│ - RLS        │    │   emails     │   │             │
│              │    │ - send-      │   │             │
│              │    │   campaign   │   │             │
│              │    │ - check-     │   │             │
│              │    │   replies    │   │             │
│              │    │ - reset-     │   │             │
│              │    │   monthly-   │   │             │
│              │    │   quota      │   │             │
└──────────────┘    └──────────────┘   └─────────────┘
                            │
        ┌───────────────────┼─────────────────┐
        ▼                   ▼                 ▼
┌──────────────┐   ┌──────────────┐  ┌──────────────┐
│ Anthropic    │   │ Gmail API    │  │ Resend       │
│ Claude API   │   │ (user OAuth) │  │ (app->user   │
│ - Haiku 4.5  │   │              │  │  transac.    │
│   (gen)      │   │              │  │  emails)     │
│ - Sonnet 4.6 │   │              │  │              │
│   (classify) │   │              │  │              │
└──────────────┘   └──────────────┘  └──────────────┘
```

### 4.2 Stack Decisions

| Layer | Choice | Rationale |
|---|---|---|
| Frontend + API | Next.js 15 App Router + TypeScript + Tailwind + shadcn/ui | Single deploy, RSC speeds up dashboard, mature, beginner-friendly docs |
| DB + Auth + Storage | Supabase | Postgres + Auth + Storage in one console, RLS for multi-tenancy, generous free tier |
| Background jobs | Inngest | No Redis/worker infra, retry + observability built-in, free tier 50k steps/mo covers MVP |
| Billing | Stripe (BR) | BRL + Pix support, well-documented, webhooks reliable |
| LLM | Anthropic Claude API | Haiku 4.5 cheap for generation, Sonnet 4.6 strong for classification, prompt caching cuts cost |
| Email send (outbound campaigns) | User's Gmail via OAuth | Best deliverability, lands in inbox not spam folder |
| Email send (transactional) | Resend | Simple SDK, free tier covers MVP volumes |
| Hosting | Vercel | Zero-config Next.js deploy, free tier OK for MVP |
| Monitoring | Sentry + PostHog | Errors + product analytics + feature flags |

### 4.3 Multi-Tenancy

- Every business-data table has a `user_id uuid` column referencing `auth.users(id)` (mirrored in `profiles`).
- Supabase RLS policies on every such table: `auth.uid() = user_id` for SELECT/INSERT/UPDATE/DELETE.
- Service-role key (server-side only, never exposed to browser) used by Inngest workers; workers must always pass `user_id` explicitly when querying.
- No cross-tenant queries permitted.

---

## 5. Data Model

```sql
-- Auth managed by Supabase: auth.users(id, email, ...)

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  company_name text,
  icp_definition text,
  value_proposition text,
  plan text not null default 'free' check (plan in ('free','starter','growth','scale')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  emails_sent_this_month int not null default 0,
  trial_ends_at timestamptz,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table gmail_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  email text not null,
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  token_expires_at timestamptz not null,
  daily_send_limit int not null default 30,
  emails_sent_today int not null default 0,
  last_reset_date date not null default current_date,
  watch_expiration timestamptz, -- Gmail push subscription expiry
  history_id text,              -- Gmail history pointer for incremental sync
  created_at timestamptz not null default now(),
  unique(user_id, email)
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  email text not null,
  full_name text,
  company text,
  job_title text,
  linkedin_url text,
  custom_fields jsonb not null default '{}'::jsonb,
  enrichment jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new','queued','sent','replied','bounced','unsubscribed')),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, email)
);
create index leads_user_status_idx on leads(user_id, status);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  gmail_account_id uuid not null references gmail_accounts(id) on delete restrict,
  prompt_template text not null,
  subject_template text not null,
  status text not null default 'draft' check (status in ('draft','generating','review','sending','done','paused','failed')),
  total_leads int not null default 0,
  generated_count int not null default 0,
  sent_count int not null default 0,
  reply_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index campaigns_user_status_idx on campaigns(user_id, status);

create table campaign_messages (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  generated_subject text,
  generated_body text,
  edited_subject text,
  edited_body text,
  status text not null default 'pending' check (status in ('pending','approved','sending','sent','failed','replied')),
  gmail_message_id text,
  gmail_thread_id text,
  send_error text,
  sent_at timestamptz,
  opened_at timestamptz,
  open_count int not null default 0,
  replied_at timestamptz,
  reply_classification text check (reply_classification in ('interested','objection','not_now','unsubscribe','oof','other')),
  reply_summary text,
  reply_raw text,
  generation_cost_cents int,
  scheduled_send_at timestamptz,
  created_at timestamptz not null default now()
);
create index campaign_messages_status_idx on campaign_messages(status, scheduled_send_at);
create index campaign_messages_thread_idx on campaign_messages(gmail_thread_id);
create index campaign_messages_user_idx on campaign_messages(user_id);

create table events (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index events_user_type_idx on events(user_id, type, created_at desc);

-- Triggers: auto-update updated_at on profiles/campaigns
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_updated before update on profiles
  for each row execute function set_updated_at();
create trigger campaigns_updated before update on campaigns
  for each row execute function set_updated_at();

-- RLS
alter table profiles enable row level security;
alter table gmail_accounts enable row level security;
alter table leads enable row level security;
alter table campaigns enable row level security;
alter table campaign_messages enable row level security;
alter table events enable row level security;

-- Generic policy template: user owns row
create policy "own_profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own_gmail" on gmail_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_leads" on leads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_campaigns" on campaigns
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_messages" on campaign_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_events" on events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Token encryption: app-level AES-256-GCM with key from ENCRYPTION_KEY env var (see Security section 7).
```

---

## 6. Critical Flows (Detailed)

### 6.1 Generate Campaign Emails

1. Client POSTs `/api/campaigns/{id}/generate`.
2. API validates campaign ownership, status=`draft`, and lead count ≤ remaining quota.
3. API updates campaign status to `generating`, sends Inngest event `campaign/generate.requested`.
4. Inngest function `generate-campaign-emails`:
   - Fetches campaign + associated leads (via service role + explicit `user_id` filter).
   - Fans out one step per lead (with concurrency cap = 5).
   - Each step: Claude Haiku 4.5 with prompt caching on the system + ICP + value prop block; user prompt = lead-specific data.
   - Inserts into `campaign_messages` with `generated_subject`, `generated_body`, `generation_cost_cents`.
   - On step failure: retry 3x; if still failing, insert message with `status='failed'` and error.
5. Final step updates campaign `status='review'`, `generated_count`.
6. Frontend revalidates via Supabase realtime subscription on the campaign row.

### 6.2 Send Campaign

1. Client POSTs `/api/campaigns/{id}/send`.
2. API checks status=`review`, quota, Gmail token validity (refresh if needed).
3. API computes `scheduled_send_at` for each approved message: spread across the day, respecting `gmail_accounts.daily_send_limit`. Cross-day spillover allowed.
4. API updates campaign status=`sending`, fires Inngest event.
5. Inngest function `send-campaign`:
   - Loops messages ordered by `scheduled_send_at`.
   - For each: `step.sleepUntil(scheduled_send_at)`, then send via Gmail API with subject/body (edited values preferred over generated), tracking pixel appended, `In-Reply-To`/`Message-ID` headers stored.
   - Updates message: `status='sent'`, `gmail_message_id`, `gmail_thread_id`, `sent_at`.
   - Increments `gmail_accounts.emails_sent_today`, `profiles.emails_sent_this_month`.
   - Schedules `check-replies` for each thread at +1h and +24h (in addition to webhook).
6. On all sent → campaign `status='done'`.

### 6.3 Reply Detection

**Primary path: Gmail push.**
- On Gmail OAuth, register `users.watch` with topic Pub/Sub → webhook `/api/webhooks/gmail-push`.
- Webhook verifies, fetches new messages via `users.history.list` from stored `history_id`, finds matches by `gmail_thread_id` in `campaign_messages`.

**Fallback: 15-min polling.**
- Inngest cron every 15 min iterates `campaign_messages` with `status='sent'` and `replied_at IS NULL` and `sent_at > now() - 14 days`, calls `users.threads.get`, detects new inbound messages.

**Classification:**
- For each detected reply: send raw reply text + original email + ICP context to Claude Sonnet 4.6 with structured output (JSON schema: `classification`, `confidence`, `summary`).
- Update `campaign_messages` and `leads.status='replied'`.
- Insert event. If `interested`, send transactional Resend email to user + in-app notification.

### 6.4 Quota & Billing

- `profiles.emails_sent_this_month` increments on each send.
- Pre-send check rejects if increment would exceed plan cap.
- Inngest cron `reset-monthly-quota` runs 00:05 UTC on day 1 of each month, zeroes counter.
- Stripe webhook on `customer.subscription.updated/deleted` updates `profiles.plan`, `stripe_subscription_id`.
- Trial: on signup, set `trial_ends_at = now() + 14 days`, `plan='growth'`. Cron `expire-trials` daily downgrades expired trials with no subscription to `free`.

---

## 7. Security & Compliance

- **Token storage:** Gmail OAuth tokens encrypted with AES-256-GCM. Key in `ENCRYPTION_KEY` env var (32 bytes, base64). Never log tokens.
- **Service-role key:** server-only env (`SUPABASE_SERVICE_ROLE_KEY`), never bundled to client. Verified by build-time check.
- **CSRF:** Next.js server actions handle automatically; for REST endpoints, require Supabase session JWT in Authorization header.
- **Rate limit:** Upstash Redis or Vercel KV-based middleware on `/api/*`: 60 req/min/user.
- **LGPD:**
  - ToS/Privacy page (`/legal/terms`, `/legal/privacy`) published before launch.
  - User is data controller for leads they upload; Vendora is operator (DPA available on request).
  - One-click "delete my account + data" in `/settings` triggers cascade delete + Stripe subscription cancel.
  - Data residency: Supabase project in `sa-east-1` (São Paulo).
- **Email compliance:** every campaign email auto-includes unsubscribe link (`/unsubscribe/{token}`). Clicking sets `leads.status='unsubscribed'`, blocks future sends.
- **Spam prevention:** onboarding warns user to verify SPF/DKIM/DMARC on their domain; provides DNS instructions. Block obvious spam-trigger phrases in generated copy via post-generation lint.

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Gmail account suspended for spam | User loses primary inbox | Hard cap 30/day/account, gradual warmup recommendation, anti-spam copy lint, SPF/DKIM check at onboarding |
| Reply false-positive (OOO classified as interested) | UX erosion | Few-shot examples in classifier prompt, confidence threshold, manual reclassify UI |
| Anthropic cost overrun | Margin compression | Prompt caching on system+ICP block, Haiku for gen, hard cap per plan, daily cost alert via Sentry |
| Vercel function timeout on LLM gen | UX failure | All LLM work in Inngest (off the request path), HTTP returns immediately with job ID |
| LGPD complaint on lead data | Legal/reputational | Clear DPA, fast delete endpoint, sa-east-1 residency, audit log via `events` table |
| Stripe BR onboarding friction | Revenue blocker | Validate Stripe BR account ready before launch; fallback to manual Pix invoicing for first 5 customers |
| User uploads 10k leads + crashes worker | Performance | CSV upload capped at 2k rows in MVP, progress indicator, batched insert with COPY |

---

## 9. MVP Build Roadmap (6 weeks)

| Week | Milestone | Acceptance Criteria |
|---|---|---|
| 1 | Setup + Auth | Repo deployed to Vercel, Supabase connected, schema applied, RLS active, sign-up + login + sign-out work end-to-end on prod |
| 2 | Onboarding + ICP | Wizard 3-step persists `profiles.{company_name, icp_definition, value_proposition, onboarding_completed_at}`; `/settings` allows edit |
| 3 | Leads + Gmail OAuth | CSV upload (≤2k rows) maps columns, dedupes by email, persists `leads`; Google OAuth flow connects Gmail account, encrypted tokens stored, `/leads` lists with pagination + search |
| 4 | Email Generation | Create campaign UI; Inngest `generate-campaign-emails` produces personalized email per lead via Haiku 4.5; per-message review/edit UI |
| 5 | Send + Tracking | `send-campaign` sends via user Gmail respecting daily cap with paced scheduling; tracking pixel records opens; campaign dashboard shows sent/open counts |
| 6 | Reply Detection + Billing + Polish | Gmail push + polling fallback; Sonnet classification; Stripe checkout for 3 plans; webhook updates `profiles.plan`; quota enforcement; landing + pricing page; Sentry + PostHog wired |

### Definition of Done (MVP)
- All 6 milestones meet acceptance criteria.
- Manual end-to-end test: sign up → onboard → connect Gmail → upload 50 leads → generate → review → send → receive a real reply on a test lead → see classified reply in dashboard → upgrade to Growth via Stripe checkout.
- LGPD pages published.
- Error monitoring active and free of unhandled exceptions in production for 48h.

---

## 10. Pricing & Financial Projection

### 10.1 Plans (recap)

| Plan | BRL/mo | Email cap | Gmail | Seats |
|---|---|---|---|---|
| Free | 0 | 50 | 1 | 1 |
| Starter | 197 | 200 | 1 | 1 |
| Growth | 497 | 1.000 | 3 | 3 |
| Scale | 1.497 | 5.000 | 10 | 10 |

### 10.2 12-Month Projection (conservative)

| Month | Paying | Mix (S/G/Sc) | MRR (BRL) | Infra cost (BRL) | Gross profit |
|---|---|---|---|---|---|
| 1 | 0 | — | 0 | 500 | -500 |
| 2 | 0 | — | 0 | 500 | -500 |
| 3 | 5 | 2/3/0 | 1.885 | 800 | 1.085 |
| 4 | 10 | 4/5/1 | 4.260 | 900 | 3.360 |
| 5 | 17 | 7/8/2 | 8.349 | 1.000 | 7.349 |
| 6 | 25 | 10/12/3 | 12.421 | 1.200 | 11.221 |
| 7 | 35 | 13/18/4 | 18.515 | 1.500 | 17.015 |
| 8 | 47 | 17/24/6 | 24.275 | 1.900 | 22.375 |
| 9 | 60 | 20/30/10 | 33.840 | 2.500 | 31.340 |
| 10 | 78 | 25/40/13 | 44.386 | 3.000 | 41.386 |
| 11 | 98 | 30/52/16 | 55.418 | 3.700 | 51.718 |
| 12 | 120 | 35/65/20 | 69.190 | 4.500 | 64.690 |

**Assumptions:**
- 14-day trial → 25% trial-to-paid conversion.
- Monthly churn 8% steady-state.
- Founder-led sales months 1–6 (no paid acquisition).
- Content + community + agency partnerships months 6+.
- LTV (Growth tier @ 8% churn): R$ 497 / 0.08 = R$ 6.213.
- Target CAC: < R$ 400. LTV/CAC > 15x.

### 10.3 Unit Economics per Customer (Growth plan)
- Revenue: R$ 497/mo
- Anthropic cost (1.000 emails @ Haiku gen + ~30% reply classification with Sonnet, with caching): ~R$ 25/mo
- Stripe fee (~3.99% + R$ 0.39): ~R$ 20
- Allocated infra (Supabase + Vercel + Inngest amortized over 50 customers): ~R$ 15
- **Gross margin per customer: ~88%**

---

## 11. Open Questions (to resolve before or during implementation)

1. **Stripe BR setup:** does the user already have a Stripe BR-enabled account with Pix? (Affects week 6.)
2. **Domain:** which domain to register? `vendora.com.br` vs `getvendora.com` vs `vendora.app`. (Affects week 1 deploy DNS.)
3. **Gmail Pub/Sub topic:** GCP project required for Gmail push. Set up early in week 6 or fall back to polling-only for MVP launch.
4. **Free tier or paid trial only:** spec keeps both Free + 14-day trial. May simplify to one to reduce abuse.

These do not block planning; resolved during implementation.

---

## 12. Out-of-MVP Backlog (post-launch priority order)

1. Multi-touch sequences (D+3, D+7 follow-ups if no reply)
2. A/B testing of subject + first line
3. Apollo.io enrichment + lead sourcing
4. LinkedIn outreach (Unipile API)
5. Calendar booking automation (Google Calendar)
6. Team / multi-seat with role-based access
7. White-label / agency mode (R$ 2.997/mo)
8. Native mobile (notifications)
9. Public API + Zapier/Make integration
10. Custom domain for tracking pixel
