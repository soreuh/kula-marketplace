# HANDOVER — running Kula Marketplace as its new owner

*Written for a smart non-technical owner. No coding required — every step is
"go to this website, click this button." Budget a relaxed afternoon. Aleks can
sit with you for the two steps marked 🤝 (they involve his accounts).*

## What you're taking ownership of

Kula Marketplace is three services working together, plus the code that ties
them into one website:

| Service | What it does | Monthly cost |
| --- | --- | --- |
| **GitHub** | Stores the code. Netlify watches it and republishes the site when the code changes. | Free |
| **Supabase** | The database: every user account, listing, order, and the uploaded files live here. | Free to start |
| **Stripe** | Moves the money. Buyers pay; Stripe sends sellers their share to their bank and deposits your fee to yours. It also handles sellers' identity checks and tax forms. | No monthly fee; ~2.9% + 30¢ per sale + $2/mo per seller who got a payout |
| **Netlify** | Publishes the website to the internet at your domain. | Free to start |

Once the swap below is done, **every one of these runs under YOUR accounts** —
your logins, your dashboards, your money. Nothing stays attached to Aleks.

---

## Part 1 — Create your four accounts (~15 min)

**GitHub** (do this one first — it can log you into the others)
1. Go to **github.com** → **Sign up**.
2. Use your everyday email, pick a username (this is semi-public — something
   like `yourname` or `kulamarketplace` is fine), verify the email code.
3. Free plan. Done — you never need to touch GitHub again after Part 2.

**Supabase**
1. Go to **supabase.com** → **Start your project** → **Continue with GitHub**
   (use the account you just made) → authorize it.

**Netlify**
1. Go to **netlify.com** → **Sign up** → **Sign up with GitHub** → authorize.

**Stripe**
1. Go to **stripe.com** → **Sign up** with your email.
2. It will ask about your business. Answer as yourself (sole proprietor is
   fine to start; you can upgrade to an LLC later). This is the one account
   where real identity matters — it's a money account.
3. You don't need to "activate" (go live) yet — everything below works in
   **test mode** first.
4. One quirk of newer Stripe accounts: before the FIRST seller can connect,
   enable "**Accounts v1 support**" at
   dashboard.stripe.com/settings/features/feat_accounts_v1_support (the app
   uses Stripe's classic account-creation API; without the flag, the connect
   button errors with "not connected to your platform"). Also complete the
   Connect **platform profile** questionnaire when the dashboard asks —
   marketplace, digital products, platform responsible for losses.

---

## Part 2 — 🤝 Move the code into your GitHub (5 min, with Aleks)

Aleks transfers the repository (the code folder) to you:

1. *Aleks:* on the repo page → **Settings** → scroll to **Danger Zone** →
   **Transfer ownership** → types your GitHub username.
2. *You:* accept the email invitation GitHub sends you.
3. The code now lives at `github.com/YOUR-USERNAME/kula-marketplace`. That's
   the master copy of the site.

---

## Part 3 — Your own database (Supabase, ~10 min)

