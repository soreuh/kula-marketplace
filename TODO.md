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
- [x] 2026-08-14 **Account signup → Mailchimp (015)**, owner decision: the signup consent line now also covers marketing ("...and to receiving occasional updates from kula — unsubscribe any time"), every new account POSTs to /api/mailing-list with `source: "account"` (tag `kula-account`, so account signups stay separable from cold waitlist emails), `profiles.marketing_consent` stamped true by the trigger, and the post-login consent modal was REMOVED (components/consent-modal.tsx → _to_delete/, unmounted from layout.tsx). Privacy §3 reworded to match — it previously said updates go to "waitlist subscribers (if you signed up)", which the change made false. **Known trade-off, recorded on purpose:** one checkbox covering terms + marketing is bundled consent — fine under US CAN-SPAM (Mailchimp supplies unsubscribe + physical address), NOT valid under GDPR/CASL. Split into two checkboxes before marketing to EU/Canada recipients. Unsubscribes live in Mailchimp and are not mirrored back to the DB column.
- [x] 2026-08-14 **Signup clickwrap consent (014)**: required unchecked checkbox agreeing to /terms + /privacy (links open in new tabs), submit blocked until ticked; acceptance recorded on the profile with a SERVER-stamped `terms_accepted_at` + `terms_version` (lib/site.ts `TERMS_VERSION`, currently "2026-08-14"), both columns added to the 008 column guard so users can't set/backdate their own. Confirmed account signup does NOT touch Mailchimp — marketing opt-in stays the separate post-login consent modal (unbundled by design). Old rows keep NULL = "predates the checkbox"; never backfill.
- [x] 2026-08-14 Legal hardening pass on terms + privacy (deltas in page header comments): assumption-of-risk §5.4, chargebacks §6, no-pre-screen §9 fix, retention honesty, processor list, security §7.1, misc §12.1 — **lawyer review still required before launch**

---

## Before her small-circle launch (the "go-live" checklist)

