-- ============================================================
-- 012 — profile pictures
-- Run AFTER 011, in: Supabase Dashboard → SQL Editor.
--
-- Avatars live in the existing PUBLIC `covers` bucket under the
-- user's own folder (avatar-<uuid>.<ext>) — the folder-scoped
-- storage policies from migration 002 already cover uploads,
-- replacement, and deletion, and the bucket's 5MB image-only
-- limits apply. No new storage rules needed.
-- ============================================================

alter table public.profiles
  add column if not exists avatar_path text;

comment on column public.profiles.avatar_path is
  'Path in the public covers bucket (own folder). Self-editable.';

-- expose in the public instructor directory (it is a public image;
-- appended LAST so create-or-replace is valid)
create or replace view public.instructors as
  select id, display_name, shop_name, bio, specialisations,
         stripe_charges_enabled, created_at, avatar_path
  from public.profiles
  where role in ('seller', 'admin')
    and account_status = 'active';
