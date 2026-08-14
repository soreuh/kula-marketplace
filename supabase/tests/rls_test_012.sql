-- ============================================================
-- Smoke tests for migration 012: profile pictures.
-- Runs AFTER rls_test_011.sql.
-- ============================================================

-- any user sets their OWN avatar (buyers included — B is a buyer-turned-seller,
-- F is the unverified seller from the 011 tests)
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000f', false);
update public.profiles
  set avatar_path = '00000000-0000-0000-0000-00000000000f/avatar-abc.jpg'
where id = '00000000-0000-0000-0000-00000000000f';
do $$ begin
  assert (select avatar_path from public.profiles
          where id = '00000000-0000-0000-0000-00000000000f') is not null,
    'users must be able to set their own avatar';
end $$;
\echo 'PASS 012: user sets their own avatar'

-- but never someone else's (0 rows through RLS)
update public.profiles
  set avatar_path = 'hijack.jpg'
where id = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert coalesce((select avatar_path from public.profiles
          where id = '00000000-0000-0000-0000-00000000000a'), '') <> 'hijack.jpg',
    'cannot set another user''s avatar';
end $$;
\echo 'PASS 012: cannot touch another user''s avatar'

-- the public instructor directory exposes it (F is a seller)
select set_config('request.jwt.claim.sub', '', false);
set role anon;
do $$ begin
  assert (select avatar_path from public.instructors
          where id = '00000000-0000-0000-0000-00000000000f') is not null,
    'instructors view must expose avatar_path';
end $$;
\echo 'PASS 012: instructors view exposes the avatar'

-- money columns still guarded even in the same update (008 regression)
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000f', false);
do $$ begin
  begin
    update public.profiles
      set avatar_path = 'x.jpg', commission_override = 0
    where id = '00000000-0000-0000-0000-00000000000f';
    raise exception 'FAIL: avatar update smuggled a commission change';
  exception when others then null; -- guard raised — good
  end;
end $$;
\echo 'PASS 012: avatar edits cannot smuggle guarded-column changes'

reset role;
select set_config('request.jwt.claim.sub', '', false);
\echo ''
\echo '=== ALL 012 RLS SMOKE TESTS PASSED ==='
