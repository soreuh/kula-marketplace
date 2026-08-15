-- ============================================================
-- TEST-DATA WIPE — run ONCE, immediately before real launch.
-- This is NOT a migration: it lives in scripts/, never in
-- supabase/migrations/, and is destructive BY DESIGN.
--
-- Approach (Aleks, 2026-08-14): delete everything except an explicit
-- keep-list of user ids. Deletion order matters — orders pin products
-- AND profiles via restrict FKs (the same ones that stop accidental
-- data loss in production), so orders go first. auth.users is the row
-- to delete on the user side: it cascades profiles → products →
-- reviews. Deleting profiles directly would leave login-capable
-- auth ghosts.
--
-- WHAT SURVIVES: platform_settings (fees, launch_date, drivers,
-- notification switches) · product_options (the curated lists) ·
-- every user id in KEEP below, minus their content if they had any.
--
-- HOW TO RUN:
--   1. Fill in KEEP with the ids to preserve (admin account(s)).
--      select id, email, role from profiles;  ← find them
--   2. Run STEP 0 alone — it only COUNTS. Read the numbers.
--   3. Run STEP 1 (the wipe) in one go.
--   4. Run STEP 0 again — everything except kept profiles should be 0.
--
-- AFTERWARDS, off-database (SQL can't reach these):
--   □ Mailchimp: delete the test contacts from her audience
--     (kula-account / kula-waitlist tagged test emails)
--   □ Admin → growth model drivers: set launch_date to the real
--     launch month
--   □ Optional: admin → re-upload her avatar (bucket wipe removes it)
-- ============================================================

-- ─────────────── STEP 0 — DRY RUN (counts only, run alone) ───────────────
with keep(id) as (
  values
    ('00000000-0000-0000-0000-000000000000'::uuid)  -- ← REPLACE with real keep ids
)
select 'orders'        as tbl, count(*) as will_delete from orders
union all select 'reviews',       count(*) from reviews
union all select 'products',      count(*) from products
union all select 'mailing_list',  count(*) from mailing_list
union all select 'rate_limits',   count(*) from rate_limits
union all select 'auth users',    count(*) from auth.users  where id not in (select id from keep)
union all select 'profiles kept', count(*) from profiles    where id     in (select id from keep)
union all select 'storage: product-files objects', count(*) from storage.objects where bucket_id = 'product-files'
union all select 'storage: covers objects',        count(*) from storage.objects where bucket_id = 'covers';

-- ─────────────── STEP 1 — THE WIPE (run as one statement batch) ───────────────
-- Uncomment everything below when the dry-run numbers look right.
/*
begin;

-- 1) orders first: they pin products AND profiles (restrict FKs)
delete from orders;

-- 2) reviews would cascade with products, but explicit beats implicit
delete from reviews;

-- 3) all listings (kept users' content included — launch starts clean)
delete from products;

-- 4) mailing list + rate-limit counters
delete from mailing_list;
delete from rate_limits;

-- 5) users: delete the AUTH rows (cascades profiles). Keep-list survives.
delete from auth.users
where id not in (
  values
    ('00000000-0000-0000-0000-000000000000'::uuid)  -- ← SAME keep ids as above
);

-- 6) storage: rows don't cascade files — empty both buckets
delete from storage.objects where bucket_id in ('product-files', 'covers');

commit;
*/
