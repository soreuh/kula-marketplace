import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import type { Order, Product, Profile } from "@/lib/types";
import { SellerTabs } from "./seller-client";

export const dynamic = "force-dynamic";

export default async function SellerDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const prof = profile as Profile | null;
  if (!prof || (prof.role !== "seller" && prof.role !== "admin"))
    redirect("/dashboard");

  const [{ data: products }, { data: sales }] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("*")
      .eq("status", "paid")
      .order("created_at", { ascending: false }),
  ]);

  let chargesEnabled = false;
  if (prof.stripe_account_id) {
    try {
      const account = await getStripe().accounts.retrieve(prof.stripe_account_id);
      chargesEnabled = !!account.charges_enabled;
    } catch {
      chargesEnabled = false;
    }
  }

  const myProducts = (products as Product[] | null) ?? [];
  const myProductIds = new Set(myProducts.map((p) => p.id));
  const mySales = ((sales as Order[] | null) ?? []).filter((o) =>
    myProductIds.has(o.product_id)
  );

  return (
    <div>
      <section className="bg-mist/60 px-5 py-10">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-display text-4xl font-bold lowercase">
            instructor dashboard
          </h1>
          <p className="mt-1 text-fog">
            manage your content and track your earnings.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-5 py-8">
        <SellerTabs
          userId={user.id}
          products={myProducts}
          sales={mySales}
          stripeStarted={!!prof.stripe_account_id}
          chargesEnabled={chargesEnabled}
        />
      </div>
    </div>
  );
}
