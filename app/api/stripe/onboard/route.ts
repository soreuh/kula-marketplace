import { NextResponse } from "next/server";
import { requireActiveAccount, requireUser } from "@/lib/api-guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, siteUrl } from "@/lib/stripe";

/**
 * POST /api/stripe/onboard
 * Any logged-in user can become an instructor: this upgrades their role to
 * seller (self-upgrade is allowed buyer↔seller), creates a Stripe Connect
 * Express account (monthly payout schedule) if needed, and returns the
 * hosted onboarding link.
 */
export async function POST() {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;

  // Paused/deleted accounts keep dashboard access but can't start moving
  // money — no new Stripe accounts, no onboarding links.
  const gate = await requireActiveAccount(
    supabase,
    user.id,
    "Your account is paused — selling is disabled. Contact kula if you think this is a mistake."
  );
  if (gate) return gate;

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

  try {
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
      // stripe_account_id is a guarded column (migration 008) — write it with
      // the service-role client, not the user's session.
      const { error } = await createAdminClient()
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
  } catch (err) {
    // Surface Stripe's own message (e.g. "complete your platform profile"
    // on a brand-new Connect platform) as readable JSON instead of letting
    // the route 500 into an HTML page the client can't parse.
    const message =
      err instanceof Error ? err.message : "Stripe rejected the request";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
