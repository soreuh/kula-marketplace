import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNewReviewEmail, sendReviewNudgeEmail } from "@/lib/email";
import { siteUrl } from "@/lib/stripe";

/**
 * POST /api/cron/review-sweep — the daily review sweep (block 9).
 *
 * Triggered by netlify/functions/review-sweep-cron.mts (daily), or by
 * hand for testing:
 *   curl -X POST -H "authorization: Bearer $CRON_SECRET" \
 *     https://kula-marketplace.com/api/cron/review-sweep
 *
 * Two passes, one platform switch (notify_review_emails, migration 028):
 *  A. BUYER nudges — paid orders 3–14 days old, buyer hasn't reviewed,
 *     nudge not yet stamped, buyer active, listing not draft/suspended.
 *     One email per order EVER (stamp = dedupe), free claims included
 *     (freebie reviews seed the featured score).
 *  B. SELLER notices — reviews without seller_notified_at, batched into
 *     one email per seller; respects the seller's sale_notifications
 *     toggle and stamps every review it covered (including ones skipped
 *     because the seller opted out — an opt-out shouldn't queue mail
 *     forever).
 *
 * Posture: feature stays dark without CRON_SECRET (house pattern for
 * keyed features); everything best-effort; stamps only written AFTER a
 * successful send (buyer side) so failures retry tomorrow; hard caps per
 * run keep a bad day boring.
 */

const WINDOW_MIN_DAYS = 3;
const WINDOW_MAX_DAYS = 14;
const MAX_NUDGES_PER_RUN = 50;
const MAX_SELLER_EMAILS_PER_RUN = 50;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return NextResponse.json({ error: "Sweep not configured" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Platform switch — tolerant read, missing column counts as ON
  const { data: settings } = await admin
    .from("platform_settings")
    .select("*")
    .single();
  if (
    (settings as { notify_review_emails?: boolean } | null)
      ?.notify_review_emails === false
  )
    return NextResponse.json({ ok: true, skipped: "switched off" });

  const site = siteUrl();
  const now = Date.now();
  const minCreated = new Date(now - WINDOW_MAX_DAYS * 86400_000).toISOString();
  const maxCreated = new Date(now - WINDOW_MIN_DAYS * 86400_000).toISOString();

  let nudgesSent = 0;
  let sellerEmailsSent = 0;
  let reviewsCovered = 0;

  // ── A. buyer nudges ──────────────────────────────────────────────
  try {
    const { data: orders } = await admin
      .from("orders")
      .select("id, buyer_id, product_id, created_at")
      .eq("status", "paid")
      .is("review_nudge_sent_at", null)
      .gte("created_at", minCreated)
      .lte("created_at", maxCreated)
      .limit(200);

    for (const o of orders ?? []) {
      if (nudgesSent >= MAX_NUDGES_PER_RUN) break;

      // already reviewed? then stamp WITHOUT sending — job done by itself
      const { data: existing } = await admin
        .from("reviews")
        .select("id")
        .eq("buyer_id", o.buyer_id)
        .eq("product_id", o.product_id)
        .maybeSingle();
      if (existing) {
        await admin
          .from("orders")
          .update({ review_nudge_sent_at: new Date().toISOString() })
          .eq("id", o.id);
        continue;
      }

      const [{ data: product }, { data: buyer }] = await Promise.all([
        admin
          .from("products")
          .select("title, status")
          .eq("id", o.product_id)
          .single(),
        admin
          .from("profiles")
          .select("email, account_status")
          .eq("id", o.buyer_id)
          .single(),
      ]);
      // draft/suspended listings and moderated buyers: skip WITHOUT
      // stamping — if the situation resolves inside the window, tomorrow's
      // run picks it up; if not, the order ages out quietly.
      if (!product || product.status === "suspended" || product.status === "draft")
        continue;
      if (!buyer?.email || buyer.account_status !== "active") continue;

      const sent = await sendReviewNudgeEmail({
        to: buyer.email,
        productTitle: product.title,
        productId: o.product_id,
        siteUrl: site,
      });
      if (sent) {
        nudgesSent++;
        await admin
          .from("orders")
          .update({ review_nudge_sent_at: new Date().toISOString() })
          .eq("id", o.id);
      }
    }
  } catch {
    // best-effort — a failed pass just runs again tomorrow
  }

  // ── B. seller notices, batched per seller ────────────────────────
  try {
    const { data: pending } = await admin
      .from("reviews")
      .select("id, product_id, rating")
      .is("seller_notified_at", null)
      .limit(200);

    if (pending?.length) {
      const productIds = [...new Set(pending.map((r) => r.product_id))];
      const { data: products } = await admin
        .from("products")
        .select("id, title, seller_id")
        .in("id", productIds);
      const productById = new Map((products ?? []).map((p) => [p.id, p]));

      // group review items per seller
      const bySeller = new Map<
        string,
        { reviewIds: string[]; items: { productTitle: string; productId: string; rating: number }[] }
      >();
      for (const r of pending) {
        const p = productById.get(r.product_id);
        if (!p) continue;
        const g = bySeller.get(p.seller_id) ?? { reviewIds: [], items: [] };
        g.reviewIds.push(r.id);
        g.items.push({ productTitle: p.title, productId: p.id, rating: r.rating });
        bySeller.set(p.seller_id, g);
      }

      for (const [sellerId, g] of bySeller) {
        if (sellerEmailsSent >= MAX_SELLER_EMAILS_PER_RUN) break;
        const { data: seller } = await admin
          .from("profiles")
          .select("email, sale_notifications, account_status")
          .eq("id", sellerId)
          .single();

        const wants =
          !!seller?.email &&
          seller.account_status === "active" &&
          seller.sale_notifications;
        const sent = wants
          ? await sendNewReviewEmail({ to: seller!.email, items: g.items, siteUrl: site })
          : false;
        if (sent) sellerEmailsSent++;

        // Stamp when sent OR when the seller opted out / is moderated —
        // an opt-out must not queue mail forever. Only a transient send
        // failure leaves the stamp empty for tomorrow's retry.
        if (sent || !wants) {
          await admin
            .from("reviews")
            .update({ seller_notified_at: new Date().toISOString() })
            .in("id", g.reviewIds);
          reviewsCovered += g.reviewIds.length;
        }
      }
    }
  } catch {
    // best-effort
  }

  return NextResponse.json({
    ok: true,
    nudges_sent: nudgesSent,
    seller_emails_sent: sellerEmailsSent,
    reviews_covered: reviewsCovered,
  });
}
