import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/stripe/webhook
 * The ONLY writer of paid orders. Stripe signs every event; we verify the
 * signature against the raw body before trusting anything.
 *
 * Local testing:  stripe listen --forward-to localhost:3000/api/stripe/webhook
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature)
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== "paid") break;

      const meta = session.metadata ?? {};
      if (!meta.product_id || !meta.buyer_id) break; // not one of ours

      const priceCents = parseInt(meta.price_cents ?? "0", 10);
      const feeCents = parseInt(meta.fee_cents ?? "0", 10);

      // Upsert keyed on the session id: updates the pending row from
      // checkout, or creates the order if that insert never happened.
      const { error } = await admin.from("orders").upsert(
        {
          buyer_id: meta.buyer_id,
          product_id: meta.product_id,
          amount_cents: session.amount_total ?? priceCents + feeCents,
          fee_cents: feeCents,
          seller_amount_cents: priceCents,
          currency: session.currency ?? "usd",
          stripe_checkout_session: session.id,
          stripe_payment_intent:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : (session.payment_intent?.id ?? null),
          status: "paid",
        },
        { onConflict: "stripe_checkout_session" }
      );
      if (error) {
        // Non-2xx makes Stripe retry — good: we don't want to lose orders.
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      await admin
        .from("orders")
        .delete()
        .eq("stripe_checkout_session", session.id)
        .eq("status", "pending");
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const pi =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
      if (pi) {
        await admin
          .from("orders")
          .update({ status: "refunded" })
          .eq("stripe_payment_intent", pi);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
