import { createClient } from "@/lib/supabase/server";
import { fetchProductRatings } from "@/lib/ratings";
import { getProductOptions } from "@/lib/options";
import type { Product } from "@/lib/types";
import ExploreClient from "./explore-client";

export const dynamic = "force-dynamic";


export default async function ExplorePage() {
  const supabase = await createClient();

  const [{ data: products }, ratings, options] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    fetchProductRatings(supabase),
    getProductOptions(),
  ]);

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
        ratings={ratings}
        options={options}
      />
    </div>
  );
}
