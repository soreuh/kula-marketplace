# kula — Replit workspace rules

This is the LIVE codebase for kula (kula-marketplace.com), a marketplace where
yoga teachers buy and sell teaching materials. Real payments run through this
code. This workspace exists for **UI/UX work only**.

## ⛔ DO NOT CHANGE CODE RELATING TO BACK END MECHANICS

That rule is absolute. It covers, specifically — do not edit, refactor,
"improve," or reformat ANY of these:

- `app/api/**` — every API route (checkout, Stripe webhook, Stripe onboarding,
  downloads, AI suggestions). The webhook is the only thing allowed to mark
  orders paid. Never create a new way to write orders or grant downloads.
- `lib/supabase/**` — database clients and session plumbing.
- `lib/stripe.ts`, `lib/fees.ts`, `lib/email.ts` — payment client, money math
  (commission = 30% + $0.25 taken OUT of the listing price), sale emails.
- `supabase/**` — database migrations and security tests. Never run SQL or
  create new migrations.
- `proxy.ts` — auth/session middleware.
- Any `supabase.from(...)`, `supabase.storage`, `supabase.auth`, `supabase.rpc`,
  or `fetch("/api/...")` call inside pages/components: the *calls and their
  logic stay exactly as they are*. You may move them around a layout; you may
  not change what they query, insert, update, or gate.
- Auth logic in `app/login` / `app/signup` (the `supabase.auth.*` calls and the
  role metadata they send). Restyle the forms freely.
- The licensing-agreement checkbox gating the buy button, the paid-order check
  before downloads, and the Stripe-connected gate before posting content.
  These may be restyled, never removed or weakened.
- `package.json` — do not add, remove, or upgrade dependencies. If a design
  idea needs a new package, stop and ask Aleks.

If a requested change seems to require touching anything above: **stop, do not
attempt a workaround, and leave a note for Aleks instead.**

## ✅ what this workspace IS for

Visual and experience work — change how things look, never what they do with
data or money:

- Tailwind classes, spacing, color, typography (`app/globals.css` tokens are
  the design system: sage greens, cream, `font-display` Poppins headings in
  lowercase).
- Layout and composition of pages, copy/wording, empty states, icons,
  animations, responsive behavior.
- Purely presentational components in `components/` (and new ones you create),
  as long as the data they receive and the actions they trigger are unchanged.
- Reordering sections, improving forms' look and validation messages, better
  mobile experience.

## workflow rules

- Work ONLY on the `her-workspace` branch. Never commit to, push to, or merge
  into `main` — main auto-deploys to the live production site.
- Never use Replit's Deploy feature for this project. Production is Netlify.
- Never edit or read out Secrets; never print environment variables.
- Preview with the Run button (`npm run dev`). The site talks to the real test
  database, so listings and accounts you see are shared.
- If the workspace gets into a broken state, restore it in the Shell with:
  `git fetch origin && git reset --hard origin/her-workspace && git clean -fd`

## how the app fits together (context, not an invitation to edit)

Next.js 16 (App Router) · Supabase (auth, Postgres with row-level security,
file storage) · Stripe Connect (payments, monthly seller payouts) · Netlify
(production hosting). Pages: `/` `/explore` `/products/[id]` `/profile/[id]`
`/library` `/dashboard` `/purchase-success` plus about/privacy/terms. Buyers
pay the listed price; the platform commission comes out of it; sellers see
their net everywhere. Row-level security in the database is the real
authorization layer — UI checks are cosmetic, which is exactly why UI work
here is safe as long as the rules above are followed.
