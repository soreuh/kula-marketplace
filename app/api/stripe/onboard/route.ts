import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, siteUrl } from "@/lib/stripe";

/**
 * POST /api/stripe/onboard
 * Creates (once) a Stripe Connect Express account for the logged-in seller
 * and returns an onboarding link. Stripe handles KYC, bank details, tax forms.
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

  if (!profile || (profile.role !== "seller" && profile.role !== "admin"))
    return NextResponse.json({ error: "Sellers only" }, { status: 403 });

  const stripe = getStripe();
  let accountId = profile.stripe_account_id;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: profile.email,
      metadata: { supabase_user_id: user.id },
    });
    accountId = account.id;
    // Sellers may update their own profile row (RLS), so no service key needed.
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
    refresh_url: `${siteUrl()}/dashboard/seller?stripe=refresh`,
    return_url: `${siteUrl()}/dashboard/seller?stripe=return`,
  });

  return NextResponse.json({ url: link.url });
}
