import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/claim-free  { productId }
 *
 * Adds a FREE listing to the buyer's library by recording a $0 paid order.
 * No money moves and Stripe is never involved — which is why free listings
 * don't require the seller to be Stripe-verified. The order row is what
 * unlocks downloads and (verified) reviews, exactly like a paid purchase.
 *
 * This is the ONE writer of orders besides the signature-verified Stripe
 * webhook, and it only ever writes zero-amount rows for active $0 listings.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Please log in first" }, { status: 401 });

  const { productId } = await request.json().catch(() => ({}));
  if (!productId)
    return NextResponse.json({ error: "Missing productId" }, { status: 400 });

  // moderation gate — mirrors checkout (tolerant if 007 hasn't run)
  const { data: me } = await supabase
    .from("profiles")
    .select("account_status")
    .eq("id", user.id)
    .maybeSingle();
  const myStatus = (me as { account_status?: string } | null)?.account_status;
  if (myStatus != null && myStatus !== "active")
    return NextResponse.json(
      { error: "Your account is paused — contact kula if you think this is a mistake." },
      { status: 403 }
    );

  // fetched with the USER's client — RLS ghosting/visibility applies
  const { data: product } = await supabase
    .from("products")
    .select("id, seller_id, price_cents, status")
    .eq("id", productId)
    .eq("status", "active")
    .single();
  if (!product)
    return NextResponse.json({ error: "Listing not available" }, { status: 404 });
  if (product.price_cents !== 0)
    return NextResponse.json(
      { error: "This listing isn't free — use the buy button" },
      { status: 400 }
    );
  if (product.seller_id === user.id)
    return NextResponse.json(
      { error: "It's your own listing — download it from your dashboard" },
      { status: 400 }
    );

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("orders")
    .select("id")
    .eq("buyer_id", user.id)
    .eq("product_id", productId)
    .eq("status", "paid")
    .maybeSingle();
  if (existing) return NextResponse.json({ ok: true, already: true });

  const { error } = await admin.from("orders").insert({
    buyer_id: user.id,
    product_id: productId,
    amount_cents: 0,
    fee_cents: 0,
    seller_amount_cents: 0,
    status: "paid",
  });
  if (error)
    return NextResponse.json({ error: "Could not add to library" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
