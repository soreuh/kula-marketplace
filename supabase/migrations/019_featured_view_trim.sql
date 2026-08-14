-- ============================================================
-- 019 — drop file_path from the featured_products view
-- Run AFTER 018, in: Supabase Dashboard → SQL Editor.
--
-- HYGIENE, not a hole — scoped honestly (2026-08-14 audit review,
-- corrected): file_path is ALSO readable by anon through the products
-- table itself, because every public page selects * and RLS grants ROW
-- access to active listings (Postgres RLS is row-level, not
-- column-level). So this view never added exposure; it just carried a
-- column nothing renders (app/page.tsx reads covers/price/score, and
-- downloads only ever mint signed URLs server-side after a paid-order
-- check — knowing a path grants nothing, the bucket is private).
--
-- The view should still not haul it around: least privilege, and the
-- view is the one surface we fully control the column list on.
--
-- THE REAL FIX, if original-filename privacy ever matters, is parked in
-- TODO.md: column-level privileges on products.file_path (or a public
-- listing view) — which breaks every select("*") in the app, so it
-- needs a deliberate refactor to explicit column lists, not a hotfix.
--
-- Postgres can't remove a column via CREATE OR REPLACE VIEW, so this is
-- a DROP + CREATE; the grant must be re-issued. Scoring is UNCHANGED
-- from 013 (bayesian 50 / conversion 30 / recency 20).
-- ============================================================

drop view if exists public.featured_products;

create view public.featured_products as
with stats as (
  select
    p.*,
    coalesce(r.avg_rating, 0) as _avg_rating,
    coalesce(r.n_reviews, 0)  as _n_reviews,
    coalesce(o.n_sales, 0)    as _n_sales
  from public.products p
  left join (
    select product_id, avg(rating)::numeric as avg_rating, count(*) as n_reviews
    from public.reviews group by product_id
  ) r on r.product_id = p.id
  left join (
    select product_id, count(*) as n_sales
    from public.orders where status = 'paid' group by product_id
  ) o on o.product_id = p.id
  where p.status = 'active'
    and public.account_is_active(p.seller_id) -- moderation ghosting applies
)
select
  id, seller_id, title, description, category, price_cents,
  status, created_at, updated_at, content_type, level, duration_minutes,
  teachability, theme, props, anatomy_focus, usage_notes, peak_pose,
  sequence_breakdown, target_audience, cover_path, preview_path, views,
  featured_at,
  -- 50% bayesian rating (pulled toward 4.0 until ~3 reviews)
  -- 30% conversion (sales per view, saturating at 10%)
  -- 20% recency (half-life: 14 days)
  round((
      0.5 * (((_avg_rating * _n_reviews + 4.0 * 3) / (_n_reviews + 3)) / 5.0)
    + 0.3 * least(1.0, (_n_sales::numeric / greatest(views, 1)) * 10)
    + 0.2 * power(0.5, extract(epoch from (now() - created_at)) / (86400.0 * 14))
  )::numeric, 6) as featured_score
from stats;

grant select on public.featured_products to anon, authenticated;
