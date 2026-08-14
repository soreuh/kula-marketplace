-- ============================================================
-- RLS smoke tests for migration 005: listings stay drafts
-- until the seller's Stripe account is verified.
-- Runs AFTER rls_test_002.sql.
-- ============================================================

-- fixture: a fresh seller with NO Stripe verification
reset role;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000e', 'nostripe@test.com', '{"role":"seller"}');

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000e', false);

-- drafts are always allowed — sellers can prep before onboarding
insert into public.products (id, seller_id, title, price_cents, status) values
  ('10000000-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-00000000000e', 'Prepped While Waiting', 1200, 'draft');
\echo 'PASS 005: unverified seller can save drafts'

-- going live at insert time is blocked
do $$ begin
  begin
    insert into public.products (seller_id, title, price_cents, status)
    values ('00000000-0000-0000-0000-00000000000e', 'Too Eager', 1500, 'active');
    raise exception 'FAIL: unverified seller published at insert';
  exception when others then null; -- trigger raised — good
  end;
end $$;
\echo 'PASS 005: unverified seller cannot insert active listings'

-- flipping a draft live is blocked too
do $$ begin
  begin
    update public.products set status = 'active'
    where id = '10000000-0000-0000-0000-000000000005';
    if (select status from public.products
        where id = '10000000-0000-0000-0000-000000000005') = 'active' then
      raise exception 'FAIL: unverified seller flipped a draft live';
    end if;
  exception when others then null;
  end;
end $$;
\echo 'PASS 005: unverified seller cannot publish a draft'

-- Stripe completes (dashboard sync sets the flag) → publishing works.
-- Clear the JWT claim so this runs as the real service/SQL context
-- (auth.uid() null) that the dashboard sync uses — migration 008 guards
-- stripe_charges_enabled against user-session writes.
reset role;
select set_config('request.jwt.claim.sub', '', false);
update public.profiles set stripe_charges_enabled = true
where id = '00000000-0000-0000-0000-00000000000e';

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000e', false);
update public.products set status = 'active'
where id = '10000000-0000-0000-0000-000000000005';
do $$ begin
  assert (select status from public.products
          where id = '10000000-0000-0000-0000-000000000005') = 'active',
    'verified seller publishes their draft';
end $$;
\echo 'PASS 005: verified seller publishes the same draft'

reset role;
\echo ''
\echo '=== ALL 005 RLS SMOKE TESTS PASSED ==='
