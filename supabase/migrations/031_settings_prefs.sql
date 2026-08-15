-- 031: settings consolidation (S2) — per-user email prefs + auth email mirror
-- RUN THIS BEFORE deploying the S2 code push (the code reads the new
-- columns; deploying first hits the PostgREST unknown-column error).
-- If saves still error after running: NOTIFY pgrst, 'reload schema';

-- Buyer opt-outs: review nudges (the most marketing-like mail the app
-- sends) and free-download confirmations. Paid receipts stay always-on by
-- design (proof of purchase) — platform kill-switch only.
alter table public.profiles
  add column if not exists review_nudge_emails boolean not null default true,
  add column if not exists free_claim_emails boolean not null default true;

-- Keep profiles.email (the address every notification email reads) in sync
-- when an auth email change is confirmed (the /settings change-email flow).
-- Without this, a changed login email would keep notification mail flowing
-- to the OLD address forever. Same security-definer pattern as
-- handle_new_user (001, recreated in 030).
create or replace function public.handle_email_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_email_changed on auth.users;
create trigger on_auth_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_email_change();
