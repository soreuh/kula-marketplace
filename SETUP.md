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
3. Run EVERY file in `supabase/migrations/`, in numeric order (each: copy the
   ENTIRE file, paste, **Run**):
   1. `001_init.sql` — tables, security policies, private file bucket, triggers.
   2. `002_product_v2.sql` — listing metadata, reviews, mailing list, covers
      bucket, instructor profiles, the 30% + 25¢ commission defaults.
   3. `003_partner_rates.sql` — per-seller negotiated commission (partner
      rates; set from the admin Sellers panel).
   4. `004_partner_flag.sql` — explicit partner status (auto-set when a rate
      is negotiated; removing it clears the deal).
   5. `005_draft_until_stripe.sql` — sellers can prep listings before
      connecting Stripe, but nothing goes live until they're verified.
   6. `006_price_floor.sql` — $1.00 minimum listing price (matches the
      Terms & Conditions).
   7. `007_user_moderation.sql` — admin pause / activate / soft-delete for
      accounts (paused users can't buy and their listings are hidden;
      deleting also blocks sign-in; all data is always retained).
   8. `008_profile_column_guard.sql` — locks money-critical profile columns
      (commission rate, Stripe status) so only admins/the server can change
      them, never a user editing their own row.
   9. `009_product_options.sql` — the seller-facing choice lists (yoga
      styles, content types, levels) become admin-editable from the
      dashboard's "listing options" panel.
   10. `010_review_replies.sql` — sellers can post one public response to
       each review of their listings (never altering the review itself).
   11. `011_free_listings.sql` — sellers can list FREE content ($0), which
       publishes even before Stripe is connected (paid listings keep the
       $1 minimum and the Stripe gate).

   (Existing project? Just run the ones you haven't run yet, in order.)

## 2. While testing: turn off email confirmation

**Authentication → Sign In / Providers → Email** → toggle OFF "Confirm email".
(Otherwise every test signup waits on a confirmation link. Turn it back on
before real users arrive.)

Also set **Authentication → URL Configuration**: Site URL = your deployed
address (e.g. `https://yogamp.netlify.app`), and add
`http://localhost:3000/**` plus `https://YOUR-SITE/**` to Additional Redirect
URLs. Password-reset links refuse to redirect anywhere not on this list.
(Supabase itself sends the reset/confirmation emails — no Resend/DNS needed;
its built-in sender is rate-limited to a few per hour, fine for testing.)

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

The public contact email (footer, terms, privacy) is centralized in
`lib/site.ts` — change it there once, or override with
`NEXT_PUBLIC_CONTACT_EMAIL` in env without any code edit.

Optional (each feature stays hidden until keyed): `KULA_ANTHROPIC_API_KEY`
turns on AI metadata suggestions in the upload dialog (prefixed KULA_ because
hosts like Netlify auto-inject a generic `ANTHROPIC_API_KEY` into every site,
which must NOT enable the feature); `RESEND_API_KEY` turns on sale
notification emails to sellers; `MAILCHIMP_API_KEY` + `MAILCHIMP_AUDIENCE_ID`
mirror every waitlist/consent signup into your Mailchimp Audience (they always
land in your own database's `mailing_list` table too), so you can send
newsletters from Mailchimp; `NEXT_PUBLIC_GA_MEASUREMENT_ID` (the `G-...` id
from your GA4 web data stream) turns on Google Analytics — update the privacy
policy's cookie wording before enabling it in production.

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
3. Create a listing: attach a PDF, fill the required fields (style, type,
   duration, level, theme, teachability), price it e.g. $10, tick the
   IP-ownership box, publish. A blurred first-page preview generates
   automatically for PDFs.
4. Log out → sign up again as a **buyer** (different email; with confirmations
   off, fake emails like `buyer1@test.com` work).
5. Buy it — card `4242 4242 4242 4242`, any future expiry, any CVC. The buyer
   pays the listed price; the commission comes out of it invisibly.
6. The success page auto-downloads the file after a second. Then check: your
   library, the review form on the listing, and — back as the seller — the
   earnings tab: $10.00 gross, $3.25 kula fee, **$6.75 your net**.

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
6. If Google Analytics is on: a URL change means updating GA too — edit the
   web data stream's URL (GA → Admin → Data streams), or, when the site
   moves to a new owner's Google account, create a fresh GA4 property there
   and swap the new `G-...` id into `NEXT_PUBLIC_GA_MEASUREMENT_ID`.

## 9. Going live (when ready — after handover, on HER accounts)

- Stripe: complete platform activation, swap `STRIPE_SECRET_KEY` to
  `sk_live_...`, create a live-mode webhook endpoint (new `whsec_...`).
- Supabase: turn "Confirm email" back ON.
- The legal pages (/terms, /privacy) are the owner's finalized text — have a
  lawyer review before launch. Disputes note: with destination charges,
  chargebacks debit the PLATFORM's Stripe balance (disputed amount + Stripe's
  dispute fee), not the seller's. The seller's share can be recovered by
  reversing their transfer — easiest while funds are still in their balance,
  i.e. before their monthly payout. Consider adding an explicit chargeback
  clause to the Terms (they are currently silent on it).

## Troubleshooting

- **Order stuck "pending" after a test purchase** → `stripe listen` isn't
  running, or `STRIPE_WEBHOOK_SECRET` is stale (it changes each `stripe listen`
  session unless you use `--skip-verify`... just re-copy it).
- **"This seller hasn't finished payment setup yet"** → the seller never
  completed Connect onboarding; hit Connect Stripe again (it resumes).
- **Signup says "check your email"** → step 2 toggle.
- **`supabase gen types`** (optional, nice-to-have): regenerate
  `lib/types.ts`-style typings once you have the CLI linked.
