-- ============================================================
-- 014 — record terms & privacy acceptance at signup (clickwrap)
-- Run AFTER 013, in: Supabase Dashboard → SQL Editor.
--
-- WHY: the signup form now requires an explicit, unchecked-by-
-- default checkbox agreeing to /terms and /privacy ("clickwrap").
-- A checkbox nobody can prove was ticked is worth little, so the
-- acceptance is recorded on the profile: WHEN, and WHICH VERSION
-- of the documents was live at the time (lib/site.ts TERMS_VERSION).
--
-- Design notes:
--   • the timestamp is stamped SERVER-SIDE with now() — a client
--     clock is never trusted; the signup metadata only carries the
--     fact of consent and the version string it consented to.
--   • both columns are write-once for the user: the column guard
--     (008) is extended so a user cannot set, clear, backdate, or
--     rewrite their own acceptance. Admins and trusted server
--     contexts (SQL editor / service role) still can, which is how
--     a future re-consent flow would stamp them.
--   • existing rows keep NULL — meaning "signed up before the
--     checkbox existed", which is the honest answer. Do NOT
--     backfill them with a timestamp; that would fabricate consent.
--     (Moot in practice: current data is all test data, to be
--     wiped before launch.)
-- ============================================================

alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text;

comment on column public.profiles.terms_accepted_at is
  'When this user ticked the terms/privacy consent box at signup. NULL = predates the checkbox; never backfill.';
comment on column public.profiles.terms_version is
  'Value of TERMS_VERSION (lib/site.ts) at the moment of acceptance — which revision of the documents they agreed to.';

-- ---------- Signup trigger: stamp the acceptance ----------
-- Replaces the 001 definition; the role logic is unchanged.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  requested text := coalesce(new.raw_user_meta_data ->> 'role', 'buyer');
  accepted  boolean := coalesce(
    (new.raw_user_meta_data ->> 'terms_accepted')::boolean, false);
begin
  if requested not in ('buyer', 'seller') then
    requested := 'buyer';
  end if;

  insert into public.profiles (
    id, email, display_name, role, terms_accepted_at, terms_version
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    requested::public.user_role,
    -- server clock, and only when consent was actually signalled
    case when accepted then now() end,
    case when accepted then new.raw_user_meta_data ->> 'terms_version' end
  );
  return new;
end;
$$;

-- ---------- Guard: acceptance is not user-editable ----------
-- Extends 008 with the two new columns (all prior rules kept).
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
