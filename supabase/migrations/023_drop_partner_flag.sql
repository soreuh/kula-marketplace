-- ============================================================
-- 023 — partner becomes DERIVED: drop the profiles.partner column
-- Run AFTER 022, in: Supabase Dashboard → SQL Editor.
-- ⚠️ DEPLOY THE CODE FIRST, then run this — the previous deploy still
--    writes partner on rate changes and would error once the column is
--    gone. (The new code never references it, so code-first is safe.)
--
-- WHY: "partner" was a stored boolean whose only real meaning was "has
-- a negotiated commission_override" — zero economic function (checkout
-- reads only the override; the public instructors view never exposed
-- it). The stored flag existed only through coupling rules (setting a
-- rate auto-marked it; unmarking cleared the rate), and that coupling
-- is exactly what let one ungated click destroy a negotiated deal
-- (caught by Aleks, 2026-08-14). Derived state can't desync and can't
-- be misclicked: partner IS commission_override is not null, computed
-- in the admin UI. The toggle button and togglePartner action are gone;
-- the only control is the (password-gated) rate field.
--
-- What this deliberately gives up: "badge-only partners" (flag without
-- a deal) — an admin-only label with no known use. If a PUBLIC teacher
-- designation is ever wanted, that's a new feature, not this flag.
-- ============================================================

alter table public.profiles drop column if exists partner;

-- Recreate the column guard (008, extended 014) without the partner
-- clause — a trigger referencing a dropped column would error on every
-- profile update. All other protections unchanged.
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
    if new.stripe_charges_enabled is distinct from old.stripe_charges_enabled then
      raise exception 'stripe_charges_enabled is synced from Stripe, not user-set';
    end if;
    if new.stripe_account_id is distinct from old.stripe_account_id then
      raise exception 'stripe_account_id is set during Stripe onboarding';
    end if;
    if new.terms_accepted_at is distinct from old.terms_accepted_at then
      raise exception 'terms acceptance is recorded at signup, not user-editable';
    end if;
    if new.terms_version is distinct from old.terms_version then
      raise exception 'terms acceptance is recorded at signup, not user-editable';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_column_guard on public.profiles;
create trigger profiles_column_guard
  before update on public.profiles
  for each row execute function public.enforce_profile_guard();
