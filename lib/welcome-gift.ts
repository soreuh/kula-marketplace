import { createAdminClient } from "@/lib/supabase/admin";
import { emailAllowed, sendPurchaseEmail } from "@/lib/email";
import { siteUrl } from "@/lib/stripe";

/**
 * G1 (2026-08-18): the seller welcome gift. When a seller's Stripe
 * charges_enabled flips true for the FIRST time (the dashboard sync — the
 * one code path that writes that column), the admin-designated $0 listing
 * (platform_settings.welcome_gift_product_id) lands in their library as a
 * $0 order. Two goals (Aleks): a real free gift at the seller's welcome
 * moment, and a marketing playbook that turns sellers into distribution —
 * plus the quiet third: their first taste of the BUYER loop (library,
 * download, the email) before they have buyers of their own.
 *
 * INVARIANT AMENDMENT: this is the THIRD writer of order rows, documented
 * in CLAUDE.md alongside the webhook (paid) and claim-free ($0 claims).
 * Its door is as narrow as theirs: service-role only · only the one
 * admin-designated product · only while that listing is an ACTIVE $0
 * listing · idempotent per user · fail-soft (a gift must never break
 * Stripe onboarding).
 */
export async function grantWelcomeGift(userId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: settings } = await admin
      .from("platform_settings")
      .select("*")
      .single();
    const giftId = (
      settings as { welcome_gift_product_id?: string | null } | null
    )?.welcome_gift_product_id;
    if (!giftId) return; // feature off

    const { data: gift } = await admin
      .from("products")
      .select("id, seller_id, title, price_cents, status")
      .eq("id", giftId)
      .single();
    // same posture as claim-free: only an ACTIVE $0 listing can mint a row
    if (!gift || gift.status !== "active" || gift.price_cents !== 0) return;
    if (gift.seller_id === userId) return; // the gift's own author

    const { data: existing } = await admin
      .from("orders")
      .select("id")
      .eq("buyer_id", userId)
      .eq("product_id", giftId)
      .eq("status", "paid")
      .maybeSingle();
    if (existing) return; // idempotent — re-syncs can never double-gift

    const { error } = await admin.from("orders").insert({
      buyer_id: userId,
      product_id: giftId,
      amount_cents: 0,
      fee_cents: 0,
      seller_amount_cents: 0,
      status: "paid",
      // a gift is exempt from the review-nudge sweep ("you picked up X"
      // reads wrong for something they never chose) — pre-stamped, though
      // reviewing it voluntarily still works like any owned listing
      review_nudge_sent_at: new Date().toISOString(),
    });
    if (error) return;

    // "it's in your library" — rides the existing free-download email and
    // its gates (platform switch + the user's own toggle). Deliberately no
    // seller ping to the gift's owner: a grant is not a claim.
    const { data: me } = await admin
      .from("profiles")
      .select("email, free_claim_emails")
      .eq("id", userId)
      .single();
    if (me?.email && emailAllowed("purchase_free", settings, me)) {
      await sendPurchaseEmail({
        to: me.email,
        productTitle: gift.title,
        paidCents: 0,
        siteUrl: siteUrl(),
      });
    }
  } catch {
    // fail-soft by design
  }
}