- [ ] Push the pending commit (legal pass + copy honesty + docs) if not already live
- [x] 2026-08-14 **Applied migrations 014 + 015** and deployed. Verified end-to-end with a real signup (`+tos`): `terms_accepted_at` == `created_at` (server-stamped by the trigger, not a client clock), `terms_version` = 2026-08-14, `marketing_consent` = true, and a `mailing_list` row with `source: account` ~3s later. Live /signup serves the consent line with working /terms + /privacy links, the checkbox blocks submit until ticked, and the contact landed in HER Mailchimp audience (tag `kula-account`, status Subscribed, source "API - kula mvp") — full loop confirmed, no hop unverified. Accounts created BEFORE this (izzy, the +buyer1/+pl/aleks.sorra test rows) correctly show NULL terms — they predate the checkbox and must never be backfilled; the test-data wipe removes them anyway.
- [x] 2026-08-14 consent-modal deletion committed. NOTE for anyone auditing: `_to_delete/` is in .gitignore (line 39) and is NOT git-tracked — `git ls-files _to_delete` returns nothing. Delete the folder from Finder whenever; no git command needed.
- [x] 2026-08-14 Build verified on the Mac (lint + tsc + next build all green) and pushed. NOTE for future AI sessions: `npm run build` CANNOT run over the Cowork device bridge (that VM has no network; node_modules is a macOS install so Next tries to fetch a linux-arm64 swc binary). Don't run `git` over the bridge either — it can't remove .git/index.lock and leaves the repo locked.
- [ ] Delete the stray 87-byte `package-lock.json` in the parent "Yoga App" folder — it's outside the repo and makes every build print a turbopack.root warning
- [ ] Bump `TERMS_VERSION` in lib/site.ts + the "last updated" lines on /terms and /privacy whenever the legal text changes in substance (e.g. after the lawyer pass) — old profile rows keep the old version, which is how you'd find who needs to re-consent
- [x] 2026-08-14 **Applied migrations 016 + 017** (run as separate queries — the enum-in-transaction constraint). Proven live: archived status works, and an archived listing's review still counts toward the instructor rating.
- [ ] Storage housekeeping: replaced files and archived listings' files are kept forever BY DESIGN. If storage cost ever matters, write a reviewed cleanup that only ever touches objects with zero paid orders — never a blanket sweep
- [ ] Lawyer pass on /terms + /privacy — deltas are listed in each page's header comment; ask specifically about adding an arbitration/class-action clause (deliberately left out)
- [ ] Test-data wipe: script or manual SQL to remove test users/listings/orders (keep platform_settings + product_options); delete "RLS Test Listing" + test accounts
- [ ] Supabase: turn email confirmations back ON (Auth → Sign In / Providers) — deliberately left OFF 2026-08-14 while testing; SMTP is already live, so this is now a one-toggle change
- [x] 2026-08-14 Supabase custom SMTP via her Resend (Auth → Emails → SMTP: smtp.resend.com:587 / user `resend` / pass = RESEND_API_KEY / from `Kula Marketplace <noreply@kula-marketplace.com>`) — verified: password-reset mail delivers to Gmail **Inbox**, not spam. Note: noreply@ has NO Porkbun forward (replies vanish); auth mail now counts against her Resend send cap. Auth rate limit (Auth → Rate Limits) still at Supabase's low default — raise it when confirmations go on.
- [ ] Stripe live mode: she completes activation → swap `sk_live_`, create live webhook (same 4 events) → **check the Accounts v1 flag applies in live mode before the first real seller connects**
- [ ] Her real content: 3–5 paid listings + 1–2 strong freebies, real covers, filled instructor profile + avatar (kills the placeholder look and seeds the featured shelf)
- [ ] Mailchimp footer address: swap her home address for a PO box / virtual mailbox if she wants (CAN-SPAM requires *an* address; every campaign prints it)
- [ ] Decide backup posture: Supabase free-tier backups vs paid PITR before real sales exist
- [ ] Uptime monitor on the domain (UptimeRobot free or similar) pinging /, alerting discoverkula@gmail.com

## Admin portal redesign (2026-08-14 — built, pending migration 020 + owner verify)

- [x] **last_seen_at stickiness tracking (021)**: `profiles.last_seen_at`,
  stamped by the middleware on page views and throttled by a 1-hour COOKIE so
  steady-state cost is zero extra queries (NOT stamped in the layout — server
  components must stay pure, the linter enforces it). Supabase's own
  last_sign_in_at was rejected: persistent sessions mean an active daily user
  never "signs in" and would look dead. Backfilled from auth.last_sign_in_at
  in the migration. People panel shows "seen Xh ago" per user + a last-seen
  sort. Failure-blind: un-run migration or write hiccup never affects
  browsing. Future idea: WAU/MAU tile in the growth section once real users
  exist.

- [x] **Top tiles**: period toggle (this month / 3 / 6 / 12 mo / YTD / all-time,
  default YTD — the old tiles were silently ALL-TIME), 4th tile "free
  downloads" ($0 claim orders), refunded orders excluded from revenue with an
  annotation. `period-tiles.tsx` (client).
- [x] **Collapsible sections** via native `<details>` (`components/
  admin-section.tsx`, zero JS): listing options / sellers / listings / people /
  all orders — all collapsed by default, EXCEPT listings auto-opens with a red
  badge while anything is suspended (moderation must never hide in a drawer).
  Platform fee section compacted to a single row. Duplicate h2s removed from
  SellersSection/UsersPanel (headers live on the wrapper now).
