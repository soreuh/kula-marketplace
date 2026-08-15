-- ============================================================
-- 025 — platform_settings.notify_purchase_emails
-- Run AFTER 024, in: Supabase Dashboard → SQL Editor.
-- Deploy order: run this BEFORE pushing the code. The email-send
-- paths read the column tolerantly (missing = ON), but the admin
-- "notifications" form writes all three switches at once — saving
-- it against an un-migrated DB would error.
--
-- WHY: buyers previously got NO email from anyone after a purchase
-- (the Resend mail went to the SELLER; Stripe's own card receipt is
-- off until enabled in its dashboard at live activation). Etsy and
-- Gumroad both send an access-link confirmation — table stakes for
-- digital downloads, and kula's one guaranteed inbox touchpoint.
-- The webhook now sends "it's in your library" to the buyer on paid
-- orders, and /api/claim-free sends the free-claim variant.
--
-- Transactional receipt: no per-buyer opt-out (matches the space);
-- this platform switch is the admin's kill switch, joining the two
-- from 022 in the same admin section.
-- ============================================================

alter table public.platform_settings
  add column if not exists notify_purchase_emails boolean not null default true;

comment on column public.platform_settings.notify_purchase_emails is
  'When false, buyers get no "it''s in your library" confirmation emails (paid orders and free claims) platform-wide.';
