-- ============================================================
-- 029 — every account gets a profile page
-- Run AFTER 028, in: Supabase Dashboard → SQL Editor. Safe before
-- or after the matching code push (same columns, only the WHERE
-- changes — reads keep working either way).
--
-- OWNER DECISION (Aleks, 2026-08-15): kula's account model has no
-- buyer/seller fork — anyone can flip to selling with one upload —
-- so a profile that exists from day one and grows a shelf when you
-- post is that model made visible. The role filter below was a
-- leftover from the v1 two-role world, and it made the "my profile"
-- menu link a guaranteed 404 for buyers (who also couldn't set an
-- avatar at all, since profile editing lives on the page they
-- couldn't reach).
--
-- Privacy carve-outs live in code, not here: empty profiles are
-- kept OUT of the sitemap and carry a noindex tag (reachable only
-- by shared URL — there is no member directory and nothing links
-- to buyer profiles), and the ask-a-question mailto only renders
-- once a profile actually has published content.
--
-- The view keeps its historical name `instructors` — renaming
-- would churn every consumer for zero behavior; treat the name as
-- "public member directory" from here on. Moderation ghosting
-- (account_status filter) is unchanged.
-- ============================================================

create or replace view public.instructors as
  select id, display_name, shop_name, bio, specialisations,
         stripe_charges_enabled, created_at, avatar_path,
         website_url, banner_path, socials
  from public.profiles
  where account_status = 'active';

comment on view public.instructors is
  'Public-safe profile projection for EVERY active account (029) — historically sellers-only, hence the name. Buyers get pages too; empty profiles are noindexed and unlisted in the sitemap by the app.';
