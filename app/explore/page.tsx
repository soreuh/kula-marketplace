import { createClient } from "@/lib/supabase/server";
import type { PlatformSettings, Product } from "@/lib/types";
import ExploreClient from "./explore-client";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const supabase = await createClient();

  const [{ data: products }, { data: settings }] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    supabase.from("platform_settings").select("*").single(),
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
        settings={settings as PlatformSettings | null}
      />
    </div>
  );
}
