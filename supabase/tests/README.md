# Database security tests

Smoke tests proving the RLS policies do what they claim (sellers can't touch
each other's listings, buyers can't write orders, nobody self-promotes to
admin, the storage bucket is private, etc.).

Run them against a throwaway local Postgres (NOT against Supabase — the stub
fakes Supabase's `auth`/`storage` schemas):

```bash
sudo -u postgres psql -c "drop database if exists kula_test" -c "create database kula_test"
sudo -u postgres psql -v ON_ERROR_STOP=1 -d kula_test \
  -f supabase/tests/stub_supabase.sql \
  -f supabase/migrations/001_init.sql \
  -f supabase/migrations/002_product_v2.sql \
  -f supabase/migrations/003_partner_rates.sql \
  -f supabase/migrations/004_partner_flag.sql \
  -f supabase/migrations/005_draft_until_stripe.sql \
  -f supabase/migrations/006_price_floor.sql \
  -f supabase/migrations/007_user_moderation.sql \
  -f supabase/migrations/008_profile_column_guard.sql \
  -f supabase/tests/rls_test.sql \
  -f supabase/tests/rls_test_002.sql \
  -f supabase/tests/rls_test_005.sql \
  -f supabase/tests/rls_test_006.sql \
  -f supabase/tests/rls_test_007.sql \
  -f supabase/tests/rls_test_008.sql
```

Expected output ends with: `=== ALL 008 RLS SMOKE TESTS PASSED ===`

Re-run after ANY change to the migration/policies. If you add a migration file
(002_...), add it to the command between 001 and the tests.
