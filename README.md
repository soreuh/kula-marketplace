# Kula Marketplace

A multi-vendor digital marketplace for yoga teachers: sellers list class plans
and teaching resources at their own price, buyers pay that price **plus a
platform fee**, and Stripe routes the money — seller's share straight to their
bank, fee to the platform owner.

## Stack

| Layer      | Tech                                              |
| ---------- | ------------------------------------------------- |
| Frontend   | Next.js 16 (App Router, TypeScript, Tailwind)     |
| Auth + DB  | Supabase (Postgres, Row-Level Security, Storage)  |
| Payments   | Stripe Connect (Express accounts, destination charges + application fee) |
| Hosting    | Netlify (auto-detects Next.js)                    |

## The three roles

- **Buyer** — browses, pays via Stripe Checkout, downloads from their library.
- **Seller** — onboards to Stripe Express (Stripe handles KYC/bank/tax forms),
  uploads files to a **private** bucket, manages listings.
- **Admin** — sets the platform fee, sees all orders/revenue, suspends
  listings, changes user roles. Promote the first admin via SQL (SETUP.md).

## Money rules (do not break these)

1. **Orders are written only by the Stripe webhook** (signature-verified).
   The client is never trusted to confirm payment.
2. **Product files live in a private bucket.** Downloads only via
   `/api/download/[productId]`, which checks for a paid order and issues a
   short-lived signed URL.
3. **The fee lives in the `platform_settings` table**, editable in the admin
   dashboard — no redeploy to change it.

## Getting started

- **You (developer):** follow [SETUP.md](./SETUP.md).
- **New owner, non-technical:** follow [HANDOVER.md](./HANDOVER.md).

## Layout

```
supabase/migrations/001_init.sql   the entire database (run once per Supabase project)
lib/                               supabase clients, stripe client, fee math, types
proxy.ts                           session refresh + /dashboard auth guard (Next 16 middleware)
app/                               pages: /, /product/[id], /login, /signup, dashboards
app/api/checkout                   creates Stripe Checkout Session + pending order
app/api/stripe/onboard             Stripe Connect Express onboarding link
app/api/stripe/webhook             THE writer of paid orders
app/api/download/[productId]       paid-order check → signed URL
```
# kula-marketplace
