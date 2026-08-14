-- ============================================================
-- 008 — lock down self-serve profile columns
-- Run AFTER 007, in: Supabase Dashboard → SQL Editor.
--
-- WHY: Postgres RLS grants row access, not column access. The
-- profiles_update policy (migration 001) lets a user update THEIR
-- OWN row — which, with no column guard, let a seller rewrite
-- money-critical columns on themselves:
--   • commission_override → set to 0 and keep ~all of every sale
--     (checkout reads this to compute the Stripe application fee)
--   • stripe_charges_enabled → force listings live without Stripe
--   • stripe_account_id / partner → misdirect payouts / fake status
--
-- These may ONLY be changed by an admin, or by a trusted server
-- context (SQL editor / service-role key, where auth.uid() is
-- null). The onboard route and the dashboard Stripe-sync were
-- updated to use the service-role client so they still work.
-- (role and account_status already have their own guards.)
-- ============================================================

create or replace function public.enforce_profile_guard()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.commission_override is distinct from old.commission_override then
      raise exception 'commission_override is set by kula, not by sellers';
    end if;
    if new.partner is distinct from old.partner then
      raise exception 'partner status is set by kula';
    end if;
    if new.stripe_charges_enabled is distinct from old.stripe_charges_enabled then
      raise exception 'stripe_charges_enabled is synced from Stripe, not user-set';
    end if;
    if new.stripe_account_id is distinct from old.stripe_account_id then
      raise exception 'stripe_account_id is set during Stripe onboarding';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_column_guard on public.profiles;
create trigger profiles_column_guard
  before update on public.profiles
  for each row execute function public.enforce_profile_guard();
