-- ============================================================
-- 006 — $1.00 minimum listing price
-- Run AFTER 005, in: Supabase Dashboard → SQL Editor.
-- Matches Terms & Conditions §4.6 ("all listings must be priced
-- at a minimum of $1.00"). The upload form already enforces this;
-- this check makes the database agree with the legal text.
-- ============================================================

-- If the ADD errors with "violated by some row", find and fix
-- cheap listings first:
--   select id, title, price_cents from public.products where price_cents < 100;

alter table public.products
  drop constraint if exists products_price_floor;

alter table public.products
  add constraint products_price_floor check (price_cents >= 100);

comment on constraint products_price_floor on public.products is
  'Terms & Conditions 4.6: minimum listing price is $1.00.';
