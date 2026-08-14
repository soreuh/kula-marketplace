-- ============================================================
-- 021 — profiles.last_seen_at (stickiness signal)
-- Run AFTER 020, in: Supabase Dashboard → SQL Editor.
--
-- WHY: "how sticky is the platform?" needs LAST ACTIVITY, and Supabase's
-- auth.users.last_sign_in_at can't answer it — sessions persist, so a
-- user who stays logged in for weeks never signs in again and looks
-- inactive while using the site daily.
--
-- The app layout stamps this on any page view when the current value is
-- more than an hour old (see app/layout.tsx) — at most one write per
-- user per hour, fire-and-forget. Users CAN technically write their own
-- row's value (own-row RLS update, and the 008 column guard deliberately
-- doesn't cover it) — that's fine: it's an engagement signal for the
-- admin panel, not a security datum, and faking "I was here" is what
-- visiting the site does anyway.
--
-- Backfill: seed from auth's last_sign_in_at so the admin panel isn't a
-- wall of "never" on day one. (Test data — wiped before launch anyway.)
-- ============================================================

alter table public.profiles
  add column if not exists last_seen_at timestamptz;

comment on column public.profiles.last_seen_at is
  'Last page view (stamped by the app layout, throttled to 1/hour). Stickiness signal for admin — not security data.';

update public.profiles p
set last_seen_at = u.last_sign_in_at
from auth.users u
where u.id = p.id and p.last_seen_at is null;
