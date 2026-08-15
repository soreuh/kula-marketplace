import { createClient } from "@/lib/supabase/server";
import { fetchProductRatings } from "@/lib/ratings";
import { getProductOptions } from "@/lib/options";
import type { Product } from "@/lib/types";
import ExploreClient from "./explore-client";

export const dynamic = "force-dynamic";


export default async function ExplorePage() {
  const supabase = await createClient();

  const [{ data: products }, { data: scored }, ratings, options] =
    await Promise.all([
      supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false }),
      // Blended quality score per active listing (featured_products view,
      // migration 013) — powers the default "recommended" sort. Score map
      // ONLY: the rows the page renders still come from `products`, so no
      // view column can ever gate the grid. Fail-soft: view missing/erroring
      // → empty map → recommended degrades to the newest-first fetch order.
      supabase.from("featured_products").select("id, featured_score"),
      fetchProductRatings(supabase),
      getProductOptions(),
    ]);

  const scores = Object.fromEntries(
    ((scored as { id: string; featured_score: number }[] | null) ?? []).map(
      (r) => [r.id, r.featured_score]
    )
  );

  return (
    <div>
      <section className="bg-mist/60 px-5 py-12">
        <div className="mx-auto max-w-6xl">
          <h1 className="font-display text-4xl font-bold lowercase leading-tight">
            sequences, class plans, workshops, guided meditations, and more
          </h1>
          <p className="mt-3 max-w-2xl text-fog">
            made by teachers who are actually teaching right now, not
            influencers. one more way of supporting each other, the way this
            practice has always asked us to.
          </p>
        </div>
      </section>
      <ExploreClient
        products={(products as Product[] | null) ?? []}
        scores={scores}
        ratings={ratings}
        options={options}
      />
    </div>
  );
}
