-- ============================================================
-- Smoke tests for migration 006: the $1.00 price floor
-- (Terms & Conditions §4.6). Runs AFTER rls_test_005.sql.
-- ============================================================

-- seller A (stripe-verified, created in rls_test.sql) tries to underprice
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);

do $$ begin
  begin
    insert into public.products (seller_id, title, price_cents, status)
    values ('00000000-0000-0000-0000-00000000000a', 'Too Cheap', 99, 'draft');
    raise exception 'FAIL: listing under $1.00 was accepted';
  exception when check_violation then null; -- floor held — good
  end;
end $$;
\echo 'PASS 006: sub-$1.00 listings are rejected'

-- exactly $1.00 is fine
insert into public.products (id, seller_id, title, price_cents, status) values
  ('10000000-0000-0000-0000-000000000006',
   '00000000-0000-0000-0000-00000000000a', 'Dollar Flow', 100, 'draft');
\echo 'PASS 006: $1.00 exactly is accepted'

-- price edits can't dodge the floor either
do $$ begin
  begin
    update public.products set price_cents = 50
    where id = '10000000-0000-0000-0000-000000000006';
    raise exception 'FAIL: price update under $1.00 was accepted';
  exception when check_violation then null;
  end;
end $$;
\echo 'PASS 006: price edits below $1.00 are rejected'

reset role;
\echo ''
\echo '=== ALL 006 RLS SMOKE TESTS PASSED ==='
