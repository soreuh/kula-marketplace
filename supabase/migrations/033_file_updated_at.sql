-- 033: buyer-visible content freshness (owner ask, 2026-08-18).
--
-- file_updated_at is stamped ONLY when a listing's sale file is replaced
-- with genuinely different content — the sha256-verified fork in the
-- dashboard save path, the same test that gates the buyer update email.
-- Metadata edits (title, price, description) never touch it; created_at
-- already covers "added". Null until a listing's first real re-upload —
-- the product page renders its "content updated" row only when set.

alter table public.products
  add column if not exists file_updated_at timestamptz;

-- PostgREST caches the schema; without this, writes to the new column are
-- silently rejected until the API restarts (lesson from 027 + 032).
notify pgrst, 'reload schema';
