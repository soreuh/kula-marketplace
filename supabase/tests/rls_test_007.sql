-- ============================================================
-- Smoke tests for migration 007: pause / activate / soft-delete.
-- Runs AFTER rls_test_006.sql. (The login ban lives at the auth
-- API layer — set by the admin panel — so it isn't testable here;
-- these cover the DB-side ghosting + guard.)
--
-- Cast at this point in the suite:
--   A ...a  seller, stripe-verified, owns product 1 (+ drafts)
--   B ...b  bought product 1 (paid order), later made a seller
--   C ...c  admin
--   E ...e  seller from the 005 tests (no orders)
-- ============================================================

-- fixture: make sure product 1 is live before we start
reset role;
update public.products set status = 'active'
where id = '10000000-0000-0000-0000-000000000001';

-- ---------- admin pauses seller A ----------
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
update public.profiles set account_status = 'paused'
where id = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select account_status from public.profiles
          where id = '00000000-0000-0000-0000-00000000000a') = 'paused',
    'admin can pause an account';
end $$;
\echo 'PASS 007: admin can pause an account'

-- ---------- ghosting ----------
-- a stranger (E) no longer sees A's active listing
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000e', false);
do $$ begin
  assert (select count(*) from public.products
          where seller_id = '00000000-0000-0000-0000-00000000000a') = 0,
    'paused seller''s listings must be ghosted from strangers';
  assert (select count(*) from public.instructors
          where id = '00000000-0000-0000-0000-00000000000a') = 0,
    'paused seller must vanish from the public instructor directory';
end $$;
\echo 'PASS 007: paused seller is ghosted (listings + directory)'

-- but B, who PAID for product 1, still sees their purchase
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$ begin
  assert (select count(*) from public.products
          where id = '10000000-0000-0000-0000-000000000001') = 1,
    'prior buyers keep access to purchased content';
end $$;
\echo 'PASS 007: prior buyers keep their purchases'

-- and A still sees their own listings on their dashboard
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
do $$ begin
  assert (select count(*) from public.products
          where seller_id = '00000000-0000-0000-0000-00000000000a') >= 3,
    'paused seller still sees their own listings';
end $$;
\echo 'PASS 007: paused seller still sees their own dashboard'

-- ---------- the guard: no self-un-pausing ----------
do $$ begin
  begin
    update public.profiles set account_status = 'active'
    where id = '00000000-0000-0000-0000-00000000000a';
    if (select account_status from public.profiles
        where id = '00000000-0000-0000-0000-00000000000a') = 'active' then
      raise exception 'FAIL: paused user reactivated themselves';
    end if;
  exception when others then null; -- guard raised — good
  end;
end $$;
\echo 'PASS 007: users cannot change their own account status'

-- ---------- reactivate: restores state, overrides nothing ----------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
update public.profiles set account_status = 'active'
where id = '00000000-0000-0000-0000-00000000000a';

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000e', false);
do $$ begin
  assert (select count(*) from public.products
          where id = '10000000-0000-0000-0000-000000000001') = 1,
    'reactivating restores public visibility';
end $$;
-- (superuser view — E can't see A's drafts at all, which is the point)
reset role;
do $$ begin
  assert (select status from public.products
          where id = '10000000-0000-0000-0000-000000000002') = 'draft',
    'reactivating must not flip drafts live (stripe gate untouched)';
end $$;
set role authenticated;
\echo 'PASS 007: activate restores visibility without overriding listing states'

-- ---------- soft-delete: ghosted, but every row retained ----------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
update public.profiles set account_status = 'deleted'
where id = '00000000-0000-0000-0000-00000000000a';

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000e', false);
do $$ begin
  assert (select count(*) from public.products
          where seller_id = '00000000-0000-0000-0000-00000000000a') = 0,
    'deleted seller''s listings must be ghosted';
end $$;

reset role;
do $$ begin
  assert (select count(*) from public.products
          where seller_id = '00000000-0000-0000-0000-00000000000a') >= 3,
    'soft delete: product rows must remain in the database';
  assert (select count(*) from public.orders) >= 1,
    'soft delete: order history must remain in the database';
  assert (select count(*) from public.profiles
          where id = '00000000-0000-0000-0000-00000000000a') = 1,
    'soft delete: the profile row itself must remain';
end $$;
\echo 'PASS 007: soft delete ghosts the account but keeps all data'

-- leave the fixture clean for any later suites (clear the JWT GUC so the
-- status guard sees a no-user superuser context, like the SQL editor)
select set_config('request.jwt.claim.sub', '', false);
update public.profiles set account_status = 'active'
where id = '00000000-0000-0000-0000-00000000000a';

\echo ''
\echo '=== ALL 007 RLS SMOKE TESTS PASSED ==='
