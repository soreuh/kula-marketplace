import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser, requireActiveAccount } from "@/lib/api-guards";
import {
  emailAllowed,
  sendFreeClaimEmail,
  sendPurchaseEmail,
} from "@/lib/email";
import { siteUrl } from "@/lib/stripe";

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
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;

  const { productId } = await request.json().catch(() => ({}));
  if (!productId)
    return NextResponse.json({ error: "Missing productId" }, { status: 400 });

  // moderation gate — same helper as checkout (tolerant if 007 hasn't run)
  const paused = await requireActiveAccount(supabase, user.id);
  if (paused) return paused;

  // fetched with the USER's client — RLS ghosting/visibility applies
  const { data: product } = await supabase
    .from("products")
    .select("id, seller_id, title, price_cents, status")
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

  // Emails — fail-soft: the claim already succeeded, nothing past this
  // point can undo it. Gates via emailAllowed (lib/email, settings S2).
  const [{ data: settings }, { data: me }, { data: seller }] =
    await Promise.all([
      supabase.from("platform_settings").select("*").single(),
      // own-row read: the buyer's free-download email pref (031)
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      // seller contact via admin — buyers can't read seller profiles (RLS)
      admin
        .from("profiles")
        .select("email, sale_notifications, account_status")
        .eq("id", product.seller_id)
        .single(),
    ]);

  // Buyer confirmation ("it's in your library") — unlike paid receipts,
  // free claims are a courtesy, so buyers can switch them off (031).
  if (user.email && emailAllowed("purchase_free", settings, me)) {
    await sendPurchaseEmail({
      to: user.email,
      productTitle: product.title,
      paidCents: 0,
      siteUrl: siteUrl(),
    });
  }

  // Seller ping ("someone grabbed your freebie") — REGRESSION FIX (found
  // in the 2026-08-15 settings survey): sendFreeClaimEmail had lost its
  // only call site. Rides the sale-notification gates — no new knob.
  if (
    seller?.email &&
    seller.account_status === "active" &&
    emailAllowed("sale", settings, seller)
  ) {
    await sendFreeClaimEmail({
      to: seller.email,
      productTitle: product.title,
      siteUrl: siteUrl(),
    });
  }

  return NextResponse.json({ ok: true });
}
