import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, siteUrl } from "@/lib/stripe";
import { feeCents, sellerNetCents } from "@/lib/fees";
import type { PlatformSettings, Product } from "@/lib/types";

/**
 * POST /api/checkout  { productId }
 * COMMISSION MODEL: the buyer pays the listed price (one line item).
 * Kula's commission (fee_percent + flat, e.g. 30% + 25¢) is taken via
 * `application_fee_amount`; Stripe transfers the rest to the seller.
 * The webhook — never the client — marks the order paid.
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

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("status", "active")
    .single();
  if (!product)
    return NextResponse.json({ error: "Listing not available" }, { status: 404 });
  const p = product as Product;

  if (p.seller_id === user.id)
    return NextResponse.json(
      { error: "You can't buy your own listing" },
      { status: 400 }
    );

  // Already own it? Don't charge twice.
  const { data: existing } = await supabase
    .from("orders")
    .select("id")
    .eq("buyer_id", user.id)
    .eq("product_id", p.id)
    .eq("status", "paid")
    .maybeSingle();
  if (existing)
    return NextResponse.json(
      { error: "You already own this — find it in your library" },
      { status: 409 }
    );

  const admin = createAdminClient();
  const { data: seller } = await admin
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", p.seller_id)
    .single();

  if (!seller?.stripe_account_id)
    return NextResponse.json(
      { error: "This seller hasn't finished payment setup yet" },
      { status: 409 }
    );

  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(seller.stripe_account_id);
  if (!account.charges_enabled)
    return NextResponse.json(
      { error: "This seller hasn't finished payment setup yet" },
      { status: 409 }
    );

  const { data: settings } = await supabase
    .from("platform_settings")
    .select("*")
    .single();
  if (!settings)
    return NextResponse.json({ error: "Platform not configured" }, { status: 500 });
  const s = settings as PlatformSettings;

  const fee = feeCents(p.price_cents, s);
  const net = sellerNetCents(p.price_cents, s);

  const meta = {
    product_id: p.id,
    buyer_id: user.id,
    price_cents: String(p.price_cents),
    fee_cents: String(fee),
    net_cents: String(net),
  };

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: p.price_cents,
          product_data: {
            name: p.title,
            description: "one-time payment · lifetime access",
          },
        },
      },
    ],
    payment_intent_data: {
      application_fee_amount: fee,
      transfer_data: { destination: seller.stripe_account_id },
      metadata: meta,
    },
    metadata: meta,
    success_url: `${siteUrl()}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl()}/products/${p.id}`,
  });

  await admin.from("orders").insert({
    buyer_id: user.id,
    product_id: p.id,
    amount_cents: p.price_cents,
    fee_cents: fee,
    seller_amount_cents: net,
    stripe_checkout_session: session.id,
    status: "pending",
  });

  return NextResponse.json({ url: session.url });
}
