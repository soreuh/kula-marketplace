# kula — running project list

**How to use this file:** this is THE list. Check items off with `[x]` and a
date — never delete them (the done log is project memory). Add new items to
the right section as they come up. Conventions for how to build safely live
in `CLAUDE.md`; operational how-tos in `SETUP.md` / `HANDOVER.md`.

---

## Where the project stands — snapshot (2026-08-14)

**Live site:** https://kula-marketplace.com (Netlify, custom domain + TLS,
www + old yogamp.netlify.app resolve too). Peer-to-peer yoga teaching-content
marketplace: any user can buy; anyone can self-upgrade to seller; admin runs
fees, moderation, curation.

**Built and verified** (73/73 RLS tests; full E2E passed 2026-08-14):
signup/login + password reset · listing upload with PDF blurred previews,
cover images, Pexels placeholder fallbacks · free listings (publish without
Stripe) + paid ($1 floor) · Stripe Connect Express destination charges,
30% + $0.25 platform fee, per-seller negotiated partner rates (private) ·
webhook-driven orders, signed-URL downloads, refund handling · one-way
reviews + seller replies + instructor aggregate ratings · homepage: featured
shelf (admin ★ beats scored auto-fill; ★ overrides the paid-only scope) +
free-content shelf · admin: fee settings, listing options (styles/types/
levels), user moderation (pause/deactivate/soft-delete — nothing hard-
deletes), featured stars, partner rates · waitlist → Mailchimp audience
sync (instant subscribe, no captcha by owner decision — Turnstile
implementation was stashed in a Claude session, cheap to rebuild if junk
appears) · sale-notification emails via Resend from hello@kula-marketplace.com ·
GA4 wired · profile avatars.

**Whose accounts run what (as of the 2026-08-14 cutover):**

| Piece | Account | Notes |
|---|---|---|
| Domain kula-marketplace.com | HERS (Porkbun) | auto-renew ON, expires 2027-06-21; keep Porkbun nameservers FOREVER (email forwarding depends on them) |
| hello@ email forward | Porkbun → discoverkula@gmail.com | the From-address for Resend + Mailchimp |
| Resend (sale emails) | HERS | domain verified (DKIM/SPF/DMARC p=none) |
| Mailchimp (marketing) | HERS | domain authenticated; default From = hello@; free plan |
| Stripe | HERS — **test mode** | Connect enabled, monthly payouts, **Accounts v1 flag ON (never disable)**; live activation pending |
| Supabase / Netlify / GA / GitHub | HIS (Aleks) | migrate at full handover — see HANDOVER.md |

**Unit economics (verified with real test money):** $20 sale → buyer pays
$20.00 → seller nets $13.75 (~69%) → kula fee $6.25 → Stripe takes ~$0.88
→ **kula net ≈ $5.37 (~27% effective take)**. Refunds cost the platform the
~90¢ processing fee. Partner-rate floor: below ~4–5% override, kula loses
money per sale. Reference: `../kula-growth-model.xlsx` (Low ≈ dead · Mid
m24 ≈ $2.5k GMV / $610 kula/mo · High m24 ≈ $19.5k GMV / $5k kula/mo).

**Data state:** all test data (test seller `+kulaseller2562545`, test
buyers, the $20 "RLS Test Listing", the free "test" listing). Wipe before
real launch.

---

## Done log (compressed — details in git history)

- [x] 2026-08 Core marketplace build: auth, listings, checkout, downloads, reviews, admin, fee engine, partner rates, draft-until-Stripe (migrations 001–005)
- [x] 2026-08 Owner fix-list 1–8 + verbatim terms/privacy/about pages
- [x] 2026-08 Security audit → money-column guard (008); confirmed no spurious orders / no unpaid downloads / no cross-user data reads
- [x] 2026-08 User moderation (007): pause/deactivate/delete = ghosting, never data loss
- [x] 2026-08 Admin-editable listing options (009); review replies (010); password reset flow; contact email centralized (lib/site.ts)
- [x] 2026-08 Free listings (011) + Terms §4.6 amendment; claim-free route; homepage free shelf
- [x] 2026-08 Profile avatars (012); Pexels placeholder covers (12 images + licenses)
- [x] 2026-08 Featured curation (013): admin ★ + bayesian/conversion/recency score; ★ beats paid-only scope
- [x] 2026-08 Mailchimp audience sync (instant subscribe); Resend integration built (dormant until keyed)
- [x] 2026-08-14 **Domain & email cutover, phases 0–6**: Replit delinked · DNS → Netlify (Porkbun records, NS kept) · site URL/env/Supabase auth/GA/webhook repointed · Resend + Mailchimp domain-authenticated · hello@ forward live · 12-point E2E green (incl. spam-fix proof)
- [x] 2026-08-14 **Phase 7 — Stripe ported to HER account (test)**: Connect + monthly payouts + v1 flag; new webhook; DB reset; seller re-onboarded; purchase, sale email, refund + transfer reversal all verified in her dashboard
- [x] 2026-08-14 Stripe onboarding hardening (errors surface instead of hanging); copy honesty pass (fictional "$5 payout floor" + "turn off in dashboard" removed)
- [x] 2026-08-14 Legal hardening pass on terms + privacy (deltas in page header comments): assumption-of-risk §5.4, chargebacks §6, no-pre-screen §9 fix, retention honesty, processor list, security §7.1, misc §12.1 — **lawyer review still required before launch**

