-- ============================================================
-- 027 — socials: one jsonb map replaces instagram_handle
-- Run AFTER 026, in: Supabase Dashboard → SQL Editor.
-- ⚠️ DEPLOY ORDER: run this BEFORE pushing the code — the profile
-- page reads tolerantly, but the edit form writes `socials` on
-- save. (The old deploy keeps working against the new view: its
-- instagram chip simply stops rendering until the push.)
--
-- STATEMENT ORDER MATTERS (lesson from the first attempt, which
-- Postgres rejected with 2BP01): the 026 view still SELECTs
-- instagram_handle, so the view must be DROPPED before the column
-- can be — dependent views go first, always. The whole script is
-- also idempotent (if-exists guards + a conditional backfill), so
-- re-running it in any half-applied state is safe.
--
-- WHY (owner decision, same day as 026): one instagram column
-- doesn't scale to "also tiktok, facebook, x, …" — and a column
-- per network is schema churn forever. One jsonb map + a curated
-- allowlist in lib/socials.ts (instagram / tiktok / youtube /
-- facebook / pinterest / x) does: adding a network later is ONE
-- line in that file, zero migrations. 026 shipped hours earlier,
-- so instagram_handle is folded in (backfilled, then dropped)
-- rather than left as a parallel copy — the anti-bloat rule.
-- Keys are constrained by the UI/normalizer, not the DB: worst
-- case an unknown key sits inert in the map and never renders.
-- ============================================================

-- 1) the new column
alter table public.profiles
  add column if not exists socials jsonb not null default '{}'::jsonb;

comment on column public.profiles.socials is
  'Curated social handles, e.g. {"instagram":"her_handle","tiktok":"..."}. Keys from lib/socials.ts; bare handles (no @, no URL), normalized on save. Self-editable.';

-- 2) fold 026's instagram column into the map — guarded so the script
--    can re-run after the column is already gone
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'instagram_handle'
  ) then
    update public.profiles
      set socials = socials || jsonb_build_object('instagram', instagram_handle)
      where instagram_handle is not null and instagram_handle <> '';
  end if;
end $$;

-- 3) the 026 view still selects instagram_handle → it must go BEFORE the
--    column can. (CREATE OR REPLACE can't remove a view column anyway.)
--    Nothing else depends on this view (instructor_ratings and
--    featured_products build on their own tables).
drop view if exists public.instructors;

-- 4) now the column can be dropped
alter table public.profiles
  drop column if exists instagram_handle;

-- 5) recreate the view — plain view like 012 (owner rights are what let
--    it expose these public-safe columns past profiles RLS); explicit
--    grants restated because DROP discards them
create view public.instructors as
  select id, display_name, shop_name, bio, specialisations,
         stripe_charges_enabled, created_at, avatar_path,
         website_url, banner_path, socials
  from public.profiles
  where role in ('seller', 'admin')
    and account_status = 'active';

grant select on public.instructors to anon, authenticated;
