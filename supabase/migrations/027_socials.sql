-- ============================================================
-- 027 — socials: one jsonb map replaces instagram_handle
-- Run AFTER 026, in: Supabase Dashboard → SQL Editor.
-- ⚠️ DEPLOY ORDER: run this BEFORE pushing the code — the profile
-- page reads tolerantly, but the edit form writes `socials` on
-- save. (The old deploy keeps working against the new view: its
-- instagram chip simply stops rendering until the push.)
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

alter table public.profiles
  add column if not exists socials jsonb not null default '{}'::jsonb;

comment on column public.profiles.socials is
  'Curated social handles, e.g. {"instagram":"her_handle","tiktok":"..."}. Keys from lib/socials.ts; bare handles (no @, no URL), normalized on save. Self-editable.';

-- fold 026's instagram column into the map, then drop it
update public.profiles
  set socials = socials || jsonb_build_object('instagram', instagram_handle)
  where instagram_handle is not null and instagram_handle <> '';

alter table public.profiles
  drop column if exists instagram_handle;

-- The view must lose instagram_handle and gain socials — CREATE OR
-- REPLACE can't remove a column, so drop + recreate. Nothing depends
-- on this view (checked: instructor_ratings/featured_products build on
-- their own tables). Plain view like 012 (owner rights — that's what
-- lets it expose these public-safe columns past profiles RLS); explicit
-- grants restated because DROP discards them.
drop view public.instructors;

create view public.instructors as
  select id, display_name, shop_name, bio, specialisations,
         stripe_charges_enabled, created_at, avatar_path,
         website_url, banner_path, socials
  from public.profiles
  where role in ('seller', 'admin')
    and account_status = 'active';

grant select on public.instructors to anon, authenticated;
