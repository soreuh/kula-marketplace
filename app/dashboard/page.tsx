import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProductOptions } from "@/lib/options";
import { fetchProductRatings } from "@/lib/ratings";
import { formatUsd } from "@/lib/fees";
import { getStripe } from "@/lib/stripe";
import type { Order, Product, Profile } from "@/lib/types";
import DashboardClient, { type SaleRow } from "./dashboard-client";

export const dynamic = "force-dynamic";

/**
 * The instructor dashboard — open to every logged-in user (roles overlap:
 * anyone can start selling). Posting is gated on Stripe being connected.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login?next=/dashboard");
  const prof = profile as Profile;

  const [{ data: products }, { data: orders }, allRatings, { data: settings }, options] =
    await Promise.all([
      supabase
        .from("products")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("orders")
        .select("*")
        .in("status", ["paid", "refunded"])
        .order("created_at", { ascending: false }),
      fetchProductRatings(supabase),
      supabase.from("platform_settings").select("*").single(),
      getProductOptions(),
    ]);

  // The seller's effective rate: their negotiated override, else the default.
  const feePercent =
    prof.commission_override ?? Number(settings?.fee_percent ?? 30);
  const feeFlat = settings?.fee_flat_cents ?? 25;
  const feeRateLabel = `${Number(feePercent)}% + ${formatUsd(feeFlat)} per sale`;

  const myProducts = (products as Product[] | null) ?? [];
  const myIds = new Set(myProducts.map((p) => p.id));
  const titleById = new Map(myProducts.map((p) => [p.id, p.title]));

  // RLS returns orders where the user is buyer OR seller — keep only sales.
  const sales: SaleRow[] = (((orders as Order[] | null) ?? []))
    .filter((o) => myIds.has(o.product_id))
    .map((o) => ({
      id: o.id,
      product_id: o.product_id,
      productTitle: titleById.get(o.product_id) ?? "(deleted listing)",
      amount_cents: o.amount_cents,
      fee_cents: o.fee_cents,
      seller_amount_cents: o.seller_amount_cents,
      status: o.status,
      created_at: o.created_at,
    }));

  // Ratings for my products only
  const ratings = Object.fromEntries(
    Object.entries(allRatings).filter(([id]) => myIds.has(id))
  );

  // Stripe status — live check, persisted so public pages can show
  // the Verified badge without an API call.
  let chargesEnabled = false;
  if (prof.stripe_account_id) {
    try {
      const account = await getStripe().accounts.retrieve(prof.stripe_account_id);
      chargesEnabled = !!account.charges_enabled;
    } catch {
      chargesEnabled = false;
    }
    if (chargesEnabled !== prof.stripe_charges_enabled) {
      // stripe_charges_enabled is a guarded column (migration 008): it may
      // only be set by the trusted server, never by the user's own session.
      const { createAdminClient } = await import("@/lib/supabase/admin");
      await createAdminClient()
        .from("profiles")
        .update({ stripe_charges_enabled: chargesEnabled })
        .eq("id", user.id);
      // G1: the FIRST false→true flip is the seller's welcome moment —
      // drop the admin-designated gift in their library (idempotent,
      // fail-soft, dark while no gift is configured).
      if (chargesEnabled && !prof.stripe_charges_enabled) {
        const { grantWelcomeGift } = await import("@/lib/welcome-gift");
        await grantWelcomeGift(user.id);
      }
    }
  }

  return (
    <div>
      <section className="bg-mist/60 px-5 py-10">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-display text-4xl font-bold lowercase">
            instructor dashboard
          </h1>
          <p className="mt-1 text-fog">
            manage your content and track your earnings.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5 py-8">
        <DashboardClient
          userId={user.id}
          role={prof.role}
          products={myProducts}
          sales={sales}
          ratings={ratings}
          stripeStarted={!!prof.stripe_account_id}
          chargesEnabled={chargesEnabled}
          ipAgreed={!!prof.ip_agreement_accepted_at}
          aiEnabled={!!process.env.KULA_ANTHROPIC_API_KEY}
          feeRateLabel={feeRateLabel}
          feePercent={Number(feePercent)}
          feeFlatCents={feeFlat}
          options={options}
        />
      </div>
    </div>
  );
}
