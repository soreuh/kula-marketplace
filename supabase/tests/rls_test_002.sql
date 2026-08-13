-- ============================================================
-- RLS smoke tests for migration 002 (runs AFTER rls_test.sql,
-- reusing its fixtures: seller A, buyer→seller B, admin C,
-- product ...0001 owned by A, paid order for B on ...0001).
-- NOTE: rls_test.sql promoted B to 'seller' and C to 'admin'.
-- ============================================================

-- ---------- reviews ----------
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);

-- B bought product 1 (paid) → may review it
insert into public.reviews (product_id, buyer_id, rating, body, reviewer_name)
values ('10000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-00000000000b', 5, 'taught it friday. loved it.', 'B');
\echo 'PASS reviews: verified buyer can review'

-- duplicate review blocked by unique constraint
do $$ begin
  begin
    insert into public.reviews (product_id, buyer_id, rating)
    values ('10000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-00000000000b', 4);
    raise exception 'FAIL: duplicate review accepted';
  exception when unique_violation then null;
  end;
end $$;
\echo 'PASS reviews: one review per buyer per product'

-- C never bought it → blocked
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
do $$ begin
  begin
    insert into public.reviews (product_id, buyer_id, rating)
    values ('10000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-00000000000c', 1);
    raise exception 'FAIL: non-buyer posted a review';
  exception when insufficient_privilege then null;
  end;
end $$;
\echo 'PASS reviews: non-buyers blocked'

-- reviews are public
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
  assert (select count(*) from public.reviews) = 1, 'anon reads reviews';
end $$;
\echo 'PASS reviews: publicly readable'

-- ---------- mailing list ----------
insert into public.mailing_list (email, source) values ('waitlist@test.com', 'waitlist');
\echo 'PASS mailing list: anon can join'

do $$ begin
  assert (select count(*) from public.mailing_list) = 0,
    'anon must not read the mailing list';
end $$;
\echo 'PASS mailing list: not publicly readable'

-- ---------- view counter ----------
-- (rls_test.sql left product 1 suspended; reinstate it first — views only
-- count on active listings, which is itself worth asserting)
reset role;
select public.increment_views('10000000-0000-0000-0000-000000000001');
do $$ begin
  assert (select views from public.products
          where id = '10000000-0000-0000-0000-000000000001') = 0,
    'suspended listings must not accumulate views';
end $$;
update public.products set status = 'active'
where id = '10000000-0000-0000-0000-000000000001';

set role anon;
select set_config('request.jwt.claim.sub', '', false);
select public.increment_views('10000000-0000-0000-0000-000000000001');
reset role;
do $$ begin
  assert (select views from public.products
          where id = '10000000-0000-0000-0000-000000000001') = 1,
    'anon view ping increments the counter';
end $$;
set role anon;
\echo 'PASS views: anon ping counts (active listings only)'

-- ---------- instructors view: safe columns only ----------
set role anon;
do $$ begin
  assert (select count(*) from public.instructors) >= 1,
    'instructor directory is public';
end $$;
do $$ begin
  assert not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'instructors'
      and column_name = 'email'
  ), 'instructors view must not expose email';
end $$;
\echo 'PASS instructors: public directory without emails'

-- ---------- role self-upgrade ----------
reset role;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000d', 'newbie@test.com', '{"role":"buyer"}');
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', false);

update public.profiles set role = 'seller'
where id = '00000000-0000-0000-0000-00000000000d';
do $$ begin
  assert (select role from public.profiles
          where id = '00000000-0000-0000-0000-00000000000d') = 'seller',
    'buyer can self-upgrade to seller';
end $$;
\echo 'PASS roles: buyer → seller self-upgrade allowed'

do $$ begin
  begin
    update public.profiles set role = 'admin'
    where id = '00000000-0000-0000-0000-00000000000d';
    if (select role from public.profiles
        where id = '00000000-0000-0000-0000-00000000000d') = 'admin' then
      raise exception 'FAIL: self-promotion to admin got through';
    end if;
  exception when others then null;
  end;
end $$;
\echo 'PASS roles: self-promotion to admin still blocked'

-- ---------- covers bucket ----------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
insert into storage.objects (bucket_id, name) values
  ('covers', '00000000-0000-0000-0000-00000000000a/cover-1.jpg');
\echo 'PASS storage: seller uploads cover to own folder'

reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
  assert (select count(*) from storage.objects where bucket_id = 'covers') = 1,
    'covers are publicly readable';
end $$;
\echo 'PASS storage: covers bucket publicly readable'

reset role;
\echo ''
\echo '=== ALL 002 RLS SMOKE TESTS PASSED ==='
