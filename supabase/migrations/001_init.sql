-- ============================================================
-- Kula Marketplace — initial schema
-- Run this whole file once in: Supabase Dashboard → SQL Editor
-- Safe to run on a brand-new project. Portable: run the same
-- file on a new project at handover.
-- ============================================================

-- ---------- Enums ----------
create type public.user_role as enum ('buyer', 'seller', 'admin');
create type public.product_status as enum ('draft', 'active', 'suspended');
create type public.order_status as enum ('pending', 'paid', 'refunded');

-- ---------- Tables ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  role public.user_role not null default 'buyer',
  stripe_account_id text,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  category text,
  price_cents integer not null check (price_cents >= 100),
  file_path text,
  status public.product_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles (id),
  product_id uuid not null references public.products (id),
  amount_cents integer not null,          -- total the buyer paid
  fee_cents integer not null,             -- platform's cut
  seller_amount_cents integer not null,   -- what the seller receives (before Stripe processing fees)
  currency text not null default 'usd',
  stripe_payment_intent text,
  stripe_checkout_session text unique,
  status public.order_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- Single-row settings table (id is always TRUE so a second row is impossible)
create table public.platform_settings (
  id boolean primary key default true check (id),
  fee_percent numeric(5, 2) not null default 25.00,
  fee_flat_cents integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (id) values (true);

create index products_seller_idx on public.products (seller_id);
create index products_status_idx on public.products (status);
create index orders_buyer_idx on public.orders (buyer_id);
create index orders_product_idx on public.orders (product_id);

-- ---------- Helper: is the current user an admin? ----------
-- SECURITY DEFINER so it can read profiles without tripping RLS recursion.
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- New-user trigger: create a profile row on signup ----------
-- Role comes from signup metadata but only 'buyer' or 'seller' are accepted
-- (admin is granted manually — see SETUP.md).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  requested text := coalesce(new.raw_user_meta_data ->> 'role', 'buyer');
begin
  if requested not in ('buyer', 'seller') then
    requested := 'buyer';
  end if;

  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    requested::public.user_role
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Guard: users cannot promote themselves ----------
-- auth.uid() IS NULL means the change comes from the SQL editor or the
-- service-role key (trusted server contexts) — those are allowed through.
create or replace function public.enforce_role_guard()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  return new;
end;
$$;

create trigger profiles_role_guard
  before update on public.profiles
  for each row execute function public.enforce_role_guard();

-- ---------- Guard: sellers cannot un-suspend their own listing ----------
create or replace function public.enforce_product_guard()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if old.status = 'suspended'
     and new.status is distinct from old.status
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only admins can reinstate a suspended listing';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger products_guard
  before update on public.products
  for each row execute function public.enforce_product_guard();

-- ---------- Row-Level Security ----------
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.platform_settings enable row level security;

-- profiles: you see/edit yourself; admin sees/edits everyone.
-- No INSERT policy on purpose — rows are created by the signup trigger only.
create policy "profiles_select" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id or public.is_admin());

-- products: active listings are public; sellers see all their own; admin sees all.
create policy "products_select" on public.products
  for select using (
    status = 'active' or seller_id = auth.uid() or public.is_admin()
  );

create policy "products_insert" on public.products
  for insert with check (
    seller_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('seller', 'admin')
    )
  );

create policy "products_update" on public.products
  for update using (seller_id = auth.uid() or public.is_admin());

create policy "products_delete" on public.products
  for delete using (seller_id = auth.uid() or public.is_admin());

-- orders: buyer sees their purchases, seller sees sales of their products,
-- admin sees all. No INSERT/UPDATE policies — only the server (service role,
-- via the Stripe webhook) writes orders. Never trust the client with money.
create policy "orders_select" on public.orders
  for select using (
    buyer_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.products pr
      where pr.id = product_id and pr.seller_id = auth.uid()
    )
  );

-- platform_settings: anyone can read the fee (needed to show buyer prices);
-- only admin can change it.
create policy "settings_select" on public.platform_settings
  for select using (true);

create policy "settings_update" on public.platform_settings
  for update using (public.is_admin());

-- ---------- Storage: private bucket for product files ----------
insert into storage.buckets (id, name, public)
values ('product-files', 'product-files', false)
on conflict (id) do nothing;

-- Sellers manage files only inside their own folder: {seller_uuid}/filename.
-- Buyers never touch the bucket directly — downloads go through the server,
-- which checks for a paid order and issues a short-lived signed URL.
create policy "storage_seller_insert" on storage.objects
  for insert with check (
    bucket_id = 'product-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_seller_select" on storage.objects
  for select using (
    bucket_id = 'product-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_seller_update" on storage.objects
  for update using (
    bucket_id = 'product-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_seller_delete" on storage.objects
  for delete using (
    bucket_id = 'product-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
