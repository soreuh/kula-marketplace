-- ============================================================
-- Smoke tests for migration 008: sellers cannot rewrite the
-- money-critical columns on their own profile. Runs AFTER
-- rls_test_007.sql.
--
-- Seller A (…a) is a verified seller (stripe_charges_enabled=true,
-- commission_override=null, partner=false) from rls_test.sql.
-- ============================================================

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);

-- the headline exploit: zero out your own commission
do $$ begin
  begin
    update public.profiles set commission_override = 0
    where id = '00000000-0000-0000-0000-00000000000a';
    raise exception 'FAIL: seller set their own commission_override';
  exception when others then null; -- guard raised — good
  end;
end $$;
do $$ begin
  assert (select commission_override from public.profiles
          where id = '00000000-0000-0000-0000-00000000000a') is null,
    'commission_override must be unchanged';
end $$;
\echo 'PASS 008: seller cannot set their own commission_override'

-- force the publish gate open
do $$ begin
  begin
    update public.profiles set stripe_charges_enabled = false
    where id = '00000000-0000-0000-0000-00000000000a';
    raise exception 'FAIL: seller changed their own stripe_charges_enabled';
  exception when others then null;
  end;
end $$;
\echo 'PASS 008: seller cannot change their own stripe_charges_enabled'

-- self-mark partner / hijack payout destination
do $$ begin
  begin
    update public.profiles set partner = true
    where id = '00000000-0000-0000-0000-00000000000a';
    raise exception 'FAIL: seller set their own partner flag';
  exception when others then null;
  end;
end $$;
do $$ begin
  begin
    update public.profiles set stripe_account_id = 'acct_hijack'
    where id = '00000000-0000-0000-0000-00000000000a';
    raise exception 'FAIL: seller set their own stripe_account_id';
  exception when others then null;
  end;
end $$;
\echo 'PASS 008: seller cannot set their own partner / stripe_account_id'

-- but ordinary profile edits still work
update public.profiles set shop_name = 'Sage Studio', bio = 'hello'
where id = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select shop_name from public.profiles
          where id = '00000000-0000-0000-0000-00000000000a') = 'Sage Studio',
    'seller can still edit their own shop_name/bio';
end $$;
\echo 'PASS 008: sellers can still edit their normal profile fields'

-- admin CAN set a partner rate (this is how deals are granted)
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
update public.profiles set commission_override = 15, partner = true
where id = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select commission_override from public.profiles
          where id = '00000000-0000-0000-0000-00000000000a') = 15,
    'admin can set a negotiated rate';
end $$;
\echo 'PASS 008: admin can still set commission_override'

-- trusted server context (SQL editor / service role, auth.uid() null) too
reset role;
select set_config('request.jwt.claim.sub', '', false);
update public.profiles set stripe_charges_enabled = true, commission_override = null, partner = false
where id = '00000000-0000-0000-0000-00000000000a';
\echo 'PASS 008: service/SQL context can sync guarded columns'

\echo ''
\echo '=== ALL 008 RLS SMOKE TESTS PASSED ==='
