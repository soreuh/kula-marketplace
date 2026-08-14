import type { SupabaseClient } from "@supabase/supabase-js";

/** Per-product rating aggregate, keyed by product id. */
export type RatingMap = Record<string, { avg: number; count: number }>;

/**
 * PRODUCT-level ratings for listing cards — THE one implementation.
 *
 * This exact query + aggregation loop used to be copy-pasted into five
 * server pages (home, explore, library, dashboard, profile); a drift bug
 * would have shown different ratings on different pages. Call this inside
 * the page's existing Promise.all so the fetch stays parallel:
 *
 *   const [{ data: products }, ratings] = await Promise.all([
 *     supabase.from("products")...,
 *     fetchProductRatings(supabase),
 *   ]);
 *
 * Scale note: this reads product_id+rating for EVERY review (as the five
 * copies always did). Fine for now; if the reviews table grows large, the
 * fix is a product_ratings VIEW mirroring instructor_ratings (017) — and
 * this function is the single place to swap it in.
 *
 * TEACHER-level ratings are a different concern: components/
 * instructor-rating.tsx reads the instructor_ratings view and must never
 * be re-derived from a page's product set (see its comment / migration 017).
 */
export async function fetchProductRatings(
  supabase: SupabaseClient
): Promise<RatingMap> {
  const { data } = await supabase.from("reviews").select("product_id, rating");
  const ratings: RatingMap = {};
  for (const r of (data as { product_id: string; rating: number }[] | null) ?? []) {
    const entry = (ratings[r.product_id] ??= { avg: 0, count: 0 });
    entry.avg += r.rating;
    entry.count += 1;
  }
  for (const id of Object.keys(ratings)) ratings[id].avg /= ratings[id].count;
  return ratings;
}
