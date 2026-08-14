-- ============================================================
-- 011 — free listings
-- Run AFTER 010, in: Supabase Dashboard → SQL Editor.
--
-- Sellers can mark a listing FREE (price_cents = 0):
--   • paid listings keep the $1.00 minimum (Terms §4.6)
--   • free listings may be PUBLISHED before Stripe is connected —
--     the Stripe gate exists because money needs a destination,
--     and free content moves no money
--   • an unverified seller can NOT flip a live free listing to a
--     paid price (that's the gate's job)
--
-- NOTE for the owner: Terms §4.6 currently reads "all listings
-- must be priced at a minimum of $1.00" — needs her updated
-- wording to allow free resources (flagged in chat).
-- ============================================================

-- price floor becomes: exactly free, or at least $1
alter table public.products
  drop constraint if exists products_price_floor;
alter table public.products
  drop constraint if exists products_price_cents_check; -- 001's inline check
alter table public.products
  add constraint products_price_floor
  check (price_cents = 0 or price_cents >= 100);

comment on constraint products_price_floor on public.products is
  'Free (0) or at least $1.00 (Terms 4.6; free listings owner-approved).';

-- publish gate: only PAID listings require a verified Stripe account
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

  -- going live WITH A PRICE requires a verified Stripe account.
  -- (also catches flipping a live free listing to a paid price)
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
