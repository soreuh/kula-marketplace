-- ============================================================
-- 030 — public names must never be emails
-- Run AFTER 029, in: Supabase Dashboard → SQL Editor. Order-safe
-- vs the code push (the code also masks defensively).
--
-- FOUND 2026-08-15 during the 029 verify: a buyer profile rendered
-- the account's RAW EMAIL as its public name (h1, <title>, meta
-- description). Two roots:
--   1. The signup trigger seeds profiles.display_name from the
--      email (the live DB carries an older variant of 001's
--      function — the migration file was edited after it had been
--      applied, which is exactly why 001 must never be rewritten).
--      No UI has ever let users SET display_name, so every seeded
--      value is email-derived.
--   2. The review form stamps reviews.reviewer_name from
--      display_name — so email-derived names sit on PUBLIC product
--      pages as reviewer names.
-- 029 made buyer profiles reachable, which surfaced it. Test data
-- only; nothing real leaked.
--
-- Fix: (a) recreate the trigger to seed display_name ONLY from
-- explicit signup metadata (none today → null; the profile page
-- falls back to "kula member", the nav greeting still uses the
-- email local-part PRIVATELY); (b) null every email-derived
-- display_name; (c) scrub email-derived reviewer_names to the
-- form's own fallback. Code-side belt & braces ships alongside:
-- publicName() masks any @-containing name at render, and the
-- review form stops copying emails forward.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  requested text := new.raw_user_meta_data ->> 'role';
begin
  if requested not in ('buyer', 'seller') then
    requested := 'buyer';
  end if;

  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    -- explicit metadata only — NEVER derived from the email address
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    requested::public.user_role
  );
  return new;
end;
$$;

-- (b) null out every display_name that is the email or its local part —
-- no UI ever let a user choose display_name, so these are all seeded
update public.profiles
  set display_name = null
  where display_name = email
     or display_name = split_part(email, '@', 1);

-- (c) scrub reviewer names that expose the reviewer's email (full, local
-- part, or any @-containing string) back to the form's own fallback
update public.reviews r
  set reviewer_name = 'verified buyer'
  from public.profiles p
  where p.id = r.buyer_id
    and (r.reviewer_name = p.email
      or r.reviewer_name = split_part(p.email, '@', 1)
      or r.reviewer_name like '%@%');
