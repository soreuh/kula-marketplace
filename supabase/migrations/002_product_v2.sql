-- ============================================================
-- Kula Marketplace — v2: her product spec
-- Run AFTER 001_init.sql, in: Supabase Dashboard → SQL Editor.
-- Adds: product metadata, cover/preview images, view counts,
-- reviews, mailing list, instructor profile fields, buyer→seller
-- self-upgrade, commission fee defaults (30% + 25¢), bucket limits.
-- ============================================================

-- ---------- Products: full metadata ----------
alter table public.products
  add column if not exists content_type text,
  add column if not exists level text,
  add column if not exists duration_minutes integer,
  add column if not exists teachability text
    check (teachability in ('ready', 'adapt', 'inspiration')),
  add column if not exists theme text,
  add column if not exists props text,
  add column if not exists anatomy_focus text,
  add column if not exists usage_notes text,
  add column if not exists peak_pose text,
  add column if not exists sequence_breakdown text,
  add column if not exists target_audience text,
  add column if not exists cover_path text,
  add column if not exists preview_path text,
  add column if not exists views integer not null default 0;

-- ---------- Profiles: instructor storefront + preferences ----------
alter table public.profiles
  add column if not exists shop_name text,
  add column if not exists bio text,
  add column if not exists specialisations text[] not null default '{}',
  add column if not exists sale_notifications boolean not null default true,
  add column if not exists marketing_consent boolean,          -- null = not asked yet
  add column if not exists ip_agreement_accepted_at timestamptz,
  add column if not exists stripe_charges_enabled boolean not null default false;

-- ---------- Reviews (verified buyers only) ----------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  body text,
  reviewer_name text, -- denormalized so reviews render without exposing profiles
  created_at timestamptz not null default now(),
  unique (product_id, buyer_id)
);

alter table public.reviews enable row level security;

create policy "reviews_select" on public.reviews
  for select using (true);

-- Only someone with a PAID order for the product may review it.
create policy "reviews_insert" on public.reviews
  for insert with check (
    buyer_id = auth.uid()
    and exists (
      select 1 from public.orders o
      where o.buyer_id = auth.uid()
        and o.product_id = reviews.product_id
        and o.status = 'paid'
    )
  );

create policy "reviews_update" on public.reviews
  for update using (buyer_id = auth.uid() or public.is_admin());

create policy "reviews_delete" on public.reviews
  for delete using (buyer_id = auth.uid() or public.is_admin());

-- ---------- Mailing list (waitlist + marketing consent) ----------
create table if not exists public.mailing_list (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'waitlist',
  created_at timestamptz not null default now()
);

alter table public.mailing_list enable row level security;

-- Anyone may join; only admin may read/export the list.
create policy "mailing_insert" on public.mailing_list
  for insert with check (true);

create policy "mailing_select" on public.mailing_list
  for select using (public.is_admin());

-- ---------- View counter (anon-safe, security definer) ----------
create or replace function public.increment_views(p_product_id uuid)
returns void
language sql security definer
set search_path = public
as $$
  update public.products
  set views = views + 1
  where id = p_product_id and status = 'active';
$$;

grant execute on function public.increment_views(uuid) to anon, authenticated;

-- ---------- Public instructor directory ----------
-- Buyers need seller names/bios on listing + profile pages, but profiles
-- rows are private (email etc). This view exposes ONLY safe columns.
create or replace view public.instructors as
  select id, display_name, shop_name, bio, specialisations,
         stripe_charges_enabled, created_at
  from public.profiles
  where role in ('seller', 'admin');

grant select on public.instructors to anon, authenticated;

-- ---------- Roles overlap: buyers may upgrade themselves to seller ----------
-- (admin transitions remain admin-only; SQL editor / service role unrestricted)
create or replace function public.enforce_role_guard()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    if not (
      auth.uid() = new.id
      and old.role in ('buyer', 'seller')
      and new.role in ('buyer', 'seller')
    ) then
      raise exception 'Only admins can change roles';
    end if;
  end if;
  return new;
end;
$$;

-- ---------- Commission fee model: 30% + $0.25 out of the listing price ----------
update public.platform_settings
set fee_percent = 30.00, fee_flat_cents = 25, updated_at = now()
where id = true;

-- ---------- Storage: public covers bucket + product-files limits ----------
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

update storage.buckets
set file_size_limit = 5242880, -- 5MB images
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'covers';

update storage.buckets
set file_size_limit = 52428800, -- 50MB
    allowed_mime_types = array[
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]
where id = 'product-files';

create policy "storage_covers_insert" on storage.objects
  for insert with check (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_covers_select" on storage.objects
  for select using (bucket_id = 'covers');

create policy "storage_covers_update" on storage.objects
  for update using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_covers_delete" on storage.objects
  for delete using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
