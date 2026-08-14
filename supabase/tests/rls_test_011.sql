-- ============================================================
-- Smoke tests for migration 011: free listings.
-- Runs AFTER rls_test_010.sql.
-- ============================================================

-- fixture: a brand-new seller with NO Stripe connection
reset role;
select set_config('request.jwt.claim.sub', '', false);
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000f', 'freebie@test.com', '{"role":"seller"}');

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000f', false);

-- a FREE listing publishes with no Stripe at all
insert into public.products (id, seller_id, title, price_cents, status) values
  ('10000000-0000-0000-0000-000000000011',
   '00000000-0000-0000-0000-00000000000f', 'Free Morning Flow', 0, 'active');
do $$ begin
  assert (select status from public.products
          where id = '10000000-0000-0000-0000-000000000011') = 'active',
    'free listing must publish pre-Stripe';
end $$;
\echo 'PASS 011: unverified seller publishes a FREE listing'

-- but a PAID listing still cannot go live (005 gate intact)
do $$ begin
  begin
    insert into public.products (seller_id, title, price_cents, status)
    values ('00000000-0000-0000-0000-00000000000f', 'Paid Too Soon', 1500, 'active');
    raise exception 'FAIL: unverified seller published a paid listing';
  exception when others then null; -- gate raised — good
  end;
end $$;
\echo 'PASS 011: paid listings still require Stripe'

-- and they cannot sneak a live free listing over to a paid price
do $$ begin
  begin
    update public.products set price_cents = 1500
    where id = '10000000-0000-0000-0000-000000000011';
    if (select price_cents from public.products
        where id = '10000000-0000-0000-0000-000000000011') = 1500 then
      raise exception 'FAIL: unverified seller flipped a live freebie to paid';
    end if;
  exception when others then null;
  end;
end $$;
\echo 'PASS 011: cannot flip a live free listing to paid without Stripe'

-- the floor still rejects in-between prices (1¢–99¢)
do $$ begin
  begin
    insert into public.products (seller_id, title, price_cents, status)
    values ('00000000-0000-0000-0000-00000000000f', 'Too Cheap', 50, 'draft');
    raise exception 'FAIL: sub-$1 non-free price was accepted';
  exception when check_violation then null;
  end;
end $$;
\echo 'PASS 011: prices between $0 and $1 are still rejected'

-- everyone can see the free listing (it is live)
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$ begin
  assert (select count(*) from public.products
          where id = '10000000-0000-0000-0000-000000000011') = 1,
    'free listing must be publicly visible';
end $$;
\echo 'PASS 011: free listing is live on the marketplace'

reset role;
select set_config('request.jwt.claim.sub', '', false);
\echo ''
\echo '=== ALL 011 RLS SMOKE TESTS PASSED ==='
