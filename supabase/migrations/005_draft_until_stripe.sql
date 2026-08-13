-- ============================================================
-- Kula Marketplace — 005: listings stay drafts until Stripe
-- Run AFTER 004, in: Supabase Dashboard → SQL Editor.
--
-- Sellers can create and prepare listings before connecting
-- Stripe, but nothing can GO LIVE (status = 'active') until
-- their Stripe account is verified (profiles.stripe_charges_
-- enabled). Enforced here in the database — the dashboard UI is
-- just a courtesy. Admins and server contexts are exempt.
-- ============================================================

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

  -- going live requires a verified Stripe account
  if new.status = 'active'
     and (TG_OP = 'INSERT' or new.status is distinct from old.status)
     and auth.uid() is not null
     and not public.is_admin() then
    if not exists (
      select 1 from public.profiles p
      where p.id = new.seller_id and p.stripe_charges_enabled
    ) then
      raise exception 'Connect Stripe before publishing — your listing is safe as a draft';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists products_guard on public.products;

create trigger products_guard
  before insert or update on public.products
  for each row execute function public.enforce_product_guard();
