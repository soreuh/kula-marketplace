-- ============================================================
-- Smoke tests for migration 009: admin-curated listing options.
-- Runs AFTER rls_test_008.sql.
-- ============================================================

-- the seeds are publicly readable (explore filters + upload form, logged out)
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
  assert (select count(*) from public.product_options where kind = 'style') >= 5,
    'seeded styles must be publicly readable';
  assert (select count(*) from public.product_options where kind = 'content_type') >= 4,
    'seeded content types must be publicly readable';
  assert (select count(*) from public.product_options where kind = 'level') >= 3,
    'seeded levels must be publicly readable';
end $$;
\echo 'PASS 009: options are publicly readable (seeded)'

-- a seller cannot add options
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
do $$ begin
  begin
    insert into public.product_options (kind, label) values ('style', 'Hot Goat');
    raise exception 'FAIL: non-admin inserted a listing option';
  exception when insufficient_privilege then null;
  end;
end $$;
\echo 'PASS 009: non-admins cannot add options'

-- a seller cannot delete options (0 rows affected)
delete from public.product_options where kind = 'style';
do $$ begin
  assert (select count(*) from public.product_options where kind = 'style') >= 5,
    'non-admin delete must affect nothing';
end $$;
\echo 'PASS 009: non-admins cannot delete options'

-- the admin curates: add…
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
insert into public.product_options (kind, label) values ('style', 'Breathwork');
do $$ begin
  assert (select count(*) from public.product_options
          where kind = 'style' and label = 'Breathwork') = 1,
    'admin adds an option';
end $$;

-- …everyone sees it immediately…
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
do $$ begin
  assert (select count(*) from public.product_options
          where kind = 'style' and label = 'Breathwork') = 1,
    'sellers see newly added options';
end $$;

-- …and remove
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
delete from public.product_options where kind = 'style' and label = 'Breathwork';
do $$ begin
  assert (select count(*) from public.product_options
          where kind = 'style' and label = 'Breathwork') = 0,
    'admin removes an option';
end $$;
\echo 'PASS 009: admin can add and delete options'

reset role;
\echo ''
\echo '=== ALL 009 RLS SMOKE TESTS PASSED ==='
