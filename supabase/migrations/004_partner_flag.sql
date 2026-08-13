-- ============================================================
-- Kula Marketplace — 004: explicit partner flag
-- Run AFTER 003, in: Supabase Dashboard → SQL Editor.
--
-- `partner` marks a seller as a partner independently of their
-- rate. Setting a commission override auto-marks partner; removing
-- partner clears any negotiated rate (the deal ends with the
-- partnership). Backfills anyone who already has a custom rate.
-- ============================================================

alter table public.profiles
  add column if not exists partner boolean not null default false;

update public.profiles
set partner = true
where commission_override is not null and partner = false;
