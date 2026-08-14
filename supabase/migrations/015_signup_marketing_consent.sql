-- ============================================================
-- 015 — account signup IS the marketing opt-in (owner decision)
-- Run AFTER 014, in: Supabase Dashboard → SQL Editor.
--
-- WHY: per Aleks (Aug 2026), every new account joins the Mailchimp
-- audience at signup. The post-login consent modal was removed and
-- its question folded into the signup consent line, which now reads
-- "...and to receive occasional updates from kula (unsubscribe any
-- time)". So consent is disclosed at signup rather than asked again
-- later, and `profiles.marketing_consent` is stamped true there.
--
-- Trade-off recorded deliberately: this is a BUNDLED consent (one
-- checkbox covering terms + marketing). That is permissible under
-- US CAN-SPAM given a working unsubscribe and a physical address in
-- every campaign — both of which Mailchimp supplies — but it is NOT
-- valid consent under GDPR/CASL, so EU/Canada recipients are out of
-- scope for marketing until this is split into two checkboxes.
-- Privacy §3 was reworded to match (see the page header comment).
--
-- NOTE: unsubscribes happen in Mailchimp and are NOT mirrored back
-- into this column — Mailchimp is the source of truth for "may we
-- email them"; this column records what they agreed to at signup.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  requested text := coalesce(new.raw_user_meta_data ->> 'role', 'buyer');
  accepted  boolean := coalesce(
    (new.raw_user_meta_data ->> 'terms_accepted')::boolean, false);
begin
  if requested not in ('buyer', 'seller') then
    requested := 'buyer';
  end if;

  insert into public.profiles (
    id, email, display_name, role,
    terms_accepted_at, terms_version, marketing_consent
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    requested::public.user_role,
    -- server clock, and only when consent was actually signalled
    case when accepted then now() end,
    case when accepted then new.raw_user_meta_data ->> 'terms_version' end,
    -- the signup consent line covers marketing; ticking it is required
    case when accepted then true end
  );
  return new;
end;
$$;
