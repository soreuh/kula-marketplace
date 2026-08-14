# Kula Marketplace — notes for AI coding sessions

Peer-to-peer marketplace (yoga teaching resources). Roles overlap: any user
can self-upgrade buyer→seller; admin transitions are admin-only.
COMMISSION MODEL: buyer pays the listed price; kula takes fee_percent + flat
(default 30% + 25¢) via Stripe `application_fee_amount`; seller nets the rest
(monthly Express payouts). Supabase = auth, Postgres w/ RLS, private
`product-files` bucket + public `covers` bucket. Netlify hosting. Next.js 16.
PRODUCT STANCE: the owner's market (yoga teachers) is broadly AI-averse —
buyer-visible AI features are deliberately OFF and a designed
notes-photos→branded-PDF feature is ON HOLD by owner decision. Don't propose
or surface AI features without the owner asking. The AI-suggest flag reads
KULA_ANTHROPIC_API_KEY (NOT the generic ANTHROPIC_API_KEY name — Netlify's
AI Gateway auto-injects that into every site's runtime and once force-enabled
the feature; never gate anything on generic provider env names).

Optional keyed features (hidden without env): KULA_ANTHROPIC_API_KEY → AI
listing suggestions; RESEND_API_KEY → sale-notification emails; MAILCHIMP_API_KEY +
MAILCHIMP_AUDIENCE_ID → waitlist/consent signups mirror into a Mailchimp
Audience (mailing_list table stays the source of truth; signups go through
/api/mailing-list); NEXT_PUBLIC_GA_MEASUREMENT_ID → GA4 snippet
(components/analytics.tsx; privacy §7 cookie wording must be updated by the
owner before enabling in production).

## Invariants — never violate

- Orders are written ONLY by two server routes: `app/api/stripe/webhook/`
  (signature-verified, all PAID-money orders) and `app/api/claim-free/`
  ($0 rows for active free listings only). Client code never writes orders
  or confirms payments.
- `product-files` bucket stays private. File access only via
  `app/api/download/[productId]/route.ts` (paid-order check → signed URL).
- The service-role client (`lib/supabase/admin.ts`) is server-only. Everything
  user-facing goes through RLS-enforced clients.
- The commission comes from the `platform_settings` table, never hardcoded;
  it is taken OUT of the listing price (never added on top). Partner sellers
  may have a per-seller `profiles.commission_override` percent (null =
  default; flat fee always applies; override takes precedence over any later
  change to the platform default) — negotiated rates are PRIVATE: never
  expose them in the public `instructors` view or any buyer-facing UI.
  `profiles.partner`: auto-true when a rate is set; unmarking partner clears
  the override (see togglePartner in admin actions).
- Money-critical profile columns (commission_override, partner,
  stripe_charges_enabled, stripe_account_id) are guarded (migration 008):
  a user CANNOT change them on their own row — only admins, or the
  service-role/SQL context. RLS grants row access, not column access, so
  these need the trigger. Server writes to these columns MUST use the
  service-role client (see onboard route + dashboard Stripe sync), never the
  user's session, or the guard rejects them.
- Reviews only via RLS (paid order required); orders/downloads unchanged.
  Reviews are ONE-DIRECTIONAL by design (buyers→listings; sellers never
  rate buyers). Sellers may write one public reply per review — column-
  guarded (migration 010): seller touches ONLY reply/replied_at, buyer
  never touches the reply, paused accounts can't reply.
- Listing prices are $0 (free) or ≥$1.00 — nothing between (DB check,
  migrations 006+011). Free listings publish WITHOUT Stripe (no money moves);
  paid listings keep the draft-until-Stripe gate, including free→paid flips.
  Terms §4.6 was amended to match (paid min $1, free allowed) — the delta
  from her verbatim text is documented in the terms page header comment.
- Moderation (migration 007): `profiles.account_status` active|paused|deleted.
  Paused/deleted = buying blocked (checkout gate) + listings/profile ghosted
  via RLS read-path ONLY — product rows are never modified, prior buyers keep
  purchases, and NOTHING is ever hard-deleted. 'deleted' also login-bans via
  the auth admin API (see setAccountStatus). Only admins change the status
  (DB guard trigger).
- /terms, /privacy, /about copy is the owner's finalized text (fix-list
  appendices), VERBATIM except documented factual corrections (domain;
  privacy: Supabase not Replit as auth/infra provider). Don't rewrite it.
- All secrets/config via env vars (see `.env.example`) — the app must remain
  portable to a new owner's accounts by swapping env values only.
- The public contact email lives ONLY in lib/site.ts (CONTACT_EMAIL,
  env-overridable via NEXT_PUBLIC_CONTACT_EMAIL). Never hardcode the address
  in components/pages — import it.

## Gotchas

- Next.js 16: `proxy.ts` (exported function `proxy`) replaced `middleware.ts`;
  `params`/`searchParams`/`cookies()` are async — always `await`.
- Schema changes: add a NEW numbered file in `supabase/migrations/` (don't
  rewrite 001 — it has already been run on live projects) and apply it in the
  Supabase SQL editor.
- RLS is the real authorization layer; UI checks are convenience only.
- Homepage "featured" = the `featured_products` view (migration 013): admin
  picks (products.featured_at, ADMIN-ONLY via guard trigger) first, then a
  scored auto-fill (bayesian rating 50 / conversion 30 / 14-day-half-life
  recency 20 — weights live in the view). The view exposes only the blended
  score, never raw sales counts, and respects moderation ghosting.
  Shelf scope (app/page.tsx, owner decision Aug 2026): admin ★ ALWAYS
  features, free or paid; the scored auto-fill fills remaining slots from
  PAID listings only (unstarred freebies never score in — they have their
  own homepage row, which skips already-featured ids so a starred freebie
  never renders twice).
- Listing options (styles/content types/levels) live in `product_options`
  (migration 009), admin-curated from the dashboard; lib/categories.ts
  arrays are FALLBACK only (missing/empty table). Durations + teachability
  stay hardcoded on purpose (slider math / DB check constraint). Server
  components fetch via lib/options.ts and pass down as props.
- Listings cannot become 'active' unless the seller's
  `profiles.stripe_charges_enabled` is true (DB trigger, migration 005;
  admins and server contexts exempt). Drafts are always allowed.
- `profiles.role` changes are blocked by a DB trigger unless admin (or SQL
  editor / service role, where `auth.uid()` is null). Exception: users may
  self-flip buyer↔seller — signup no longer asks (one unified flow); the
  first post or Stripe onboard upgrades buyer→seller automatically.

## Commands

- `npm run dev` — local dev (plus `stripe listen --forward-to localhost:3000/api/stripe/webhook`)
- `npm run build` — must pass before pushing
- `npm run lint`
- `bash scripts/push-live.sh` — the ONLY way to push main (verifies repo,
  branch, and tree integrity, then confirms before deploying the live site)
