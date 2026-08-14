-- ============================================================
-- 022 — products.file_sha256 (content-change detection)
-- Run AFTER 021, in: Supabase Dashboard → SQL Editor.
--
-- WHY: replacing a listing's file now emails prior buyers that an
-- update is ready (buyers download via /api/download, which always
-- serves the CURRENT file — so without an email, updates were
-- invisible to anyone who'd already downloaded). The hash is how the
-- upload dialog tells a REAL content change from a re-upload of the
-- same file: same sha256 → no swap, no email.
--
-- Computed client-side (crypto.subtle) at upload; stored on insert and
-- on every file replacement. Sellers can only write their own rows and
-- lying about the hash only affects their own buyers' emails, which the
-- notify route rate-limits to 1/product/24h regardless (018 counters).
-- NULL = uploaded before this migration; the first replacement of such
-- a listing can't compare, treats the content as changed, and emails.
-- ============================================================

alter table public.products
  add column if not exists file_sha256 text;

comment on column public.products.file_sha256 is
  'SHA-256 of the current sale file (hex, client-computed). Gates the buyer update email: unchanged hash = no swap, no email. NULL = predates 022.';

-- Platform-level kill switch for the buyer update emails, toggleable in
-- the admin "notifications" section. Checked SERVER-side by the notify
-- route, so turning it off actually stops sends rather than hiding a
-- button. Default ON.
alter table public.platform_settings
  add column if not exists notify_content_updates boolean not null default true;

comment on column public.platform_settings.notify_content_updates is
  'When false, /api/notify-update is a no-op — buyers get no file-update emails platform-wide.';

-- Per-user preference mirroring the platform switch: buyers can opt out
-- of file-update emails themselves (self-editable own-row column, like
-- sale_notifications for sellers). The notify route honors BOTH levels:
-- platform switch AND the individual preference.
alter table public.profiles
  add column if not exists content_update_emails boolean not null default true;

comment on column public.profiles.content_update_emails is
  'Buyer preference: email me when content I own gets a new version. Self-editable; honored by /api/notify-update.';

-- Platform switch for the existing seller sale emails too, so the admin
-- notifications panel governs every email type the app sends. The webhook
-- reads it tolerantly (missing column = ON).
alter table public.platform_settings
  add column if not exists notify_sale_emails boolean not null default true;

comment on column public.platform_settings.notify_sale_emails is
  'When false, the webhook sends no sale-notification emails platform-wide (sellers'' individual sale_notifications preference still applies when true).';
