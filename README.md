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

- **Everyone** signs up once; any user can become an instructor by connecting
  Stripe (buyer→seller self-upgrade is built in).
- **Instructors** — onboard to Stripe Express (KYC/bank/tax handled by
  Stripe, monthly payouts), upload PDF/PPT/PPTX to a **private** bucket,
  manage listings, track views/sales/net earnings, get sale emails.
- **Buyers** — browse/filter/search, buy once via Stripe Checkout, own it
  forever in their library, review what they bought.
- **Admin** — sets the commission, sees all orders/revenue, suspends
  listings, changes user roles. Promote the first admin via SQL (SETUP.md).

## Money rules (do not break these)

1. **Orders are written only by the Stripe webhook** (signature-verified).
   The client is never trusted to confirm payment.
2. **Product files live in a private bucket.** Downloads only via
   `/api/download/[productId]`, which checks for a paid order and issues a
   short-lived signed URL.
3. **The commission lives in the `platform_settings` table** (30% + 25¢ by
   default), editable in the admin dashboard — no redeploy to change it.

## Getting started

- **You (developer):** follow [SETUP.md](./SETUP.md).
- **New owner, non-technical:** follow [HANDOVER.md](./HANDOVER.md).

## Layout

```
supabase/migrations/               001 + 002 — run BOTH, in order, per Supabase project
supabase/tests/                    RLS security suites (run on local Postgres)
lib/                               supabase clients, stripe client, fee math, types, email
proxy.ts                           session refresh + auth guard (Next 16 middleware)
app/                               /, /explore, /products/[id], /profile/[id], /library,
                                   /dashboard, /purchase-success, /about /privacy /terms
app/api/checkout                   Checkout Session (commission via application_fee) + pending order
app/api/stripe/onboard             Connect Express onboarding (monthly payouts) + role upgrade
app/api/stripe/webhook             THE writer of paid orders (+ sale emails if RESEND_API_KEY)
app/api/download/[productId]       paid-order check → signed URL
app/api/ai/suggest                 listing metadata suggestions (needs ANTHROPIC_API_KEY)
```
