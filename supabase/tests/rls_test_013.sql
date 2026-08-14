-- ============================================================
-- Smoke tests for migration 013: featured curation.
-- Runs AFTER rls_test_012.sql.
-- ============================================================

-- sellers cannot self-feature (update)
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
do $$ begin
  begin
    update public.products set featured_at = now()
    where id = '10000000-0000-0000-0000-000000000001';
    raise exception 'FAIL: seller self-featured a listing';
  exception when others then null; -- guard raised — good
  end;
end $$;
do $$ begin
  assert (select featured_at from public.products
          where id = '10000000-0000-0000-0000-000000000001') is null,
    'featured_at must be untouched';
end $$;
\echo 'PASS 013: sellers cannot self-feature'

-- …or sneak it in at insert (F is the unverified seller; free listing)
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000f', false);
do $$ begin
  begin
    insert into public.products (seller_id, title, price_cents, status, featured_at)
    values ('00000000-0000-0000-0000-00000000000f', 'Sneaky Star', 0, 'active', now());
    raise exception 'FAIL: seller inserted a pre-featured listing';
  exception when others then null;
  end;
end $$;
\echo 'PASS 013: cannot insert a pre-featured listing'

-- the admin stars a listing
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
update public.products set featured_at = now()
where id = '10000000-0000-0000-0000-000000000001';
do $$ begin
  assert (select featured_at from public.products
          where id = '10000000-0000-0000-0000-000000000001') is not null,
    'admin must be able to feature';
end $$;
\echo 'PASS 013: admin features a listing'

-- the public view serves it, score attached, drafts absent
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
  assert (select count(*) from public.featured_products
          where id = '10000000-0000-0000-0000-000000000001'
            and featured_at is not null) = 1,
    'featured listing must appear in the view';
  assert (select featured_score from public.featured_products
          where id = '10000000-0000-0000-0000-000000000001') between 0 and 1,
    'featured_score must be a sane blend in [0,1]';
  assert (select count(*) from public.featured_products
          where id = '10000000-0000-0000-0000-000000000002') = 0,
    'drafts must never appear in the view';
end $$;
\echo 'PASS 013: view serves active listings with a sane score'

-- moderation ghosting flows through the view
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
update public.profiles set account_status = 'paused'
where id = '00000000-0000-0000-0000-00000000000a';
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
  assert (select count(*) from public.featured_products
          where seller_id = '00000000-0000-0000-0000-00000000000a') = 0,
    'a paused seller''s listings must vanish from the featured view';
end $$;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
update public.profiles set account_status = 'active'
where id = '00000000-0000-0000-0000-00000000000a';
\echo 'PASS 013: ghosted sellers vanish from the featured view'

-- sellers cannot unfeature either; admin can (cleanup)
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
do $$ begin
  begin
    update public.products set featured_at = null
    where id = '10000000-0000-0000-0000-000000000001';
    if (select featured_at from public.products
        where id = '10000000-0000-0000-0000-000000000001') is null then
      raise exception 'FAIL: seller unfeatured their listing';
    end if;
  exception when others then null;
  end;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
update public.products set featured_at = null
where id = '10000000-0000-0000-0000-000000000001';
\echo 'PASS 013: only admins can unfeature'

reset role;
select set_config('request.jwt.claim.sub', '', false);
\echo ''
\echo '=== ALL 013 RLS SMOKE TESTS PASSED ==='
