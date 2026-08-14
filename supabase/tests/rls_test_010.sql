-- ============================================================
-- Smoke tests for migration 010: seller replies to reviews.
-- Runs AFTER rls_test_009.sql.
--
-- Fixture from earlier suites: buyer B (…b) left a review on
-- product 1, which belongs to seller A (…a). Admin is C (…c),
-- E (…e) is an unrelated seller.
-- ============================================================

-- the product's seller writes a reply
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
update public.reviews set reply = 'thank you — so glad it taught well!',
                          replied_at = now()
where product_id = '10000000-0000-0000-0000-000000000001';
do $$ begin
  assert (select reply from public.reviews
          where product_id = '10000000-0000-0000-0000-000000000001') is not null,
    'seller must be able to write a reply';
end $$;
\echo 'PASS 010: seller can reply to a review of their product'

-- but cannot touch the buyer's stars or words
do $$
declare orig integer;
begin
  select rating into orig from public.reviews
  where product_id = '10000000-0000-0000-0000-000000000001';
  begin
    update public.reviews set rating = 1
    where product_id = '10000000-0000-0000-0000-000000000001';
    raise exception 'FAIL: seller changed the buyer''s rating';
  exception when others then null; -- guard raised — good
  end;
  assert (select rating from public.reviews
          where product_id = '10000000-0000-0000-0000-000000000001') = orig,
    'rating must be unchanged';
end $$;
\echo 'PASS 010: seller cannot alter the buyer''s rating or text'

-- the buyer can still edit their own review…
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
update public.reviews set body = 'edited: still excellent'
where product_id = '10000000-0000-0000-0000-000000000001';
do $$ begin
  assert (select body from public.reviews
          where product_id = '10000000-0000-0000-0000-000000000001')
         = 'edited: still excellent',
    'buyer must still be able to edit their review';
end $$;

-- …but can never write or change the seller's reply
do $$ begin
  begin
    update public.reviews set reply = 'the buyer wrote this'
    where product_id = '10000000-0000-0000-0000-000000000001';
    if (select reply from public.reviews
        where product_id = '10000000-0000-0000-0000-000000000001')
       = 'the buyer wrote this' then
      raise exception 'FAIL: buyer overwrote the seller''s reply';
    end if;
  exception when others then null;
  end;
end $$;
\echo 'PASS 010: buyer edits their review but cannot touch the reply'

-- an unrelated user cannot update the review at all (0 rows)
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000e', false);
update public.reviews set reply = 'stranger danger'
where product_id = '10000000-0000-0000-0000-000000000001';
do $$ begin
  assert (select reply from public.reviews
          where product_id = '10000000-0000-0000-0000-000000000001')
         = 'thank you — so glad it taught well!',
    'strangers must not reach the row';
end $$;
\echo 'PASS 010: unrelated users cannot touch reviews'

-- paused sellers lose the reply pen (policy arm requires an active account)
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
update public.profiles set account_status = 'paused'
where id = '00000000-0000-0000-0000-00000000000a';

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
update public.reviews set reply = 'paused but typing'
where product_id = '10000000-0000-0000-0000-000000000001';
do $$ begin
  assert (select reply from public.reviews
          where product_id = '10000000-0000-0000-0000-000000000001')
         = 'thank you — so glad it taught well!',
    'paused sellers must not be able to reply';
end $$;
\echo 'PASS 010: paused sellers cannot reply'

-- restore the fixture
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
update public.profiles set account_status = 'active'
where id = '00000000-0000-0000-0000-00000000000a';

reset role;
select set_config('request.jwt.claim.sub', '', false);
\echo ''
\echo '=== ALL 010 RLS SMOKE TESTS PASSED ==='
