-- ============================================================
-- Kula Marketplace — 003: per-seller commission override
-- Run AFTER 002, in: Supabase Dashboard → SQL Editor.
--
-- Lets the admin negotiate a custom commission percent with
-- partner sellers (e.g. 15% instead of the default 30%). The
-- flat 25¢ per transaction still applies. NULL = platform
-- default from platform_settings. Rates are private: sellers
-- see their own, the admin sees all, buyers never do (the
-- public `instructors` view does not include this column).
-- ============================================================

alter table public.profiles
  add column if not exists commission_override numeric(5, 2)
    check (commission_override is null
           or (commission_override >= 0 and commission_override <= 100));
