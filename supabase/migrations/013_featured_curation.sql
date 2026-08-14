-- ============================================================
-- 013 — featured curation: her hand first, math as understudy
-- Run AFTER 012, in: Supabase Dashboard → SQL Editor.
--
-- • products.featured_at — set by ADMINS ONLY (front-page
--   placement is valuable; sellers cannot self-feature). Null =
--   not featured; the timestamp doubles as the pick order.
-- • featured_products view — the homepage's featured shelf:
--   admin picks first, then a transparent score fills the rest.
--   Score = 50% bayesian rating + 30% conversion + 20% recency
--   (14-day half-life, so new listings always get an audition
--   and the front page never fossilizes).
--   The view exposes only the BLENDED score — never raw sales
--   counts (those are the seller's private business) — and it
--   respects moderation ghosting + active status.
-- ============================================================

alter table public.products
  add column if not exists featured_at timestamptz;

comment on column public.products.featured_at is
  'Admin curation: non-null = featured on the homepage, newest pick first. Admin-only (guard trigger).';

-- extend the product guard: only admins touch featured_at
-- (full function body restated — this is revision 3: 005 stripe gate,
--  011 free-listing exemption, 013 featured guard)
create or replace function public.enforce_product_guard()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if TG_OP = 'UPDATE' then
    -- sellers cannot reinstate their own suspended listing
    if old.status = 'suspended'
       and new.status is distinct from old.status
       and auth.uid() is not null
       and not public.is_admin() then
      raise exception 'Only admins can reinstate a suspended listing';
    end if;
    new.updated_at := now();
  end if;

  -- only admins feature/unfeature listings
  if new.featured_at is not null
     and (TG_OP = 'INSERT' or new.featured_at is distinct from old.featured_at)
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only admins can feature a listing';
  end if;
  if TG_OP = 'UPDATE'
     and old.featured_at is not null
     and new.featured_at is null
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only admins can unfeature a listing';
  end if;

  -- going live WITH A PRICE requires a verified Stripe account
  -- (free listings are exempt; also catches free→paid flips)
  if new.status = 'active'
     and new.price_cents > 0
     and (TG_OP = 'INSERT'
          or new.status is distinct from old.status
          or (old.price_cents = 0 and new.price_cents > 0))
     and auth.uid() is not null
     and not public.is_admin() then
    if not exists (
      select 1 from public.profiles p
      where p.id = new.seller_id and p.stripe_charges_enabled
    ) then
      raise exception 'Connect Stripe before publishing paid listings — free listings and drafts are fine';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists products_guard on public.products;
create trigger products_guard
  before insert or update on public.products
  for each row execute function public.enforce_product_guard();

-- ---------- the ranked shelf ----------
create or replace view public.featured_products as
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
  id, seller_id, title, description, category, price_cents, file_path,
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
