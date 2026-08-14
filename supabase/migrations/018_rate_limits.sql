-- ============================================================
-- 018 — server-side rate-limit counters
-- Run AFTER 017, in: Supabase Dashboard → SQL Editor.
--
-- WHY: /api/mailing-list accepts any email from anyone — no captcha
-- (owner decision, Aug 2026) and, until now, no rate limit. Since the
-- Aug 2026 change every ACCOUNT signup also mirrors into the owner's
-- Mailchimp audience, so an unthrottled endpoint lets a script inject
-- arbitrary addresses into her list — list poisoning whose spam
-- complaints land on the domain reputation authenticated in the
-- cutover. A per-IP rate limit closes the scripted abuse without
-- adding captcha friction for humans.
--
-- The counter lives in Postgres because the app runs on serverless
-- functions — in-memory counters reset on every cold start and aren't
-- shared between instances. Fixed-window counting is enough here: the
-- goal is stopping bulk abuse, not precision traffic shaping.
--
-- SECURITY: RLS is ENABLED with NO policies — anon/authenticated can
-- do nothing with this table. Only the service-role client (RLS
-- bypass) reads or writes it. The increment is a single atomic upsert
-- (see public.rate_limit_hit) so concurrent requests can't undercount.
-- ============================================================

create table if not exists public.rate_limits (
  bucket text not null,                -- e.g. 'mailing-list:203.0.113.7'
  window_start timestamptz not null,   -- fixed-window bucket start
  count integer not null default 1,
  primary key (bucket, window_start)
);

alter table public.rate_limits enable row level security;
-- no policies on purpose: service-role only.

-- Atomic hit counter: returns the count AFTER this hit, for the caller
-- to compare against its limit. SECURITY DEFINER so the one function is
-- callable via RPC without granting table access; we still only call it
-- from the service-role client.
create or replace function public.rate_limit_hit(
  p_bucket text,
  p_window_seconds integer
)
returns integer
language plpgsql security definer
set search_path = public
as $$
declare
  w_start timestamptz :=
    to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  new_count integer;
begin
  insert into public.rate_limits (bucket, window_start, count)
  values (p_bucket, w_start, 1)
  on conflict (bucket, window_start)
  do update set count = rate_limits.count + 1
  returning count into new_count;

  -- Opportunistic cleanup: drop stale windows so the table stays tiny.
  -- ~1-in-50 calls; cheap enough to skip a scheduled job entirely.
  if random() < 0.02 then
    delete from public.rate_limits
    where window_start < now() - interval '2 days';
  end if;

  return new_count;
end;
$$;

-- Not granted to anon/authenticated: only the service role calls this.
revoke execute on function public.rate_limit_hit(text, integer) from public, anon, authenticated;
