# SETUP — get Kula Marketplace running on YOUR keys

Time: ~20 minutes. Everything is test-mode until step 8 — no real money moves.

## 0. Prerequisites

- Node.js 20.9+ (`node -v`)
- A [Supabase](https://supabase.com) account (free tier is fine)
- A [Stripe](https://stripe.com) account (test mode — no business details needed yet)
- Stripe CLI for local webhook testing: `brew install stripe/stripe-cli/stripe`

## 1. Create the Supabase project

1. supabase.com → **New project** → name it `kula-marketplace`, pick a strong DB
   password (save it somewhere), region close to you → **Create**.
2. When it finishes provisioning: left sidebar → **SQL Editor** → **New query**.
3. Open `supabase/migrations/001_init.sql` from this repo, copy the ENTIRE file,
   paste, hit **Run**. You should see "Success. No rows returned".
   That one file is the whole database: tables, security policies, the private
   file bucket, triggers.

## 2. While testing: turn off email confirmation

**Authentication → Sign In / Providers → Email** → toggle OFF "Confirm email".
(Otherwise every test signup waits on a confirmation link. Turn it back on
before real users arrive.)

## 3. Environment variables

```bash
cp .env.example .env.local
```

Fill in, from **Supabase → Project Settings → API**:

- `NEXT_PUBLIC_SUPABASE_URL` — the Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the `anon` / "publishable" key
- `SUPABASE_SERVICE_ROLE_KEY` — the `service_role` / "secret" key (server-only — never ends up in the browser, never in git)

From **Stripe → Developers → API keys** (test mode toggle ON):

- `STRIPE_SECRET_KEY` — `sk_test_...`

Leave `STRIPE_WEBHOOK_SECRET` for step 5 and `NEXT_PUBLIC_SITE_URL` as
`http://localhost:3000`.

## 4. Run it

```bash
npm install
npm run dev
```

http://localhost:3000 — the empty marketplace.

## 5. Stripe webhook (local)

In a second terminal:

```bash
stripe login          # once
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

It prints `whsec_...` → paste into `.env.local` as `STRIPE_WEBHOOK_SECRET`,
restart `npm run dev`. Keep `stripe listen` running while you test purchases —
it is what marks orders as paid.

## 6. Test the whole loop (test mode — fake money)

1. **Sign up** as a seller (pick "Sell my resources").
2. Dashboard → **Connect Stripe** → Stripe's test onboarding: use any fake
   info; phone `000-000-0000`, SMS code `000-000`, and the test bank account
   it offers. (This is Stripe Connect **Express** — in live mode Stripe
   handles the seller's real identity + bank + tax forms.)
3. Create a listing: title, price (e.g. $20), attach any PDF. Publish.
4. Log out → sign up again as a **buyer** (different email; with confirmations
   off, fake emails like `buyer1@test.com` work).
5. Buy it — card `4242 4242 4242 4242`, any future expiry, any CVC.
   Note the checkout shows the listing price and the platform fee as separate
   line items.
6. You land on the success page → **Download**. Check the buyer library and,
   logged back in as the seller, the sales list.

## 7. Make yourself admin

Supabase → SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'YOUR-EMAIL-HERE';
```

Log out/in → Dashboard now shows fee settings, all orders, fee revenue,
suspend buttons, and role management. (Later, promote/demote anyone from the
admin UI instead of SQL.)

## 8. Deploy to Netlify

1. Push this repo to GitHub (private is fine).
2. netlify.com → **Add new site → Import an existing project** → pick the
   repo. Netlify auto-detects Next.js — don't override build settings.
3. Site configuration → **Environment variables** → add every var from
   `.env.local`, with two changes:
   - `NEXT_PUBLIC_SITE_URL` = your Netlify URL (e.g. `https://kula-marketplace.netlify.app`)
   - `STRIPE_WEBHOOK_SECRET` = from the next step
4. Stripe → Developers → **Webhooks → Add endpoint**:
   - URL: `https://YOUR-SITE/api/stripe/webhook`
   - Events: `checkout.session.completed`,
     `checkout.session.async_payment_succeeded`, `checkout.session.expired`,
     `charge.refunded`
   - Copy the **Signing secret** (`whsec_...`) into Netlify env → redeploy.
5. Custom domain (e.g. kula-marketplace.com): Netlify → Domain management →
   add domain, follow the DNS instructions, then update
   `NEXT_PUBLIC_SITE_URL` to the custom domain and redeploy.

## 9. Going live (when ready — after handover, on HER accounts)

- Stripe: complete platform activation, swap `STRIPE_SECRET_KEY` to
  `sk_live_...`, create a live-mode webhook endpoint (new `whsec_...`).
- Supabase: turn "Confirm email" back ON.
- Add real Terms of Service / refund policy / seller agreement pages
  (chargebacks hit the seller's balance under destination charges — disclose
  that in the seller agreement).

## Troubleshooting

- **Order stuck "pending" after a test purchase** → `stripe listen` isn't
  running, or `STRIPE_WEBHOOK_SECRET` is stale (it changes each `stripe listen`
  session unless you use `--skip-verify`... just re-copy it).
- **"This seller hasn't finished payment setup yet"** → the seller never
  completed Connect onboarding; hit Connect Stripe again (it resumes).
- **Signup says "check your email"** → step 2 toggle.
- **`supabase gen types`** (optional, nice-to-have): regenerate
  `lib/types.ts`-style typings once you have the CLI linked.
