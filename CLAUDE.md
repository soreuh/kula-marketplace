# Kula Marketplace — notes for AI coding sessions

Peer-to-peer marketplace (yoga teaching resources). Roles overlap: any user
can self-upgrade buyer→seller; admin transitions are admin-only.
COMMISSION MODEL: buyer pays the listed price; kula takes fee_percent + flat
(default 30% + 25¢) via Stripe `application_fee_amount`; seller nets the rest
(monthly Express payouts). Supabase = auth, Postgres w/ RLS, private
`product-files` bucket + public `covers` bucket. Netlify hosting. Next.js 16.
Optional keyed features (hidden without env): ANTHROPIC_API_KEY → AI listing
suggestions; RESEND_API_KEY → sale-notification emails.

## Invariants — never violate

- Orders are written ONLY by `app/api/stripe/webhook/route.ts` (service role),
  after signature verification. Client code never confirms payments.
- `product-files` bucket stays private. File access only via
  `app/api/download/[productId]/route.ts` (paid-order check → signed URL).
- The service-role client (`lib/supabase/admin.ts`) is server-only. Everything
  user-facing goes through RLS-enforced clients.
- The commission comes from the `platform_settings` table, never hardcoded;
  it is taken OUT of the listing price (never added on top). Partner sellers
  may have a per-seller `profiles.commission_override` percent (null =
  default; flat fee always applies) — negotiated rates are PRIVATE: never
  expose them in the public `instructors` view or any buyer-facing UI.
- Reviews only via RLS (paid order required); orders/downloads unchanged.
- All secrets/config via env vars (see `.env.example`) — the app must remain
  portable to a new owner's accounts by swapping env values only.

## Gotchas

- Next.js 16: `proxy.ts` (exported function `proxy`) replaced `middleware.ts`;
  `params`/`searchParams`/`cookies()` are async — always `await`.
- Schema changes: add a NEW numbered file in `supabase/migrations/` (don't
  rewrite 001 — it has already been run on live projects) and apply it in the
  Supabase SQL editor.
- RLS is the real authorization layer; UI checks are convenience only.
- `profiles.role` changes are blocked by a DB trigger unless admin (or SQL
  editor / service role, where `auth.uid()` is null).

## Commands

- `npm run dev` — local dev (plus `stripe listen --forward-to localhost:3000/api/stripe/webhook`)
- `npm run build` — must pass before pushing
- `npm run lint`
- `bash scripts/push-live.sh` — the ONLY way to push main (verifies repo,
  branch, and tree integrity, then confirms before deploying the live site)
