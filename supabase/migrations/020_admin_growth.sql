-- ============================================================
-- 020 — launch date + editable growth-model drivers
-- Run AFTER 019, in: Supabase Dashboard → SQL Editor.
--
-- Powers the admin "growth model check-in" section: live marketplace
-- actuals compared against the Mid path of ../kula-growth-model.xlsx.
-- The spreadsheet's FORMULAS are replicated in lib/growth-model.ts and
-- fed by these drivers, so editing a driver in admin recomputes the
-- whole 24-month curve — the xlsx stays the reference implementation.
--
--   launch_date   month 1 of the model. Defaults to 2026-08-01 (test
--                 era); the owner resets it in admin at real launch.
--   growth_model  jsonb of driver overrides. NULL = the Mid defaults
--                 baked into lib/growth-model.ts (which match the xlsx
--                 as of 2026-08-14). Only ever written by admins via
--                 the platform_settings row they already control.
--
-- Tolerant-read pattern as usual: code treats missing columns/NULL as
-- defaults, so deploy order doesn't matter.
-- ============================================================

alter table public.platform_settings
  add column if not exists launch_date date not null default '2026-08-01',
  add column if not exists growth_model jsonb;

comment on column public.platform_settings.launch_date is
  'Month 1 of the growth model (admin-settable). Reset at real launch.';
comment on column public.platform_settings.growth_model is
  'Driver overrides for lib/growth-model.ts; NULL = Mid-scenario defaults from kula-growth-model.xlsx.';
