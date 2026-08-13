import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, siteUrl } from "@/lib/stripe";

/**
 * POST /api/stripe/onboard
 * Any logged-in user can become an instructor: this upgrades their role to
 * seller (self-upgrade is allowed buyer↔seller), creates a Stripe Connect
 * Express account (monthly payout schedule) if needed, and returns the
 * hosted onboarding link.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Please log in first" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, stripe_account_id, email")
    .eq("id", user.id)
    .single();
  if (!profile)
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Roles overlap: buyers self-upgrade the moment they start selling.
  if (profile.role === "buyer") {
    const { error } = await supabase
      .from("profiles")
      .update({ role: "seller" })
      .eq("id", user.id);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const stripe = getStripe();
  let accountId = profile.stripe_account_id;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: profile.email,
      metadata: { supabase_user_id: user.id },
      settings: {
        payouts: {
          schedule: { interval: "monthly", monthly_anchor: 1 },
        },
      },
    });
    accountId = account.id;
    const { error } = await supabase
      .from("profiles")
      .update({ stripe_account_id: accountId })
      .eq("id", user.id);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${siteUrl()}/dashboard?stripe=refresh`,
    return_url: `${siteUrl()}/dashboard?stripe=return`,
  });

  return NextResponse.json({ url: link.url });
}