---

## Before her small-circle launch (the "go-live" checklist)

- [ ] Push the pending commit (legal pass + copy honesty + docs) if not already live
- [ ] Lawyer pass on /terms + /privacy — deltas are listed in each page's header comment; ask specifically about adding an arbitration/class-action clause (deliberately left out)
- [ ] Test-data wipe: script or manual SQL to remove test users/listings/orders (keep platform_settings + product_options); delete "RLS Test Listing" + test accounts
- [ ] Supabase: turn email confirmations back ON (Auth → Sign In / Providers)
- [ ] Supabase custom SMTP via her Resend (Auth → SMTP: smtp.resend.com / user `resend` / pass = API key / from noreply@kula-marketplace.com) — auth emails from her domain instead of Supabase's rate-limited shared sender
- [ ] Stripe live mode: she completes activation → swap `sk_live_`, create live webhook (same 4 events) → **check the Accounts v1 flag applies in live mode before the first real seller connects**
- [ ] Her real content: 3–5 paid listings + 1–2 strong freebies, real covers, filled instructor profile + avatar (kills the placeholder look and seeds the featured shelf)
- [ ] Mailchimp footer address: swap her home address for a PO box / virtual mailbox if she wants (CAN-SPAM requires *an* address; every campaign prints it)
- [ ] Decide backup posture: Supabase free-tier backups vs paid PITR before real sales exist
- [ ] Uptime monitor on the domain (UptimeRobot free or similar) pinging /, alerting discoverkula@gmail.com

## Tech — small

- [ ] Seller notification preferences: `profiles.email_sale_notifications` + dashboard toggle + webhook check; then restore the "turn these off in your dashboard" sentence in lib/email.ts (removed 2026-08-14 because it was fiction)
- [ ] SEO basics audit: per-page titles/descriptions, OG image for link sharing, sitemap.xml + robots.txt
- [ ] Post-purchase review nudge (Resend email ~3 days after purchase: "how was it? leave a review") — feeds the rating flywheel the featured score runs on
- [ ] Captcha (Turnstile) on signup/waitlist IF junk signups appear — was built + stashed in a Claude session; rebuild is ~an hour if the stash is gone
- [ ] Seed listing: her "power flow (twist)" PDF as a real free listing (seed SQL exists in the Yoga App folder, or upload via UI)
- [ ] Homepage seller-economics strip (idea #2, mockup offer stands): "you keep ~70% of every sale · no signup fee · no membership"
- [ ] Dispute/chargeback auto-reversal block in the webhook if chargebacks ever become real (manual via dashboard until then)

## Tech — large

- [ ] Stripe Accounts v2 migration (onboard route, webhook, dashboard sync → /v2/core/accounts) — before serious scale or if Stripe announces v1 sunset; until then the v1 flag carries it
- [ ] Full handover of HIS accounts (Supabase/Netlify/GitHub/GA) to her — HANDOVER.md is the playbook; env-var swap is the entire code-side migration
- [ ] Search/discovery beyond the explore grid IF catalog grows past ~50 listings (filters exist; think ranking, collections, seller storefolios)

## Funnel & marketing

- [ ] **Supply first** (marketplace cold-start rule): 10–20 quality listings before any demand push — her own content + 2–3 recruited anchor teachers
- [ ] Anchor sellers: recruit 2–3 respected teachers using the partner-rate tool (negotiated commission, PRIVATE) — their names seed trust and the featured shelf
- [ ] Positioning: lean into human-made/teacher-to-teacher — this community is explicitly AI-averse; "handcrafted by instructors" is already the featured-shelf tagline. (Related standing rule: buyer-visible AI features stay OFF.)
- [ ] Freebie funnel: 1–2 strong free listings as lead magnets (account required to claim → mailing list + future buyer). Watch freebie-claim → paid-purchase conversion
- [ ] Seller pitch math for outreach: kula ≈ 69% free-to-join vs TpT Basic 55% − 30¢ + $29 fee (TpT Premium 80% only wins after ~48 sales/yr at $59.95/yr)
- [ ] Small-circle launch motion: her studio/teacher network first → collect reviews (ratings power the featured score) → then public channels
- [ ] Channels list: her IG + classes/workshops, yoga-teacher FB groups, r/yogateachers-type communities, teacher trainings she knows
- [ ] Mailchimp warm-up when she upgrades: welcome journey (trigger: `kula-waitlist` tag), then a monthly newsletter rhythm; invite Aleks as admin seat
- [ ] Metrics dashboard habit (GA + Stripe + admin): visitors → signups → first purchase; seller activation (signup → first listing → Stripe connected); track against the growth model's Mid path (~$610/mo kula by month 24 = on track)
- [ ] Pricing stance: HOLD at 30% + $0.25 (analysis 2026-08: raising the flat fee to ~$1 punishes the $5–10 price band where early supply lives)

## Parked / ideas (unprioritized — do not build without owner ask)

- Notes-photos → branded-PDF generator (Anthropic API): owner loves it, community is AI-averse → ON HOLD by owner decision; monetizable ($1.99/plan) with backend toggle if ever revived
- Bundles / coupons / gifting — classic marketplace levers, zero validation yet
- Seller analytics page (views→sales funnel per listing) — the data already exists in products.views + orders
