# Kula Marketplace — notes for AI coding sessions

Multi-vendor marketplace (yoga teaching resources). Buyers/sellers/admin.
Stripe Connect Express with destination charges + `application_fee_amount`.
Supabase = auth, Postgres w/ RLS, private storage. Netlify hosting. Next.js 16.

## Invariants — never violate

- Orders are written ONLY by `app/api/stripe/webhook/route.ts` (service role),
  after signature verification. Client code never confirms payments.
- `product-files` bucket stays private. File access only via
  `app/api/download/[productId]/route.ts` (paid-order check → signed URL).
- The service-role client (`lib/supabase/admin.ts`) is server-only. Everything
  user-facing goes through RLS-enforced clients.
- Platform fee comes from the `platform_settings` table, never hardcoded.
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
