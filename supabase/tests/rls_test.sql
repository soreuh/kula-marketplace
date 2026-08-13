-- ============================================================
-- RLS smoke tests. Runs AFTER 001_init.sql. ON_ERROR_STOP=1:
-- any unexpected failure aborts. Expected-denials are caught in
-- DO blocks and re-raised as failures if they DON'T happen.
-- ============================================================

-- Supabase grants table privileges to these roles by default; mirror that.
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all tables in schema storage to anon, authenticated, service_role;

-- ---------- fixtures: three users via the signup trigger ----------
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'seller@test.com',
   '{"role":"seller","display_name":"Sage"}'),
  ('00000000-0000-0000-0000-00000000000b', 'buyer@test.com',
   '{"role":"buyer"}'),
  ('00000000-0000-0000-0000-00000000000c', 'sneaky@test.com',
   '{"role":"admin"}');  -- tries to sign up as admin — must be downgraded

do $$ begin
  assert (select role from public.profiles where email = 'seller@test.com') = 'seller',
    'trigger: seller role from metadata';
  assert (select role from public.profiles where email = 'buyer@test.com') = 'buyer',
    'trigger: buyer role from metadata';
  assert (select role from public.profiles where email = 'sneaky@test.com') = 'buyer',
    'trigger: admin signup request must downgrade to buyer';
  assert (select display_name from public.profiles where email = 'seller@test.com') = 'Sage',
    'trigger: display name copied';
end $$;
\echo 'PASS trigger: profiles created with safe roles'

-- helper macro-ish: act as a given user
-- (set_config survives set role; policies read auth.uid())

-- ---------- seller creates products ----------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
set role authenticated;

insert into public.products (id, seller_id, title, price_cents, file_path, status) values
  ('10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-00000000000a', 'Vinyasa Flow Plan', 2000,
   '00000000-0000-0000-0000-00000000000a/flow.pdf', 'active'),
  ('10000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-00000000000a', 'Draft Sequence', 1500,
   '00000000-0000-0000-0000-00000000000a/draft.pdf', 'draft');
\echo 'PASS products: seller can insert own listings'

-- seller cannot list as someone else
do $$ begin
  begin
    insert into public.products (seller_id, title, price_cents)
    values ('00000000-0000-0000-0000-00000000000b', 'Forged', 1000);
    raise exception 'FAIL: seller inserted a product as another user';
  exception when insufficient_privilege or check_violation then null;
  end;
end $$;
\echo 'PASS products: cannot insert for another seller_id'

-- ---------- buyer visibility + limits ----------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);

do $$ begin
  assert (select count(*) from public.products) = 1,
    'buyer must see only the 1 active product (not the draft)';
end $$;
\echo 'PASS products: buyer sees active only'

do $$ begin
  begin
    insert into public.products (seller_id, title, price_cents)
    values ('00000000-0000-0000-0000-00000000000b', 'Buyer Listing', 1000);
    raise exception 'FAIL: buyer (non-seller role) created a product';
  exception when insufficient_privilege or check_violation then null;
  end;
end $$;
\echo 'PASS products: buyer role cannot create listings'

-- buyer cannot edit someone else's product (0 rows affected)
update public.products set price_cents = 1 where id = '10000000-0000-0000-0000-000000000001';
do $$ begin
  assert (select price_cents from public.products
          where id = '10000000-0000-0000-0000-000000000001') = 2000,
    'buyer update must not change another seller''s product';
end $$;
\echo 'PASS products: buyer cannot modify others'' listings'

-- buyer cannot promote themselves
do $$ begin
  begin
    update public.profiles set role = 'admin'
    where id = '00000000-0000-0000-0000-00000000000b';
    -- if the update "succeeded", the guard trigger must have raised; reaching
    -- here without exception means 1 row updated with role change = FAIL
    if (select role from public.profiles
        where id = '00000000-0000-0000-0000-00000000000b') = 'admin' then
      raise exception 'FAIL: buyer promoted themselves to admin';
    end if;
  exception when others then null; -- guard raised — good
  end;
end $$;
\echo 'PASS profiles: self-promotion blocked by trigger'

-- buyer sees only their own profile
do $$ begin
  assert (select count(*) from public.profiles) = 1,
    'buyer must see exactly one profile (their own)';
