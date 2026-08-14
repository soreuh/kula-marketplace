-- ============================================================
-- 010 — seller replies to reviews
-- Run AFTER 009, in: Supabase Dashboard → SQL Editor.
--
-- One public response per review, written by the SELLER of the
-- reviewed product. Column-guarded like the profile money fields:
--   • the seller may change ONLY reply/replied_at (never the
--     buyer's stars or words)
--   • the buyer may keep editing their own review but can NEVER
--     touch the reply
--   • paused/deleted sellers can't reply (account_is_active)
-- ============================================================

alter table public.reviews
  add column if not exists reply text,
  add column if not exists replied_at timestamptz;

comment on column public.reviews.reply is
  'The seller''s one public response to this review (migration 010).';

-- the product's (active) seller may now also UPDATE the row — the trigger
-- below constrains WHICH columns each party may change
drop policy if exists "reviews_update" on public.reviews;
create policy "reviews_update" on public.reviews
  for update using (
    buyer_id = auth.uid()
    or public.is_admin()
    or (
      public.account_is_active(auth.uid())
      and exists (
        select 1 from public.products p
        where p.id = product_id and p.seller_id = auth.uid()
      )
    )
  );

create or replace function public.enforce_review_guard()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  is_owner boolean;
  is_seller boolean;
begin
  -- trusted contexts (SQL editor / service role) and admins pass through
  if uid is null or public.is_admin() then
    return new;
  end if;

  if new.buyer_id is distinct from old.buyer_id
     or new.product_id is distinct from old.product_id then
    raise exception 'Review identity cannot change';
  end if;

  is_owner := (old.buyer_id = uid);
  is_seller := exists (
    select 1 from public.products p
    where p.id = old.product_id and p.seller_id = uid
  );

  if is_seller and not is_owner then
    -- sellers write the reply, nothing else
    if new.rating is distinct from old.rating
       or new.body is distinct from old.body
       or new.reviewer_name is distinct from old.reviewer_name then
      raise exception 'Sellers can only write a reply to a review';
    end if;
  elsif is_owner then
    -- buyers edit their review, never the seller's reply
    if new.reply is distinct from old.reply
       or new.replied_at is distinct from old.replied_at then
      raise exception 'Only the seller can write the reply';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists reviews_guard on public.reviews;
create trigger reviews_guard
  before update on public.reviews
  for each row execute function public.enforce_review_guard();