1. **supabase.com** → dashboard → **New project**.
   - Name: `kula-marketplace`
   - Database password: click **Generate**, then save it in your password
     manager (you'll rarely need it, but never lose it).
   - Region: East US.
   - Wait ~2 minutes while it sets up.
2. Left sidebar → **SQL Editor** → **New query**.
3. Run EVERY file in the `supabase/migrations` folder, in numeric order
   (001, 002, 003, 004, …), each in its own query. (On GitHub: browse to
   `supabase` → `migrations` → click a file → the **copy** icon copies the
   whole thing.)
4. Each should say "Success". Together they are your entire database: user
   accounts, listings with all their metadata, orders, reviews, the mailing
   list, file storage, and all the security rules — including your 30% + 25¢
   commission.
5. Collect your keys (you'll paste them into Netlify in Part 4):
   **Project Settings (gear icon) → API** — keep this browser tab open:
   - **Project URL**
   - **anon / publishable** key
   - **service_role / secret** key ⚠️ this one is the master key — treat it
     like a bank password. Only ever paste it into Netlify.

---

## Part 4 — Publish the site (Netlify, ~10 min)

1. **netlify.com** → **Add new site** → **Import an existing project** →
   **GitHub** → choose `kula-marketplace`.
2. Don't change any build settings — Netlify recognizes the site type
   automatically.
3. Before clicking Deploy, find **Environment variables** (or add them right
   after under **Site configuration → Environment variables**). Add these six
   — names must match EXACTLY, values come from your open tabs:

   | Name | Value from |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → anon/publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → service_role/secret key |
   | `STRIPE_SECRET_KEY` | Stripe → Developers → API keys → **Secret key** (starts `sk_test_` while testing) |
   | `STRIPE_WEBHOOK_SECRET` | Part 5 below — come back and fill it in |
   | `NEXT_PUBLIC_SITE_URL` | your site's address — Netlify shows it after the first deploy, like `https://something.netlify.app` |

4. **Deploy**. Two of the values (`STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_SITE_URL`)
   you can only fill in after this first deploy — add them, then
   **Deploys → Trigger deploy → Deploy site** to republish.
5. Your marketplace is now live at the `.netlify.app` address. 🎉

---

## Part 5 — Connect the money pipe (Stripe webhook, ~5 min)

This is how Stripe tells your site "payment succeeded — release the file."
Without it, purchases never complete.

1. **Stripe** → **Developers** → **Webhooks** → **Add endpoint**.
2. Endpoint URL: `https://YOUR-SITE-ADDRESS/api/stripe/webhook`
   (your real address plus `/api/stripe/webhook`).
3. **Select events** — pick exactly these four:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.expired`
   - `charge.refunded`
4. Add endpoint → click it → **Reveal** the **Signing secret** (`whsec_...`) →
   copy it into Netlify as `STRIPE_WEBHOOK_SECRET` → trigger another deploy
   (Part 4 step 4).

---

## Part 6 — Crown yourself admin (2 min)

1. On your live site: **Sign up** with your email (either role — doesn't matter).
2. Supabase → **SQL Editor** → **New query** → paste, with your email:

   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```

3. **Run**, then log out and back in on the site. Your Dashboard is now the
   admin panel: set the platform fee, see every order and your fee revenue,
   suspend listings, and change any user's role — no more SQL ever needed.

---

## Part 7 — Test drive with fake money (~10 min)

Stripe is still in test mode, so play freely:

1. Sign up (second email or `test-seller@example.com`) → Dashboard →
   **Connect Stripe** → fill the onboarding with fake info (phone
   `000-000-0000`, code `000-000`, use the test bank it offers).
2. Post a listing with any PDF, price it $10, fill the required details,
   publish.
3. In a private/incognito window sign up as a **buyer** and buy it with card
   number `4242 4242 4242 4242`, any future date, any CVC.
4. Confirm: the file auto-downloaded on the success page; the seller's
   earnings tab shows $10.00 gross → **$6.75 net** with your $3.25 fee; and
   the order (with your fee) appears in your admin dashboard.

---

## Part 8 — Go live (when you're ready for real sales)

1. **Stripe**: complete account activation (real identity/bank details) — the
   dashboard walks you through it. Then flip the test/live toggle and copy the
   **live** Secret key (`sk_live_...`) into Netlify, replacing the test one.
2. Create a **second webhook endpoint** while in live mode (same URL, same four
   events — test and live each have their own signing secret) and update
   `STRIPE_WEBHOOK_SECRET` with the live `whsec_...`. Redeploy.
3. **Supabase** → Authentication → Sign In / Providers → Email → turn
   **"Confirm email" ON** (real users should verify their addresses). Also
   check **Authentication → URL Configuration**: Site URL should be your
   real domain, with `https://YOUR-DOMAIN/**` in Additional Redirect URLs —
   password-reset emails refuse to link anywhere not on that list.
4. Point your domain (e.g. kula-marketplace.com) at Netlify: **Domain
   management → Add a domain** and follow its DNS instructions, then update
   `NEXT_PUBLIC_SITE_URL` to `https://kula-marketplace.com` and redeploy.
5. **Google Analytics moves with the address.** Whenever the site's URL
   changes (netlify.app → your real domain), don't keep the old tag: create
   your own GA4 property under YOUR Google account (analytics.google.com →
   Admin → Create property → add a Web data stream with the new URL), copy
   its new `G-...` Measurement ID into Netlify as
   `NEXT_PUBLIC_GA_MEASUREMENT_ID`, and redeploy. (If you're only changing
   the domain on a property you already own, editing the data stream's URL
   in GA Admin works too — but a new URL under a new owner means a fresh
   tag.) Analytics stays completely off until that variable exists.
6. The site's public contact email (footer, terms, privacy) is set in ONE
   place: add `NEXT_PUBLIC_CONTACT_EMAIL` in Netlify's environment variables
   with your address and redeploy — every page updates at once. (Without
   that variable it uses the default written in `lib/site.ts`.)
7. The legal pages (/terms, /privacy, /about) already carry your finalized
   text — have a lawyer look them over before real sales. One thing they
   don't yet cover: chargebacks. Card disputes debit KULA's Stripe balance
   (not the seller's) plus a dispute fee; the seller's share can be pulled
   back by reversing their transfer, which is easiest before their monthly
   payout. Consider adding a chargeback clause to the Terms.

---

## 🤝 What happens to Aleks's version?

His Supabase/Stripe/Netlify projects were only ever the test environment.
Nothing from them needs to move — your projects start clean. Once you're live
he can simply delete his.

## If something breaks later

- **Purchases stop completing** → 9 times out of 10 it's the webhook: Stripe →
  Webhooks → your endpoint will show red failed attempts. Check that
  `STRIPE_WEBHOOK_SECRET` in Netlify matches the endpoint's signing secret.
- **Site won't build after a code change** → Netlify → Deploys → click the
  failed deploy to see the log, or just **retry** the previous good one.
- **Need a code change** → the code is yours on GitHub; any developer (or
  Aleks, or an AI coding tool — there's a `CLAUDE.md` briefing file in the
  repo for exactly that) can work on it.
