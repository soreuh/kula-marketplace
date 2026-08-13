-- ============================================================
-- 007 — user moderation: pause / activate / soft-delete
-- Run AFTER 006, in: Supabase Dashboard → SQL Editor.
--
-- profiles.account_status:
--   'active'  — normal.
--   'paused'  — buying is blocked; their listings and public
--               instructor profile are ghosted from the market.
--   'deleted' — same ghosting, and the admin panel also bans
--               sign-in. ALL DATA STAYS in the database —
--               nothing is ever dropped.
--
-- Ghosting is read-path only (RLS + view). Product rows are never
-- modified, so re-activating restores exactly the previous state —
-- and the Stripe publish gate (005) still applies as usual.
-- Buyers who already purchased keep access to what they bought.
-- ============================================================

alter table public.profiles
  add column if not exists account_status text not null default 'active'
    check (account_status in ('active', 'paused', 'deleted'));

comment on column public.profiles.account_status is
  'active | paused (buying blocked, listings ghosted) | deleted (also login-banned via admin panel). Data always retained.';

-- Only admins (or SQL editor / service role) may change it — otherwise
-- a paused user could simply un-pause themselves.
create or replace function public.enforce_account_status_guard()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.account_status is distinct from old.account_status
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only admins can change account status';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_account_status_guard on public.profiles;
create trigger profiles_account_status_guard
  before update on public.profiles
  for each row execute function public.enforce_account_status_guard();

-- SECURITY DEFINER helpers so policies can look across tables without
-- tripping RLS recursion (products and orders policies reference each
-- other) or being blinded by profiles' own row-visibility rules.
create or replace function public.account_is_active(uid uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.account_status = 'active'
  );
$$;

create or replace function public.has_paid_order(pid uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.orders o
    where o.product_id = pid
      and o.buyer_id = auth.uid()
      and o.status in ('paid', 'refunded')
  );
$$;

-- Ghost the listings of paused/deleted sellers from the public read
-- path. Sellers still see their own; admins see everything; and prior
-- buyers keep access to what they bought (library + downloads).
drop policy if exists "products_select" on public.products;
create policy "products_select" on public.products
  for select using (
    seller_id = auth.uid()
    or public.is_admin()
    or public.has_paid_order(id)
    or (status = 'active' and public.account_is_active(seller_id))
  );

-- Paused/deleted accounts can't post reviews either.
drop policy if exists "reviews_insert" on public.reviews;
create policy "reviews_insert" on public.reviews
  for insert with check (
    buyer_id = auth.uid()
    and public.account_is_active(auth.uid())
    and exists (
      select 1 from public.orders o
      where o.buyer_id = auth.uid()
        and o.product_id = reviews.product_id
        and o.status = 'paid'
    )
  );

-- Public instructor directory hides paused/deleted accounts.
create or replace view public.instructors as
  select id, display_name, shop_name, bio, specialisations,
         stripe_charges_enabled, created_at
  from public.profiles
  where role in ('seller', 'admin')
    and account_status = 'active';
