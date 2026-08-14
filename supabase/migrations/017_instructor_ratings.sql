-- ============================================================
-- 017 — instructor rating that survives unpublish/archive
-- Run AFTER 016, as a SEPARATE query (see the note in 016).
--
-- THE BUG THIS FIXES (present since the profile page was written, not
-- introduced by archiving): app/profile/[id]/page.tsx computed a
-- teacher's overall rating by summing only the reviews belonging to
-- listings it had fetched with `.eq("status", "active")`. So the moment
-- a seller unpublished a listing, every review it had earned silently
-- dropped out of their profile rating — reputation deleted by a button
-- that says "unpublish". Archiving would have made it worse.
--
-- A review is earned by a real buyer on a real purchase. It belongs to
-- the TEACHER, not to the listing's current publish state. This view
-- aggregates across ALL of a seller's listings regardless of status, so
-- draft, unpublished and archived content keeps contributing.
--
-- The one exclusion is 'suspended' — that is an admin moderation action
-- against the content itself, so its reviews should not prop up a rating.
-- If you'd rather count those too, drop the where clause; it's the only
-- judgement call in this file.
--
-- Like `instructors` and `featured_products`, this is a plain view, so
-- it runs with the owner's rights and is readable without exposing the
-- underlying rows. It publishes ONLY the aggregate — never sales counts,
-- never per-order data.
-- ============================================================

create or replace view public.instructor_ratings as
  select
    p.seller_id                as instructor_id,
    round(avg(r.rating)::numeric, 2) as avg_rating,
    count(*)::int              as review_count
  from public.reviews r
  join public.products p on p.id = r.product_id
  where p.status <> 'suspended'
  group by p.seller_id;

grant select on public.instructor_ratings to anon, authenticated;

comment on view public.instructor_ratings is
  'Per-teacher aggregate rating across ALL their listings regardless of publish status (suspended excluded). Unpublishing or archiving must never reduce earned reputation — see 016/017.';
