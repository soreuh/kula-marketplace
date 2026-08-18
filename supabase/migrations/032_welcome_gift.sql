-- 032: seller welcome gift (G1) — an admin-designated $0 listing that is
-- auto-added to a seller's library the FIRST time their Stripe
-- charges_enabled flips true. null = feature off (ships dark).
-- Run BEFORE deploying the G1 code push.
alter table public.platform_settings
  add column if not exists welcome_gift_product_id uuid
    references public.products(id) on delete set null;
