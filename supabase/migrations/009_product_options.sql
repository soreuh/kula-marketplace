-- ============================================================
-- 009 — admin-curated listing options
-- Run AFTER 008, in: Supabase Dashboard → SQL Editor.
--
-- The seller-facing choice lists (yoga style, content type,
-- level) move from hardcoded arrays into this table so the admin
-- can add/remove them from the dashboard — no code change, no
-- redeploy. The code keeps the original arrays as a FALLBACK
-- (used only if this table is missing or empty).
--
-- NOT included on purpose:
--   • durations — the explore range slider's math depends on the
--     fixed 15…120 buckets.
--   • teachability — enforced by a DB check constraint and tied
--     to product copy (ready / adapt / inspiration).
--
-- Deleting an option only removes it from FUTURE listings —
-- existing products keep their stored label.
-- ============================================================

create table if not exists public.product_options (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('style', 'content_type', 'level')),
  label text not null,
  sort integer not null default 500, -- seeds are 10,20,… ; new ones append
  created_at timestamptz not null default now(),
  unique (kind, label)
);

alter table public.product_options enable row level security;

-- everyone reads (explore filters + the upload form need them, logged out too)
create policy "product_options_select" on public.product_options
  for select using (true);

-- only admins curate
create policy "product_options_insert" on public.product_options
  for insert with check (public.is_admin());

create policy "product_options_update" on public.product_options
  for update using (public.is_admin());

create policy "product_options_delete" on public.product_options
  for delete using (public.is_admin());

-- ---------- seed with the current hardcoded lists ----------
insert into public.product_options (kind, label, sort) values
  ('style', 'Vinyasa',     10),
  ('style', 'Ashtanga',    20),
  ('style', 'Yin',         30),
  ('style', 'Hatha',       40),
  ('style', 'Power',       50),
  ('style', 'Restorative', 60),
  ('style', 'Kundalini',   70),
  ('style', 'Prenatal',    80),
  ('style', 'Other',       90),
  ('content_type', 'Sequence',          10),
  ('content_type', 'Class Plan',        20),
  ('content_type', 'Workshop',          30),
  ('content_type', 'Meditation',        40),
  ('content_type', 'Training Material', 50),
  ('content_type', 'Other',             60),
  ('level', 'Beginner',     10),
  ('level', 'Intermediate', 20),
  ('level', 'Advanced',     30),
  ('level', 'All Levels',   40)
on conflict (kind, label) do nothing;
