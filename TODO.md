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
- [ ] Test-data wipe — **script READY at scripts/wipe-test-data.sql** (2026-08-14):
  keep-list of user ids at top, dry-run counts first, destructive half commented
  out until consciously armed, transaction-wrapped. Order matters (orders first —
  restrict FKs); deletes auth.users not profiles (no login-capable ghosts);
  empties both storage buckets (rows don't cascade files). Off-DB afterlist in
  the script header: Mailchimp test contacts, launch_date reset in admin,
  her avatar re-upload. RUN AT LAUNCH, not before.
- [ ] Supabase: turn email confirmations back ON (Auth → Sign In / Providers) — deliberately left OFF 2026-08-14 while testing; SMTP is already live, so this is now a one-toggle change. **Paste the branded confirm-signup template first** (supabase/auth-emails/ — built 2026-08-15, paste instructions in its README)
- [ ] Paste the branded auth email templates (supabase/auth-emails/, built 2026-08-15 to match the transactional shell): **reset-password can go in TODAY** (that flow is live and currently sends Supabase's stock template) · change-email whenever · confirm-signup pairs with the confirmations toggle above. Verify by sending yourself a password reset from /login
- [x] 2026-08-14 Supabase custom SMTP via her Resend (Auth → Emails → SMTP: smtp.resend.com:587 / user `resend` / pass = RESEND_API_KEY / from `Kula Marketplace <noreply@kula-marketplace.com>`) — verified: password-reset mail delivers to Gmail **Inbox**, not spam. Note: noreply@ has NO Porkbun forward (replies vanish); auth mail now counts against her Resend send cap. Auth rate limit (Auth → Rate Limits) still at Supabase's low default — raise it when confirmations go on.
- [ ] Stripe live mode: she completes activation → swap `sk_live_`, create live webhook (same 4 events) → **check the Accounts v1 flag applies in live mode before the first real seller connects** → turn ON customer card receipts (Settings → Emails → "Successful payments") so buyers get Stripe's receipt alongside kula's own "it's in your library" mail
- [ ] Her real content: 3–5 paid listings + 1–2 strong freebies, real covers, filled instructor profile + avatar (kills the placeholder look and seeds the featured shelf)
- [ ] Mailchimp footer address: swap her home address for a PO box / virtual mailbox if she wants (CAN-SPAM requires *an* address; every campaign prints it)
- [ ] Decide backup posture: Supabase free-tier backups vs paid PITR before real sales exist
- [ ] Uptime monitor on the domain (UptimeRobot free or similar) pinging /, alerting discoverkula@gmail.com

## Admin portal redesign (2026-08-14 — built, pending migration 020 + owner verify)

- [x] 2026-08-14 **Platform fee: step-up auth + demoted placement.** Changing
  the fee now requires re-typing the admin password, verified SERVER-side via
  signInWithPassword on a throwaway non-persisting client (wrong password =
  nothing written; Supabase's auth rate limits throttle brute force — a JS
  prompt would have been theater). Section is now a collapsed AdminSection at
  the very bottom of the admin page. Gap closed same day: `setCommissionOverride` now
  runs the same step-up (shared `requireStepUp` helper; password field in each
  set-rate row). The partner-toggle story then collapsed entirely (023, Aleks's
  call): the stored `partner` flag had zero economic function — its only
  behavior was the coupling that let one ungated click wipe a negotiated deal.
  Column DROPPED; "partner" is now DERIVED (commission_override non-null),
  badge + people-panel filter compute it, togglePartner action deleted, 008
  guard recreated without the partner clause. The password-gated rate field is
  the ONLY control. Deliberately given up: badge-only partners — if a public
  promoted-teacher label is ever wanted, that's a separate build.
  ⚠️ DEPLOY ORDER: push the code FIRST, then run 023 — the old deploy still
  writes `partner` on rate changes and would error against the dropped column.

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
  duplicated in the drivers). Amber dot marks any higher-is-better row running
  below the mid path (cost rows exempt — under-model costs are good news).
  All verified live 2026-08-14 incl. migrations 020+021.

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

## Shipped 2026-08-14 (late session)

- [x] Upload dialog cover photo, two fixes (Aleks's finds): (1) PROMOTED out of
  the optional-details drawer into the main flow under the file dropzone — it's
  the highest-leverage optional field (cards/featured/link previews are all
  image-led; no cover = placeholder look + generic OG image) but was buried
  between "anatomy focus" and "usage notes". Still optional, just visible, with
  live thumbnail preview of a chosen file. (2) Edit mode now SHOWS the current
  cover (same info-bug class as the hidden filename), previews a replacement
  before save, and adds "remove cover" — nulls the row pointer only, old object
  stays in storage, card falls back to placeholder art. Also fixed og:site_name
  missing on listing pages (Next REPLACES page-level openGraph rather than
  merging — siteName/type must be restated in generateMetadata; caught by
  Aleks's opengraph.xyz scan, which also proved uploaded covers become the
  share image).

- [x] UX polish, verified live: edit dropzone shows the current file's original
  name (recovered from the storage path, sanitized form) so sellers can confirm
  what they're replacing · teachability defaults to "ready to teach" on new
  listings (the cards didn't read as required and tripped sellers at submit;
  edit keeps the real value) · faq link moved to FOOTER ONLY per the owner
  (removed from desktop + mobile headers); mobile mini-nav keeps explore.

- [x] **/faq page** - buying (6) / selling (8) / trust (3) in the site's voice,
  every answer matched to VERIFIED mechanics (refund answer mirrors terms §6
  exactly - the file comment enforces keeping them in sync). FAQPage JSON-LD
  for search. Linked: desktop nav (next to sell), footer, and a new MOBILE
  mini-nav (explore · faq) - the full nav was sm+ only, so phone visitors
  previously had NO nav links at all. "Who's behind kula" deliberately left
  out for now per Aleks. Verified live on desktop + phone.

## Security — open items (from the 2026-08-14 audit review)

- [x] 2026-08-14 **Second security sweep (post-hygiene/admin-redesign code) — 5
  patches, all verified by tsc/lint/build:** (1) email HTML injection: listing
  titles (seller-typed free text) were interpolated raw into the sale + content-
  update email HTML — a title like `<a href=evil>` became a live link in mail
  kula sends; now entity-escaped via `esc()` in lib/email.ts (subjects stay raw
  — headers, not HTML). (2) /api/notify-update never checked the CALLER's
  account_status — a paused seller could still mass-email prior buyers through
  kula's domain; now gated (requireActiveAccount grew an optional message param).
  (3) /api/ai/suggest had no rate limit — every call is a paid Anthropic request,
  so a loop could burn the owner's API credit; now 20/hour per user via the 018
  limiter (fail-open, like all of them). (4) /api/stripe/onboard: paused accounts
  could still create Stripe Express accounts + onboarding links; now gated.
  (5) FAQ JSON-LD script: `<` escaped to `\u003c` in the stringify so no future
  answer text can close the script tag (static content today — pure hardening).
  Checked and CLEAN: webhook signature/idempotency (upsert on session id),
  storage RLS folder-scoping + sanitized upload names, download route
  paid-order gate, mailing-list validation+limit, admin step-up auth, no
  secrets in tracked files, no dangerous redirects/innerHTML elsewhere.
  **Full live verification 2026-08-14 (Aleks):** (A) hostile title
  `Flow & Fold <v2> "test"` → update email rendered it as literal text — all
  four escaped chars exercised; unescaped, mail clients would have swallowed
  the `<v2>` as a tag, so this also proves fancy legit titles survive.
  (B) sale email regression: normal render, $112 → fee $33.85 / net $78.15
  exact. (C) paused seller: notify-update → 403 with the new message (gate
  fires BEFORE the rate limit, no token burned); connect-stripe → "selling is
  disabled"; unpaused → Stripe onboarding loads again. (D) /faq renders under
  the escaped JSON-LD. NOTE learned twice today: when debugging "no email",
  check rate_limits for a content-update row FIRST — a same-day test send
  re-arms the 24h cap and the dialog swallows the 429 silently.

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

- [ ] **Settings S2 — prefs in one place (BUILT 2026-08-15 — migration 031
  FIRST, then push + live verify):** ARCHITECTURE (Aleks's call after the
  MVP-horizon discussion): stay column-per-pref (jsonb fold rejected — no
  payoff inside a 3yr horizon, and it would reopen verified gates) BUT add
  the seam: lib/email's emailAllowed(kind, platformRow, userRow) is now the
  ONE map from email kind → platform switch + user column; every send site
  (webhook, claim-free, sweep A+B, notify-update) asks it. New notification
  type = one map line + one /settings toggle. 031: profiles.
  review_nudge_emails + free_claim_emails (default true) + auth→profiles
  email mirror trigger (change-email can't strand notification mail).
  /settings gains change-email + the full email-preferences section; the
  LIBRARY toggle and the EARNINGS-TAB switch MOVED there (one home —
  Aleks runs `git rm app/library/update-emails-toggle.tsx`). Seller
  sales&reviews toggle shown to non-buyer roles only. Email footers now
  say "in your settings"; nudge email discloses its off-switch.
  ⚠ TWO REGRESSIONS found by the survey and fixed here: (1) PAID buyers'
  receipt email had NO call site — the webhook send was lost in a later
  edit (free claims still confirmed; lib/email's own doc comment proved
  original intent); (2) the freebie SELLER ping (sendFreeClaimEmail) had
  lost its only call site. Both restored behind emailAllowed. Lesson
  echoes the stale-stage trap: a verified feature isn't permanently
  verified — S3's full email test matrix is the answer.
  DELIBERATELY EXCLUDED: mailing-list toggle (signup consent is BUNDLED by
  owner decision, Aug 2026 — Mailchimp campaigns carry the unsubscribe;
  splitting consent is the EU/Canada-triggered change, not this block);
  paid-receipt opt-out (receipts are proof of purchase).
- [x] 2026-08-15 **Settings S1 — /settings page + account section** (pushed
  + VERIFIED same day, all 5 checks: menu entry → page + correct email ·
  password change → re-login with new password · mismatch rejected ·
  logged-out /settings → /login?next=/settings → back after login ·
  shortcuts land). Logged-in password change existed nowhere before this —
  the only path was logging out into forgot-password. Origin: Aleks's
  settings-localization ask; survey found controls scattered across
  library / earnings tab / profile page / signup-only consent, no
  change-email surface (drafted template dormant), no nudge opt-out.
  Email-hook matrix delivered in-chat; compact version lands in CLAUDE.md
  at S3.
- [ ] HELD (Aleks 2026-08-15) — **gap-report tier-2 remainder, build on his
  go:** 6 discount codes (fork decision still open: A platform-funded — 
  seller nets full price, kula's fee absorbs the discount — vs B
  proportional — fee recomputed on discounted total; admin-created codes
  only either way) · 7 seller-chosen preview page · 8 favorites/wishlist.
- [ ] PARKED (Aleks 2026-08-15) — **N3: in-app back affordance** ("← explore"
  link/breadcrumb on listing pages). Held after N1+N2 landed: browser back
  now restores full explore state, and direct-arrivals (email/shared links)
  always have the nav "explore" link on desktop AND the mobile mini-nav, so
  it's nearly redundant. Aleks's instinct to revisit: MOBILE users may still
  want it (browser chrome hidden mid-scroll). Cheap build (~20min static
  link) if her testers ever look lost on a listing.
- [x] 2026-08-15 **N2 — explore state in the URL** (pushed + VERIFIED same
  day, all 5 checks: filter/search/sort → URL updates live · listing →
  browser back → everything restored incl. sort · filtered URL in incognito
  → same view + chips · clear all → bare /explore (sort survives BY DESIGN —
  matches Etsy/TpT "clear filters" norm; Aleks confirmed keep) · garbage
  params (?style=Fakestyle) render safely — one Chrome "couldn't load" blip
  mid-test was a network hiccup, clean on reload): filters, search, and sort
  now LIVE in the querystring
  (?q= &sort= &free=1 &featured=1 &teach/style/type/level as repeated params
  &dur=lo-hi), so browser BACK from a listing restores the exact explore
  state — before this, every return trip wiped filters/search/sort because
  they were React state only. Second win: filtered views are SHAREABLE
  LINKS (her campaigns can point at e.g. /explore?free=1&style=Yin).
  Mechanics: writes via history.replaceState — SHALLOW, no Next navigation,
  so filter clicks never refetch the force-dynamic page (router.replace
  would have); replace not push, so clicking checkboxes doesn't stack
  history entries; useSearchParams read once for initial state; defaults
  omitted (bare /explore stays bare); malformed params parse to defaults.
- [x] 2026-08-15 **N1 — auth return-path / "click behavior"** (pushed +
  VERIFIED same day, all 7 checks: buy→login→back-on-listing ·
  buy→signup-cross-link→back-on-listing · /library guard → library ·
  nav-login returns to the listing · role-aware defaults (buyer→explore,
  admin→dashboard) · /login?next=//evil.com discarded, landed on default ·
  signed-in flows unchanged) — (BUILT 2026-08-15 — no
  migration; push + live verify. From Aleks's return-path-integrity
  analysis; N2 explore-state-in-URL and N3 back-affordance queued behind
  it):** every doorway that interrupts a user now carries the destination
  as ?next= and auth sends them back. Before: login HARDCODED
  /dashboard — a logged-out buyer clicking buy landed on the "connect
  stripe" seller pitch mid-purchase, and every email CTA dead-ended the
  same way for logged-out recipients. Threaded: buy button
  (next=/products/id) · library, dashboard, admin page guards ·
  /api/download (→ next=/library, deliberately not the file stream) ·
  NAV login/signup links via new components/auth-links.tsx (client,
  usePathname — closes the email loop: nudge → listing → nav login →
  back on the listing) · login↔signup cross-links preserve next ·
  signup passes emailRedirectTo so the return path survives the
  confirmation email once confirmations go ON. SECURITY: lib/site
  safeNext() is the only honoring path — same-site relative paths only
  ("//host" and "/\\host" rejected), so ?next can never become an open
  redirect. Defaults with no next are now ROLE-AWARE: sellers/admins →
  /dashboard, buyers → /explore (signup → /explore) — the
  everyone-to-dashboard landing is gone. VERIFY: logged out, click buy
  on a listing → login → land BACK ON THAT LISTING and buy · same via
  the signup cross-link (stay on the listing after account creation) ·
  logged out, open /library → login → library · nav log-in from a
  listing returns to it · buyer login with no next → explore; admin →
  dashboard · hostile link /login?next=//evil.com then log in → lands
  on default, not evil.
- [x] 2026-08-15 **030 — public names must never be emails** (applied,
  pushed, VERIFIED same day from an incognito view-source of the buyer
  profile: h1/title/description all "kula member", email gone everywhere,
  noindex intact, ringed avatar rendering — the pale क upload now reads as
  a button. Bonus finding while testing: Gmail dark mode auto-inverts the
  email shell and it stays legible.) — (BUILT 2026-08-15 — run 030
  any time, order-safe; push + verify):** found DURING the 029 verify: a
  buyer profile rendered the account's RAW EMAIL as its public name (h1,
  title, meta description). Roots: the signup trigger seeds display_name
  from the email (live DB carries an older variant of 001's function — the
  file was edited after being applied, which is exactly why 001 is
  never-rewrite), no UI has ever let users SET display_name, and the review
  form copies display_name into PUBLIC reviewer_name. 030: trigger recreated
  to seed from explicit metadata only (null otherwise) · every email-derived
  display_name nulled · email-derived reviewer_names scrubbed to "verified
  buyer". Code belt & braces: publicName() in components/ui.tsx is now THE
  one derivation for public names (masks any @-value → "kula member"), used
  by profile page (incl. metadata) + InstructorCard; review form guards
  reviewer_name the same way; profile-edit's shop-name label reworded to
  "public name" since buyers use it now too. Private contexts unchanged
  (nav greeting, admin panel may still show email fallbacks). VERIFY:
  buyer profile shows "kula member" not the email (h1 + view-source
  title/description) · existing test reviews show "verified buyer" ·
  set a public name in edit profile → it shows everywhere · new review
  carries the chosen name · sign up a FRESH account → profile is
  "kula member" from the start.
- [x] 2026-08-15 **Every account gets a profile page (029)** — applied,
  pushed, VERIFIED same day: buyer's "my profile" renders (member-since,
  empty shelf, "+ add content") and the buyer set an avatar AND banner ·
  noindex meta confirmed in view-source on the empty profile, absent on
  sellers' · /sitemap.xml = the 3 selling profiles only · ask-a-question
  correctly gated · bell text renders ink. The verify also SURFACED the
  email-as-name leak → spun out and fixed as 030 above. (Original entry: Aleks's product
  call, surfaced when his test BUYER's "my profile" menu link 404'd — a
  PRE-EXISTING trap: the instructors view was sellers/admins-only from v1,
  yet the menu offered the link to everyone, and buyers couldn't even set an
  avatar (profile editing lives on the page they couldn't reach). Rationale:
  kula has no buyer/seller fork, so a profile from day one that grows a
  shelf when you post IS the account model; buyers here are teachers.
  029 drops the role filter (view keeps its historical name — renaming
  churns every consumer for zero behavior; treat as "public member
  directory"). Privacy carve-outs in code: sitemap now lists only sellers
  with ≥1 active listing (derived from the catalog query — the separate
  instructors fetch was deleted, anti-bloat) · empty profiles get
  robots noindex in generateMetadata · ask-a-question renders only when
  the profile has published content · no directory exists and nothing
  links buyer profiles, so they're shared-URL-only. Also in this pass:
  bell dropdown links pin text-ink (they inherited white over the dark
  404 page) and the interim hide-for-buyers menu hotfix was reverted in
  favor of the real fix. VERIFY: buyer's "my profile" now renders (avatar/
  bio/member-since, empty-shelf state, "+ add content"), buyer can edit
  profile + set an avatar · view-source on the buyer profile shows the
  noindex meta, seller profile doesn't · /sitemap.xml lists seller
  profiles only · ask-a-question absent on the buyer profile, present on
  sellers'.
- [x] 2026-08-15 **Block 9 — review flywheel: nudges, seller notices, header
  bell** (028 applied, CRON_SECRET set, deployed, and VERIFIED live same day
  by full walkthrough: auth gate 401/401/200 · backdated order → nudge
  email on the branded shell, repeat curl 0 (stamp holds) · review left →
  bell cleared itself · next sweep → seller notice sent, reviews_covered 1 ·
  kill switch returned skipped:"switched off", then re-enabled ·
  "Scheduling functions: review-sweep-cron" confirmed in the deploy log;
  remaining passive check: tomorrow's ~11am ET scheduled run should send
  nothing. Debug lesson recorded: a curl returning honest zeros meant "no
  order in the 3–14d window" — the step-2 backdate hadn't run; also the
  sweep's silent catch blocks made that slower to see than it should have
  been — if it ever needs deeper debugging, add error detail to its JSON):** reviews
  power the featured score / instructor rating / JSON-LD stars, so this
  block engineers their collection. ONE daily sweep does both emails:
  /api/cron/review-sweep (POST, Bearer CRON_SECRET; feature stays dark
  without the env var), triggered by netlify/functions/review-sweep-cron.mts
  (daily 15:00 UTC ≈ 11am ET — a dumb 10-line alarm clock; all logic lives
  in the app route. Why not a Supabase edge function: second runtime that
  can't reuse lib/email.ts, second deploy tool, third secret store).
  BUYER nudge: paid orders (free claims included) 3–14 days old, no review
  yet, once per order EVER (orders.review_nudge_sent_at stamp; stamped only
  after a successful send so failures retry; already-reviewed orders get
  stamped without mail). SELLER notice: reviews without seller_notified_at,
  batched into one email per seller (star lines + reply prompt); respects
  the seller's sale_notifications toggle (opt-outs get stamped, not queued
  forever); 028 backfills pre-existing reviews as notified so run #1 can't
  spam history. Platform switch #4 notify_review_emails covers both
  directions (admin → notifications). HEADER BELL (the "basket", by design
  DERIVED — no notifications table, no read/unread state): /api/me/tasks
  computes, under the CALLER's RLS, purchases-you-haven't-reviewed +
  reviews-awaiting-your-reply; components/bell-menu.tsx renders a badge +
  dropdown of direct links and renders NOTHING when the count is 0. Acting
  is what clears it. Future derived items join the same payload; a real
  notifications table only earns its migration if event-style alerts
  ("someone bought your listing") are ever wanted. TEST without waiting a
  day: `curl -X POST -H "authorization: Bearer $CRON_SECRET"
  https://kula-marketplace.com/api/cron/review-sweep` → JSON counters.
  VERIFY: buy on a test account, backdate the order 4 days in SQL
  (`update orders set created_at = now() - interval '4 days', review_nudge_sent_at = null where id = '…'`),
  curl the sweep → nudge lands + second curl sends nothing (stamp) · leave
  a review → curl → seller gets the batched notice (sale_notifications on)
  · bell shows for a buyer with an unreviewed purchase and for the seller
  with an unreplied review, links land on the right pages, disappears
  after acting · admin switch off → curl reports skipped. Netlify:
  confirm the scheduled function appears under Functions after deploy.
- [x] 2026-08-15 **5b.1 — polish pass on 5b** (VERIFIED live same day by
  Aleks: socials save + chips render, rims visible. Two lessons from the
  rollout, both recorded in 027's header: (a) code was pushed before the SQL
  — failed SAFE, profile saves rejected whole with the schema-cache error
  until the migration landed, everything else untouched; (b) 027 v1 hit
  2BP01 — dependent views must DROP before their columns; the corrected,
  fully idempotent 027 is what ran. ⚠️ the corrected 027 file still needs
  committing — `git add supabase` rides the NEXT commit): three fixes from
  Aleks's 5b review.
  (1) SOCIALS EXPANSION, his ask "tiktok, fb, x etc as options": one
  `profiles.socials` jsonb map (027) + curated allowlist in NEW lib/socials.ts
  (instagram/tiktok/youtube/facebook/pinterest/x) replaces 026's
  instagram_handle column (backfilled, dropped — fold-in over layering; the
  instructors VIEW is DROPPED + recreated in 027 because create-or-replace
  can't remove a column; grants restated). Adding a network later = one line
  in lib/socials.ts, zero migrations. Every chip href is built by US from a
  normalized bare handle (URI-encoded), so a stored value can never carry a
  scheme. Edit form: website + 6 network inputs in a grid; empty ones don't
  render. (2) FILE-INPUT RIM, his ask "grab the eye": new `fileInputCls` in
  components/ui.tsx (dashed rim + sage browse pill via Tailwind file:
  modifiers) applied to the three bare file inputs — profile avatar, profile
  banner, upload-dialog cover. The main sale-file dropzone already had real
  styling. (3) ask-a-question stays PROFILE-ONLY (Aleks's call after seeing
  it — listing pages deliberately skip it). VERIFY: edit profile → fill 2–3
  networks incl. a pasted full URL → chips render with correct hrefs;
  pre-027 instagram value survived the backfill; file inputs visibly boxed
  in profile edit + upload dialog cover; old deploy against new view = no
  instagram chip until push (expected).
- [ ] IDEA (from 5b testing): re-choosing the SAME file on edit could
  backfill the 024 file details for pre-024 listings — today the
  identical-hash skip (022) means only a genuinely new file captures
  pages/bytes. Small change in the upload dialog if ever wanted; launch
  wipe makes it moot for test data.
- [x] 2026-08-15 **5b — instructor profile v2** (026 applied, pushed, and
  VERIFIED live same day by Aleks — banner, links, member-since all render;
  ask-a-question confirmed on the profile, non-owner views) — (BUILT
  2026-08-15 — ⚠️ run migration 026
  FIRST, then push; needs live verify):** from the seller-profile comparison
  vs TpT/Etsy/Gumroad (Aleks's ask): kula already had the click-through
  table stakes (rating, bio, grid, per-listing reviews) — this adds the four
  missing ones. (1) member-since ("· on kula since aug 2026") from
  instructors.created_at, zero schema. (2) website + instagram link chips —
  profiles.website_url / instagram_handle (026), normalized on save
  (https:// forced, bare handle extracted from @/pasted URLs) AND
  scheme-guarded at render so a stored javascript: can never become a live
  href; edit form gains both fields. (3) profile banner —
  profiles.banner_path, covers bucket own-folder like avatars (012 pattern,
  storage policies already cover it); wide rounded image above the header;
  upload+preview in the edit form (avatar upload refactored into one
  swapImage helper — anti-bloat). (4) "ask a question about this teacher's
  content" — prefilled mailto relay through CONTACT_EMAIL (seller emails
  stay private; real messaging stays a scale-tier build). Deliberately NOT
  built (research: even Gumroad skips these at small scale): follow, public
  sales counts, shop-level review list, pinned items, in-store search.
  VERIFY: edit profile → set website (paste with/without https), instagram
  (paste @handle or full URL), upload banner → all render; member-since
  shows; logged-out visitor sees ask-a-question (owner doesn't); pre-026
  profile pages render fine (fields just absent). NOTE: instructors view
  RECREATED in 026 — any future column additions must keep appending LAST.
  Block 6 (next, per the gap report's numbering) = discount codes.
- [x] 2026-08-15 **Report-listing form + "more from this teacher" + freebie
  seller ping** (pushed + VERIFIED live same day by Aleks: report form +
  more-from row "work great", freebie seller ping "works fine") — (BUILT
  2026-08-15 — no migration; push + live verify): three small
  closes in one push. (1) "report this listing" under the price card —
  REGISTERED USERS ONLY (Aleks's call: no drive-by spam; anon never sees
  the control). Tiny inline form (category select: copyright / inappropriate
  / misleading / other + optional details) → POST /api/report → auth +
  moderation gate + 5/day/user via the 018 counters → report emailed to
  CONTACT_EMAIL on the branded shell with listing link + reporter address
  (reply = one click). No reports table on purpose — the inbox is the queue
  at this scale; failed send returns an error (this mail IS the feature).
  (2) "more from this teacher" on the product page — up to 4 of the seller's
  other ACTIVE listings (RLS-scoped query, shared fetchProductRatings for
  stars) rendered as ProductCards after the instructor card; the no-algorithm
  slice of "recommendations" Etsy/TpT both ship. (3) sellers now get
  "someone grabbed your freebie" when a $0 listing is claimed (Aleks's
  catch: free claims never hit the Stripe webhook, so sellers heard
  NOTHING) — new sendFreeClaimEmail in lib/email.ts on the shared branded
  shell, sent from /api/claim-free, riding the EXISTING sale-email controls
  (platform notify_sale_emails + seller's sale_notifications toggle — no new
  knob; duplicate claims return early and never re-ping). Also: SITE_URL
  moved to lib/site.ts as the one absolute-origin source for emails/mailtos
  (email.ts's local copy removed). VERIFY: report link opens prefilled mail ·
  product page of a seller with 2+ listings shows the row (and hides it for
  single-listing sellers) · freebie claim → seller ping + buyer email both
  arrive · seller toggle off → buyer email only. Origin: gap report tier 1
  (items 4 + 5 — closes tier 1).
- [x] 2026-08-15 **Buyer purchase email — "it's in your library"** (SHIPPED
  2026-08-15, 025 applied; paid path VERIFIED live same day — both emails
  arrived, fee math exact ($999 → net $699.05); freebie-claim variant +
  switch spot-checks confirmed by Aleks same day — "all good on both"):
  buyers
  previously got NO email after buying (Resend mail went to the seller;
  Stripe receipts are a separate dashboard toggle, still off in test). Now:
  webhook sends the buyer a branded confirmation on paid orders, and
  /api/claim-free sends the free-claim variant ("a gift from the teacher") —
  both with an "open your library" link, from the same Resend sender as sale
  emails. Transactional: no per-buyer toggle (receipts are expected mail);
  admin's notifications section gains a third platform switch
  (notify_purchase_emails), checked tolerantly by both send paths (missing
  column = ON) — the admin FORM is why 025 must run before the push (it
  writes all three switches at once). lib/email.ts also deduped in passing:
  one shared sendViaResend() scaffold now carries all three email types
  (anti-bloat rule in action; behavior unchanged). VERIFY: test purchase →
  buyer inbox gets "it's in your library" AND seller still gets the sale
  email · claim a freebie → free variant arrives · admin switch off → no
  buyer email, switch back on · hostile title (`<b>x</b>`) renders as
  literal text (esc() shared). Related go-live item: flip Stripe's own
  customer receipt toggle at live activation (added to that checklist line).
  SAME-DAY RESTYLE (Aleks's ask — "better, not gaudy"): all four email
  variants now share a branded shell in lib/email.ts — cream backdrop, white
  rounded card, lowercase "kula" wordmark, sage pill CTA, muted footer,
  palette mirrored from globals.css. Deliberately image-free + inline-styled
  + system fonts (email clients strip stylesheets, block remote images, and
  won't load Poppins; Outlook just renders square corners). Sale email
  gained a "view your earnings" button. Titles still esc()'d.
  Origin: gap report tier 1.
- [x] 2026-08-15 **File details / "what you get"** (024 applied, pushed, and
  VERIFIED LIVE same day by Aleks — fresh 27-page PDF showed "PDF · 27 pages ·
  276 KB" in all three placements): the product page now discloses the
  file before purchase, three placements: "file — PDF · 12 pages · 2.1 MB"
  leading the metadata card · "instant download · pdf · 12 pages · 2.1 mb"
  echo under the price (the decision point) · preview pill upgraded to
  "page 1 of N — full file unlocks after purchase". ZERO seller input: bytes
  off the File object, pages from the SAME pdf.js pass that bakes the blurred
  preview (PDFs only — PPT/PPTX show type + size), type derived from
  file_path's extension so even pre-024 rows show "PDF". No new file on edit
  → columns untouched (mirrors the file_sha256 pattern); identical-hash
  re-upload → untouched too. No backfill: the launch wipe covers test rows,
  and the UI renders whatever parts exist. Future file types (docx/jpg/…)
  need only the dropzone accept list widened — type + size work as-is, page
  counting is a per-format plug-in at the one capture point.
  ⚠️ DEPLOY ORDER is the REVERSE of 023: SQL editor first (024), code push
  second — the dialog writes the new columns, so new code against an
  un-migrated DB fails every listing save. VERIFY: fresh PDF listing shows
  all three placements · PPTX shows type + size only · metadata-only edit
  leaves values untouched · pre-024 listing shows bare "PDF". NOTE from the
  verify (lesson worth keeping): a dashboard tab left open across a deploy
  keeps running the OLD client bundle — the first test upload wrote no
  pages/bytes and looked like a bug; a hard refresh (⌘⇧R) fixed it. When
  testing upload-dialog changes, refresh the tab first. Origin: gap
  report tier 1 (../kula-functional-gap-analysis.md).
- [x] 2026-08-15 **Explore sort** (built + lint/build gates + pushed live via
  push-live.sh same day, Aleks): sort select on explore next to search — recommended
  (default) / top rated / price low→high / high→low / newest. "Recommended"
  reuses the featured_products blended score (013): page.tsx fetches an
  id→featured_score map alongside the products query; rows still come from
  `products`, so no view column gates the grid, and a missing/erroring view
  degrades to newest-first. All sorting client-side in explore-client
  (`sorted` memo); every order tie-breaks on newest. VERIFY: default order
  looks curated (starred/high-scored first-ish), each sort reorders, search +
  filters + chips still narrow without resetting sort, toolbar wraps sanely
  on a phone. Origin: comparable-market gap report
  (../kula-functional-gap-analysis.md) — TpT and Etsy both ship sort;
  remaining report items stay in the report until agreed here.
- [x] 2026-08-14 STALE ITEM CORRECTED: seller sale-notification prefs already
  existed end-to-end (`profiles.sale_notifications` + earnings-tab toggle +
  webhook check at webhook/route.ts:82) — this TODO was wrong about the check
  being missing. The "turn off in dashboard" sentence in the sale email can be
  restored any time; it stopped being fiction long ago.
- [x] 2026-08-14 **Buyer update emails + notification stack (022)**: replacing
  a listing's file now emails every prior OWNER (paid + free claimers — same
  library access) that the new version is waiting. Change detection =
  client-side SHA-256 vs `products.file_sha256`; identical file → NO swap, no
  new storage object, no email (dropzone copy says so). Enforcement is all
  server-side in /api/notify-update: seller-owns-listing via RLS, platform
  kill switch, per-buyer `content_update_emails` opt-out, moderated accounts
  skipped, 1 email/product/24h via the 018 rate-limit counters (client's
  opinion is a suggestion, not authority; buyer emails assembled via service
  role and never returned to the caller). Admin gets a collapsed
  "notifications" section with platform switches for BOTH email types (sale
  emails now also platform-switchable, checked in the webhook, tolerant
  read); buyers get an "email me when content i own gets updated" toggle on
  the library page mirroring the sellers' earnings-tab toggle. VERIFIED
  END-TO-END 2026-08-14: dialog edit with a different file → "your content got
  better" email in the buyer's inbox; console probe returned sent:2; the 429
  daily cap demonstrably enforces. (First test attempt burned the daily token
  before any email was observed — if debugging "no email" ever again, check
  `rate_limits` for a content-update row FIRST.)
- [ ] Preview is page 1 ONLY, baked at upload (pdf.js → canvas → 7px blur burned
  into the pixels → JPEG in the public covers bucket; PPT/PPTX get none). If a
  teacher's page 1 is a title page, buyers learn nothing from it. Worth letting
  sellers PICK the preview page (or auto-pick page 2) if previews ever look like
  a conversion lever. Note the blur is destructive before upload — don't
  "improve" this by switching to a CSS-only blur over the real file.
- [ ] Admin polish: period pill buttons render a bit scrunched (spotted 2026-08-14 after the 4th tile landed) — spacing/wrap pass on the tiles row when convenient
- [x] 2026-08-14 **SEO basics — audited + built** under one house rule (Aleks):
  search engines only ever see words a human wrote for the site — zero
  generated keywords, zero visual change. Audit found: every listing page
  served the HOMEPAGE's title/description (site = one page to Google), no
  OG tags anywhere (bare grey link previews in the exact channels she'll
  share to), no sitemap/robots, empty alt text, no structured data outside
  the FAQ. Shipped: metadataBase + title template + site-wide OG/Twitter
  defaults using the brand-kit banner (public/og.png) · generateMetadata on
  listings (title + ≤155-char excerpt of the SELLER'S OWN description +
  their real cover as the OG image; RLS-scoped read so drafts/archived can't
  leak metadata) and on profiles (name + their own bio) · canonical urls ·
  sitemap.ts from the live catalog via a bare anon client (RLS = nothing
  private can appear, by construction; fail-soft to static pages) ·
  robots.ts disallowing dashboard/library/api/auth pages · Product JSON-LD
  with real price + aggregateRating ONLY when reviews exist · cover alt =
  listing title. Decisions: seller-words excerpts over generated summaries;
  profiles indexed (teachers googling themselves finding their shop = a
  recruiting asset); brand banner as default OG.
- [ ] Post-purchase review nudge (Resend email ~3 days after purchase: "how was it? leave a review") — feeds the rating flywheel the featured score runs on
- [ ] Captcha (Turnstile) matters MORE now — a junk signup is no longer just a dead row, it's a junk Mailchimp contact eating audience quota and hurting deliverability. Build it if junk appears
- [ ] Watch the first Mailchimp campaign's bounce/complaint rate: account emails are unverified while Supabase confirmations stay OFF, so anyone can subscribe any address — high bounce rates damage the domain's sending reputation (the one you just authenticated)
- [ ] Split marketing into its own optional checkbox IF kula ever markets to EU/Canada recipients (see 015 header) — also the cleaner answer if the bundled line ever gets challenged
- [ ] Captcha (Turnstile) on signup/waitlist IF junk signups appear — was built + stashed in a Claude session; rebuild is ~an hour if the stash is gone
- [ ] Seed listing: her "power flow (twist)" PDF as a real free listing (seed SQL exists in the Yoga App folder, or upload via UI)
- [ ] Homepage seller-economics strip (idea #2, mockup offer stands): "you keep ~70% of every sale · no signup fee · no membership"
- [ ] Dispute/chargeback auto-reversal block in the webhook if chargebacks ever become real (manual via dashboard until then)

## Tech — large

- [ ] **Account-deletion (right-to-erasure) runbook** — designed 2026-08-14, build
  the admin action only when the first real request arrives (rare; lawyer should
  bless the scrub list first). KEY INSIGHT: no schema decoupling needed — orders'
  restrict FKs make hard-delete structurally impossible, and buyers' access
  survives BECAUSE the rows survive. Compliant deletion = 007 soft-delete (already
  built: ghosting, login ban, buyer access preserved) + a PII SCRUB pass via
  service role: profile email→tombstone / names→"former member" / bio,
  specialisations, avatar (file too), last_seen nulled · auth.users email scrubbed
  via admin API (row can't be deleted — same FK chain) · reviews.reviewer_name
  neutralized (lawyer call: erase review text or keep anonymized rating) ·
  mailing_list row deleted · **their contact deleted from her MAILCHIMP** (PII at
  a third party — the easy one to forget) · Stripe KYC/tax data is Stripe's own
  controllership, requests go to them. Matches privacy §5's promise exactly:
  skeleton rows retained for legal records, the human removed within 30 days.

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
- BIMI sender logo in Gmail (the avatar circle next to emails): parked until
  ~Aug 2027 — Gmail needs DMARC at enforcement (ours is p=none; careful, the
  Porkbun hello@ forward is in the delivery path and strict DMARC breaks
  forwarding) plus a certificate: VMC = registered trademark + ~$1k+/yr, CMC =
  no trademark but the logo must have been publicly on the domain for 12+
  months — the क favicon went live 2026-08-14, so the CMC clock started then.
  Free interim hack: Google account on hello@ with the क tile as its photo
  (Gmail-only, unofficial, often works).
- Brand kit v1 lives at ../kula-brand-kit.zip (2026-08-14): 62 files — क marks
  (SVG masters + PNGs), lockups, avatars, OG banner, IG post/story templates,
  palette card + css, app icons, and a styled START-HERE.html guide. All
  generated from production ingredients (traced क path, globals.css palette,
  Poppins outlines). Regenerable/extendable on ask — v1.1 candidates: YouTube/
  LinkedIn banner sizes, her name/title, alternate taglines.
- Bundles / coupons / gifting — classic marketplace levers, zero validation yet
- Seller analytics page (views→sales funnel per listing) — the data already exists in products.views + orders
