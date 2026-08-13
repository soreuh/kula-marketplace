# Kula Marketplace

A peer-to-peer marketplace for yoga teachers: instructors upload the plans
they've already built (sequences, class plans, workshops, meditations), other
teachers buy them to teach with. **Commission model:** the buyer pays the
listed price; kula takes 30% + $0.25 out of it; the seller nets the rest,
paid out monthly via Stripe Connect. ($10.00 listing → $3.25 to kula →
$6.75 to the seller.)

## Stack

| Layer      | Tech                                              |
| ---------- | ------------------------------------------------- |
| Frontend   | Next.js 16 (App Router, TypeScript, Tailwind)     |
| Auth + DB  | Supabase (Postgres, Row-Level Security, Storage)  |
| Payments   | Stripe Connect (Express accounts, destination charges + application fee) |
| Hosting    | Netlify (auto-detects Next.js)                    |

## Roles (they overlap)

- **Everyone** signs up through ONE flow — no buyer/seller fork. Posting your
  first listing (or connecting Stripe) upgrades the account automatically.
- **Instructors** — draft listings any time; publishing unlocks once Stripe
  Express onboarding completes (KYC/bank/tax handled by Stripe, monthly
  payouts). Upload PDF/PPT/PPTX to a **private** bucket, see a live
  "you'll net $X" preview while pricing, search/filter their own listings,
  track views → sales conversion and net earnings per listing.
- **Buyers** — browse/filter/search (duration is a range slider), buy once
  via Stripe Checkout, own it forever in their library, review what they
  bought.
- **Admin** — sets the commission (plus per-seller partner rates), sees all
  orders/revenue, suspends listings, changes user roles, and can
  **pause / reactivate / soft-delete** accounts — paused/deleted users can't
  buy and their listings are ghosted, but every record stays in the
  database. Promote the first admin via SQL (SETUP.md).

## Money rules (do not break these)

1. **Orders are written only by the Stripe webhook** (signature-verified).
   The client is never trusted to confirm payment.
2. **Product files live in a private bucket.** Downloads only via
   `/api/download/[productId]`, which checks for a paid order and issues a
   short-lived signed URL.
3. **The commission lives in the `platform_settings` table** (30% + 25¢ by
   default), editable in the admin dashboard — no redeploy to change it.
   Per-seller overrides (`profiles.commission_override`) take precedence
   and are private — never shown to buyers.
4. **Nothing goes live before Stripe.** Sellers can draft freely, but the
   database blocks `active` listings until the seller is Stripe-verified
   (migration 005). Listings are $1.00 minimum (migration 006 — matches
   the Terms).

## Getting started

- **You (developer):** follow [SETUP.md](./SETUP.md).
- **New owner, non-technical:** follow [HANDOVER.md](./HANDOVER.md).
- **Deploying:** `bash scripts/push-live.sh` — the only way to push main.
  It verifies repo/branch/tree integrity, shows the diff, and asks first.

Optional features stay dark until keyed (see `.env.example`):
`ANTHROPIC_API_KEY` (AI listing suggestions), `RESEND_API_KEY`
(sale-notification emails), `MAILCHIMP_API_KEY` + `MAILCHIMP_AUDIENCE_ID`
(waitlist/consent signups mirror into a Mailchimp Audience).

## Layout

```
supabase/migrations/               001–007 — run ALL, in numeric order, per Supabase project
supabase/tests/                    RLS security suites (run on local Postgres — see its README)
lib/                               supabase clients, stripe client, fee math, types, email, mailchimp
proxy.ts                           session refresh + auth guard (Next 16 middleware)
app/                               /, /explore, /products/[id], /profile/[id], /library,
                                   /dashboard (+ /dashboard/admin), /purchase-success,
                                   /about /privacy /terms (owner's finalized copy — verbatim)
app/api/checkout                   Checkout Session (commission via application_fee) + pending order
app/api/stripe/onboard             Connect Express onboarding (monthly payouts) + role upgrade
app/api/stripe/webhook             THE writer of paid orders (+ sale emails if RESEND_API_KEY)
app/api/download/[productId]       paid-order check → signed URL
app/api/ai/suggest                 listing metadata suggestions (needs ANTHROPIC_API_KEY)
app/api/mailing-list               waitlist/consent signups → DB (+ Mailchimp mirror when keyed)
scripts/push-live.sh               guarded deploy to main
```
