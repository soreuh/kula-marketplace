-- ============================================================
-- 028 — review nudges + seller review notices (block 9)
-- Run AFTER 027, in: Supabase Dashboard → SQL Editor.
-- ⚠️ DEPLOY ORDER: run this BEFORE pushing the code — the sweep
-- route stamps the new columns and the admin notifications form
-- writes the new switch.
--
-- WHY: reviews are kula's flywheel — the featured score, the
-- instructor rating, and the JSON-LD stars all run on them — and
-- the comparables actively engineer review collection (TpT pays
-- credits for it). Two emails, both sent by ONE daily sweep
-- (/api/cron/review-sweep, triggered by a Netlify scheduled
-- function, guarded by CRON_SECRET):
--   · BUYER nudge, once per order ever, 3–14 days after purchase
--     ("how was it?") — the stamp below is the dedupe.
--   · SELLER notice, batched daily ("you got a new review") —
--     reviews are written directly under RLS with no API route in
--     the path, so the sweep is the hook; the stamp is the dedupe.
--
-- The stamps are written ONLY by the sweep (service role). No
-- 008-style guard: a user tampering their own stamp could at
-- worst suppress or repeat one courtesy email — not money.
-- ============================================================

alter table public.orders
  add column if not exists review_nudge_sent_at timestamptz;

comment on column public.orders.review_nudge_sent_at is
  'When the one-time "how was it?" buyer nudge went out (sweep-stamped). NULL = not yet sent (or order predates 028 and aged out of the window).';

alter table public.reviews
  add column if not exists seller_notified_at timestamptz;

comment on column public.reviews.seller_notified_at is
  'When the seller was told about this review (sweep-stamped, batched daily). NULL = pending.';

-- Reviews that already exist predate the feature — mark them notified so
-- the first sweep doesn''t email sellers about months-old reviews.
update public.reviews
  set seller_notified_at = created_at
  where seller_notified_at is null;

-- Platform kill switch for BOTH directions, joining the three from
-- 022/025 in the admin notifications section. The seller side also
-- respects each seller''s existing sale_notifications toggle; the buyer
-- nudge is one-time-per-order by construction.
alter table public.platform_settings
  add column if not exists notify_review_emails boolean not null default true;

comment on column public.platform_settings.notify_review_emails is
  'When false, the review sweep sends nothing: no buyer "how was it?" nudges, no seller new-review notices.';
