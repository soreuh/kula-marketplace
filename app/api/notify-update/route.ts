import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/api-guards";
import { rateLimitOk } from "@/lib/rate-limit";
import { sendContentUpdateEmails } from "@/lib/email";
import { siteUrl } from "@/lib/stripe";

/**
 * POST /api/notify-update  { productId }
 *
 * Tells every prior owner of a listing (paid buyers AND free claimers —
 * both hold paid-status orders) that its file was updated. Called by the
 * edit dialog only after a REAL content change (different sha256), but
 * never trusts the client for anything that matters:
 *   • caller must be the listing's own seller
 *   • platform kill switch (admin → notifications) checked server-side
 *   • 1 email per product per 24h via the 018 rate-limit counters —
 *     the ceiling on how often buyers can be mailed, whatever the client says
 * Needs the service-role client: buyer emails live on profiles rows the
 * seller has no RLS right to read — the list is assembled server-side and
 * never returned to the caller (only a count).
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;

  const { productId } = await request.json().catch(() => ({}));
  if (!productId)
    return NextResponse.json({ error: "Missing productId" }, { status: 400 });

  // Own listing only — read through the caller's RLS, so a forged id
  // belonging to someone else 404s here.
  const { data: product } = await supabase
    .from("products")
    .select("id, seller_id, title")
    .eq("id", productId)
    .eq("seller_id", user.id)
    .single();
  if (!product)
    return NextResponse.json({ error: "Not your listing" }, { status: 404 });

  const admin = createAdminClient();

  // Platform kill switch (admin → notifications). Tolerant read: missing
  // column (022 not applied) counts as ON, matching the default.
  const { data: settings } = await admin
    .from("platform_settings")
    .select("*")
    .single();
  if (settings && settings.notify_content_updates === false)
    return NextResponse.json({ ok: true, sent: 0, disabled: true });

  // The real spam ceiling — one send per product per day, server-side.
  if (!(await rateLimitOk(`content-update:${productId}`, 1, 86400)))
    return NextResponse.json(
      { error: "Buyers were already notified about this listing today." },
      { status: 429 }
    );

  // Owners: distinct buyers with a paid-status order (includes $0 claims).
  const { data: orders } = await admin
    .from("orders")
    .select("buyer_id")
    .eq("product_id", productId)
    .eq("status", "paid");
  const buyerIds = [...new Set((orders ?? []).map((o) => o.buyer_id))].filter(
    (id) => id !== user.id
  );
  if (!buyerIds.length) return NextResponse.json({ ok: true, sent: 0 });

  // Emails via service role (sellers can't read buyer profiles — by
  // design); skip moderated accounts. The list never leaves the server.
  const { data: buyers } = await admin
    .from("profiles")
    .select("*")
    .in("id", buyerIds);
  const to = (buyers ?? [])
    .filter(
      (b: { account_status?: string; content_update_emails?: boolean }) =>
        (!b.account_status || b.account_status === "active") &&
        b.content_update_emails !== false // per-buyer opt-out (022)
    )
    .map((b: { email: string }) => b.email)
    .filter(Boolean);

  const sent = await sendContentUpdateEmails({
    to,
    productTitle: product.title,
    siteUrl: siteUrl(),
  });
  return NextResponse.json({ ok: true, sent });
}