- [x] **Growth model check-in (NEW, migration 020)**: `lib/growth-model.ts`
  replicates kula-growth-model.xlsx cell-for-cell (verified m1/m12/m24 — m24
  net = $609.85/mo = the TODO benchmark). Table shows current-month ACTUALS vs
  the Mid path for the DRIVER variables (active sellers, live listings,
  listings/seller, sales, sales/listing, avg price, GMV, fee, stripe est, net
  est) — flow rows prorated to day-of-month; net excludes Connect fees until
  live mode. Month index anchored on `platform_settings.launch_date`
  (default 2026-08-01 — **reset in admin at real launch**). Funnels: seller
  activation (accounts → listed → stripe) and freebie→paid conversion.
  Nested collapsed editor exposes all 13 xlsx drivers + launch date
  (`growth_model` jsonb; reset button returns to Mid; "custom drivers" badge
  when overridden; fee % always read live from platform settings, never
  duplicated in the drivers).

## Hygiene sweep (2026-08-14, from the code-quality audit — all 4 applied + verified)

- [x] **Ratings aggregation deduped**: `lib/ratings.ts` `fetchProductRatings()`
  replaces 5 copy-pasted query+aggregate blocks (home/explore/library/dashboard/
  profile); parallelism preserved (called inside each page's Promise.all);
  dashboard keeps its my-products filter; `RatingMap` moved out of a page file.
  When the reviews table grows, a `product_ratings` view (mirroring 017) drops
  in at that ONE spot. Verified live: 5.0 / 4.0 / "New" states render
  consistently on home + explore.
- [x] **USD formatting unified** on `lib/fees.formatUsd` (email's local usd() +
  dashboard's inline toFixed). Side effect: thousands separators. Verified:
  "30% + $0.25 per sale" label renders.
- [x] **Button/card/note classes deduped**: all px-6 py-3 sage buttons compose
  `btnPrimary` (with `w-full justify-center` where originals were block-level —
  naive swap would have shrink-wrapped them); auth pages share `AuthCard` +
  toned `Note` (error/notice/success). Deliberate deltas: brand shadow+transition
  now on those buttons; two p-4 notes normalized to p-3. The py-3.5 buy/download
  CTAs left alone on purpose (size variant, not drift). Verified: login card,
  red invalid-credentials note.
- [x] **API guards**: `lib/api-guards.ts` `requireUser()` + `requireActiveAccount()`
  replace the 401 dance in checkout/claim-free/ai-suggest/onboard and the
  duplicated moderation gate in the two order writers. Tolerant read PRESERVED
  (fails open if 007 unapplied); drifted paused copy unified on checkout's fuller
  wording; /api/download keeps its redirect (link click, not fetch); money routes
  keep all their own checks per the CLAUDE.md ring-fence. **Full money-path E2E
  re-verified after the change**: paid purchase ($112 → fee $33.85 = 30%+25¢
  exact, webhook wrote the order, download worked) · claim-free · paused buyer
  blocked with the unified message before Stripe is touched · logged-out buy
  redirects to login.

## Security — open items (from the 2026-08-14 audit review)

- [x] 2026-08-14 **`featured_products` file_path — trimmed (019), and the claim
  CORRECTED on closer look:** the view was never the leak. Anon can already read
  file_path through the products TABLE — every public page selects * and RLS
  grants ROW access to active listings (row-level, not column-level). The view
  added zero incremental exposure; 019 removes the column anyway as least-
  privilege hygiene (nothing rendered it; downloads only mint signed URLs
  server-side, bucket private). Scoring unchanged from 013. Applied + verified
  live: featured shelf renders (★ pick first, score-fill second).
- [ ] PARKED — the real fix if original-filename privacy ever matters:
  column-level privileges on `products.file_path` (or a public listing view
  without it). Breaks every `select("*")` in the app (explore, homepage,
  product, profile, library), so it's a deliberate explicit-column refactor,
  not a hotfix. File names are `{seller_uuid}/{random_uuid}-{sanitized_name}`,
  path knowledge grants no access — low value, do only if it becomes real.
- [x] 2026-08-14 **FIXED — per-IP rate limit on /api/mailing-list (018).**
  5/hour per IP via a Postgres-backed fixed-window counter (`rate_limits` table,
  RLS enabled with NO policies, service-role-only `rate_limit_hit` RPC with
  atomic upsert + opportunistic cleanup). Counter lives in the DB because
  serverless memory resets per cold start. FAIL-OPEN on limiter errors — bulk
  abuse is the target; a limiter hiccup must never block a real signup (also
  means: until 018 is applied, the code deploys fine and just doesn't limit).
  IP from `x-nf-client-connection-ip` (Netlify-set) with x-forwarded-for
  first-hop fallback. Respects the standing no-captcha decision. Turnstile
  remains the escalation if abuse appears DESPITE this. VERIFIED LIVE from the
  browser console: hits 1–5 → 200, hits 6–7 → 429 (duplicate-email trick, so
  the test added nothing to Mailchimp).

## Tech — BUGS (found 2026-08-14 while auditing listing edit/pricing)

- [x] 2026-08-14 **Explore quick filters** (not a bug — feature): "show me" group
  at the top of the explore filter panel with `free only` + `featured only`.
  `featured only` filters on `products.featured_at` (the admin ★ picks), NOT the
  `featured_products` view — that view scores EVERY active listing and the
  homepage just takes the top slice, so filtering on it would match the whole
  catalogue. Each checkbox is gated on the catalogue being able to satisfy it
  (first $0 listing / first ★) and the whole group hides if neither applies, so
  neither can ever render as a filter that only returns an empty grid. Both
  appear as removable chips and reset with "clear all". Verified live.

- [x] 2026-08-14 **FIXED — archive replaces delete (016/017).** The delete button
  is gone; "archive" flips status to 'archived' and touches NOTHING else.
  NOTHING IS DELETED: the storage file stays, the row stays (orders keep their
  FK), cover/preview stay, and THE REVIEWS STAY AND KEEP FEEDING THE INSTRUCTOR
  RATING. Restore returns it to draft. Errors that were silently swallowed now
  surface on the row. No RLS change needed — the public read path (007) already
  requires status='active', so archived listings drop out of browse/explore/
  homepage/featured/checkout automatically, while `has_paid_order(id)` keeps
  prior buyers' downloads working.
- [x] 2026-08-14 **FIXED — unpublishing silently deleted a teacher's reputation.**
  PRE-EXISTING bug, not caused by archiving: app/profile/[id]/page.tsx computed
  the instructor's overall rating from reviews on `status='active'` listings only,
  so unpublishing anything instantly removed its reviews from their profile score.
  New `instructor_ratings` view (017) aggregates across ALL of a seller's listings
  regardless of status (only 'suspended' excluded — admin moderation action).
  Profile reads the view and falls back to null if 017 hasn't been applied yet.
- [x] 2026-08-14 **FIXED — listings are editable.** UploadDialog takes an
  `editing` prop and updates instead of inserting: title, description, all
  options, price, cover, and the file. A replaced file goes to a NEW storage path
  and THE OLD OBJECT IS DELIBERATELY LEFT IN PLACE — never delete something a
  buyer may hold. Edit button sits on each listing row in the "my content" tab
  (edit · publish/unpublish · archive); archived rows show `restore` instead.
  Editing never changes publish state, except that flipping a live listing
  free→paid without Stripe demotes it to draft with an explanation (the 005 DB
  gate would otherwise reject the update).

- [x] 2026-08-14 **VERIFIED END-TO-END on the live site** (migrations 016+017 applied,
  4 commits deployed): edit changed a live listing free→$999 with Stripe connected
  (no demote, correct); archive removed it from explore + homepage and the product
  page refuses to sell it; the BUYER still sees it in their library, the download
  works, and the product page shows "you've purchased this" + download; the buyer
  could still leave a review on the archived listing (5.0); and the seller's
  profile rating STILL SHOWS that review with the listing archived — the exact
  case that previously erased reputation. Restore returns it to draft.
  Three follow-on bugs found by Aleks during this testing and fixed in the same
  session: (1) archiving a seller's ONLY listing hid it with no filter chip left
  to find it — filter bar now always renders, 'archived' is a permanent chip;
  (2) restore left a blank panel until reload because the filter was still on
  'archived' — restore now resets the filter to 'all'; (3) the product page
  checked availability BEFORE ownership, so a buyer who owned a draft/archived/
  suspended listing was told their own purchase was "not currently available"
  (pre-existing, not caused by archiving).

### original reports, kept for the record

- [x] **DELETING A SOLD LISTING DESTROYS THE FILE BUT KEEPS THE LISTING LIVE.**
  `remove()` in app/dashboard/dashboard-client.tsx deletes the storage objects
  FIRST (product-files + covers — storage RLS lets a seller delete inside their
  own folder), then runs `.delete()` on the row **without checking the error**.
  `orders.product_id references products(id)` has NO on-delete clause (001:39),
  so for any listing with a paid order the row delete is rejected (FK 23503)
  while the files are already gone. Result: the listing stays ACTIVE and
  purchasable with no file behind it, prior buyers' "lifetime access"
  downloads break permanently, and the seller sees no error — the UI just
  refreshes and the listing is still sitting there. (Unsold listings delete
  fine, which is why this never showed up in testing.)
  Fix direction — matches the codebase's existing "nothing ever hard-deletes"
  posture: add an `archived` product status (ghost from browse, keep buyer
  access), make the seller button archive instead of delete when
  `sales_count > 0`, only hard-delete when there are zero orders, and always
  delete the row BEFORE the storage objects so a failure can't strand files.
- [x] **No edit path for listings at all.** Sellers can only publish/unpublish
  (active↔draft) and delete — there is no form to change title, description,
  price, cover, or file after posting. Changing a price today means delete +
  re-create, which loses the reviews (they cascade), the view count, and the
  listing URL. This is the single most likely early seller complaint; the
  upload dialog already collects every field, so an edit mode is mostly
  re-using it with an update instead of an insert.

## Tech — small

- [ ] Seller notification preferences: `profiles.email_sale_notifications` + dashboard toggle + webhook check; then restore the "turn these off in your dashboard" sentence in lib/email.ts (removed 2026-08-14 because it was fiction)
- [ ] Preview is page 1 ONLY, baked at upload (pdf.js → canvas → 7px blur burned
  into the pixels → JPEG in the public covers bucket; PPT/PPTX get none). If a
  teacher's page 1 is a title page, buyers learn nothing from it. Worth letting
  sellers PICK the preview page (or auto-pick page 2) if previews ever look like
  a conversion lever. Note the blur is destructive before upload — don't
  "improve" this by switching to a CSS-only blur over the real file.
- [ ] SEO basics audit: per-page titles/descriptions, OG image for link sharing, sitemap.xml + robots.txt
- [ ] Post-purchase review nudge (Resend email ~3 days after purchase: "how was it? leave a review") — feeds the rating flywheel the featured score runs on
- [ ] Captcha (Turnstile) matters MORE now — a junk signup is no longer just a dead row, it's a junk Mailchimp contact eating audience quota and hurting deliverability. Build it if junk appears
- [ ] Watch the first Mailchimp campaign's bounce/complaint rate: account emails are unverified while Supabase confirmations stay OFF, so anyone can subscribe any address — high bounce rates damage the domain's sending reputation (the one you just authenticated)
- [ ] Split marketing into its own optional checkbox IF kula ever markets to EU/Canada recipients (see 015 header) — also the cleaner answer if the bundled line ever gets challenged
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
- PWA install (manifest.json + 192/512 PNGs, ~20 min from the existing क path) — HELD OFF 2026-08-14: kula is a browse-and-buy-occasionally site, not a daily-open app, and the offline win is moot since buyers' PDFs land in their Files app anyway. Revisit only if a teacher actually asks for a home-screen app. iOS home-screen icon (app/apple-icon.png) already exists regardless.
- Bundles / coupons / gifting — classic marketplace levers, zero validation yet
- Seller analytics page (views→sales funnel per listing) — the data already exists in products.views + orders