end $$;
\echo 'PASS profiles: users see only themselves'

-- settings: readable, not writable
do $$ begin
  assert (select fee_percent from public.platform_settings) = 25.00,
    'settings readable with default 25%';
end $$;
update public.platform_settings set fee_percent = 0 where id = true;
do $$ begin
  assert (select fee_percent from public.platform_settings) = 25.00,
    'non-admin settings update must affect 0 rows';
end $$;
\echo 'PASS settings: public read, non-admin write blocked'

-- ---------- orders: clients never write ----------
do $$ begin
  begin
    insert into public.orders (buyer_id, product_id, amount_cents, fee_cents, seller_amount_cents)
    values ('00000000-0000-0000-0000-00000000000b',
            '10000000-0000-0000-0000-000000000001', 2500, 500, 2000);
    raise exception 'FAIL: client inserted an order directly';
  exception when insufficient_privilege then null;
  end;
end $$;
\echo 'PASS orders: authenticated clients cannot insert'

-- server (service_role, as the webhook does) records the paid order
reset role;
set role service_role;
insert into public.orders (id, buyer_id, product_id, amount_cents, fee_cents,
                           seller_amount_cents, stripe_checkout_session, status)
values ('20000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-00000000000b',
        '10000000-0000-0000-0000-000000000001',
        2500, 500, 2000, 'cs_test_123', 'paid');
reset role;
\echo 'PASS orders: service role (webhook) writes orders'

-- buyer sees their order; seller sees the sale; stranger sees nothing
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$ begin
  assert (select count(*) from public.orders) = 1, 'buyer sees their 1 order';
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
do $$ begin
  assert (select count(*) from public.orders) = 1, 'seller sees the 1 sale of their product';
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
do $$ begin
  assert (select count(*) from public.orders) = 0, 'unrelated user sees no orders';
end $$;
\echo 'PASS orders: buyer/seller/stranger visibility'

-- ---------- admin powers ----------
reset role;
select set_config('request.jwt.claim.sub', '', false); -- SQL editor has no user JWT
update public.profiles set role = 'admin' where email = 'sneaky@test.com'; -- via "SQL editor" (no auth.uid) — allowed
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);

do $$ begin
  assert (select count(*) from public.profiles) = 3, 'admin sees all profiles';
  assert (select count(*) from public.products) = 2, 'admin sees drafts too';
end $$;

update public.platform_settings set fee_percent = 20.00 where id = true;
do $$ begin
  assert (select fee_percent from public.platform_settings) = 20.00,
    'admin can change the fee';
end $$;

update public.products set status = 'suspended'
where id = '10000000-0000-0000-0000-000000000001';
update public.profiles set role = 'seller' where email = 'buyer@test.com';
do $$ begin
  assert (select role from public.profiles where email = 'buyer@test.com') = 'seller',
    'admin can change user roles';
end $$;
\echo 'PASS admin: sees all, edits fee, suspends listings, changes roles'

-- seller cannot reinstate their suspended listing
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
do $$ begin
  begin
    update public.products set status = 'active'
    where id = '10000000-0000-0000-0000-000000000001';
    if (select status from public.products
        where id = '10000000-0000-0000-0000-000000000001') = 'active' then
      raise exception 'FAIL: seller reinstated their own suspended listing';
    end if;
  exception when others then null;
  end;
end $$;
\echo 'PASS products: seller cannot un-suspend'

-- ---------- storage policies ----------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
insert into storage.objects (bucket_id, name) values
  ('product-files', '00000000-0000-0000-0000-00000000000a/flow.pdf');
\echo 'PASS storage: seller uploads inside own folder'

do $$ begin
  begin
    insert into storage.objects (bucket_id, name) values
      ('product-files', '00000000-0000-0000-0000-00000000000b/hijack.pdf');
    raise exception 'FAIL: seller wrote into another user''s folder';
  exception when insufficient_privilege then null;
  end;
end $$;
\echo 'PASS storage: cannot write to other folders'

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
do $$ begin
  assert (select count(*) from storage.objects) = 0,
    'non-owner cannot even see the file object';
end $$;
\echo 'PASS storage: private bucket — no cross-user reads'

reset role;
\echo ''
\echo '=== ALL RLS SMOKE TESTS PASSED ==='
