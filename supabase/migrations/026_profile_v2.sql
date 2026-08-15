-- ============================================================
-- 026 — instructor profile v2: banner, links, (member-since)
-- Run AFTER 025, in: Supabase Dashboard → SQL Editor.
-- ⚠️ DEPLOY ORDER: run this BEFORE pushing the code — the profile
-- page reads tolerantly (missing columns just don't render), but
-- the EDIT FORM writes all three new columns on save, which would
-- error against an un-migrated DB.
--
-- WHY (profile comparison vs TpT/Etsy/Gumroad, Aug 2026): kula's
-- profile already carries the trust table stakes (rating, bio,
-- listings) but lacked the four elements the space treats as
-- standard on a seller click-through: a banner (TpT + Etsy store
-- pages are banner-led), external links (TpT's redesign added
-- socials; it's the seller's external proof), member-since (near-
-- universal trust line — needs NO column, instructors.created_at
-- already exposes it), and a contact path (handled in-code as a
-- prefilled mailto relay through hello@ — seller emails stay
-- private). Deliberately NOT built, matching what even Gumroad
-- skips at this scale: follow buttons, public sales counts,
-- shop-level review lists, pinned items, in-store search.
--
-- All three columns are self-editable profile fields like bio /
-- avatar_path — not money columns, no 008-style guard. Banner
-- images live in the public covers bucket under the user's own
-- folder (banner-<uuid>.<ext>) — the folder-scoped storage
-- policies from 002 already cover them, same as avatars (012).
-- The website/instagram values are normalized client-side
-- (https:// prefix, bare handle) and scheme-guarded again at
-- render, so a stored "javascript:" can never become a live href.
-- ============================================================

alter table public.profiles
  add column if not exists website_url text,
  add column if not exists instagram_handle text,
  add column if not exists banner_path text;

comment on column public.profiles.website_url is
  'Seller''s own site, normalized to https?:// on save. Self-editable; shown as a link chip on the public profile.';

comment on column public.profiles.instagram_handle is
  'Bare Instagram handle (no @, no URL — normalized on save). Self-editable; rendered as instagram.com/<handle>.';

comment on column public.profiles.banner_path is
  'Profile banner image path in the public covers bucket (own folder). Self-editable, same rules as avatar_path (012).';

-- expose on the public instructor directory (appended LAST so
-- create-or-replace is valid, same pattern as 012)
create or replace view public.instructors as
  select id, display_name, shop_name, bio, specialisations,
         stripe_charges_enabled, created_at, avatar_path,
         website_url, instagram_handle, banner_path
  from public.profiles
  where role in ('seller', 'admin')
    and account_status = 'active';
