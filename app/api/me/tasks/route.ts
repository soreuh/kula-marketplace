import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";

/**
 * GET /api/me/tasks — feeds the header bell (block 9's second half).
 *
 * DERIVED, not stored: there is no notifications table and no read/unread
 * state. The bell is a to-do list computed live from data that already
 * exists — acting on an item is what clears it. Two task types today:
 *   · toReview — paid orders (incl. free claims) with no review from you
 *   · toReply  — reviews on your listings without your public reply
 * Future derived items join this payload; a real notifications TABLE only
 * earns its migration if kula ever wants event-style alerts.
 *
 * Runs entirely under the CALLER's RLS client — your orders, your
 * reviews, your listings. No service role anywhere near it.
 */
export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;

  const [{ data: myOrders }, { data: myReviews }, { data: myProducts }] =
    await Promise.all([
      supabase
        .from("orders")
        .select("product_id")
        .eq("buyer_id", user.id)
        .eq("status", "paid"),
      supabase.from("reviews").select("product_id").eq("buyer_id", user.id),
      supabase.from("products").select("id, title").eq("seller_id", user.id),
    ]);

  // buyer side: owned minus reviewed
  const reviewed = new Set((myReviews ?? []).map((r) => r.product_id));
  const pendingIds = [
    ...new Set(
      (myOrders ?? [])
        .map((o) => o.product_id)
        .filter((id) => !reviewed.has(id))
    ),
  ];
  let toReview: { productId: string; title: string }[] = [];
  if (pendingIds.length) {
    // RLS note: buyers can read the rows they own even when unlisted, so
    // titles resolve for archived purchases too. Cap keeps the menu sane.
    const { data: rows } = await supabase
      .from("products")
      .select("id, title, status")
      .in("id", pendingIds.slice(0, 25));
    toReview = (rows ?? [])
      .filter((p) => p.status !== "suspended" && p.status !== "draft")
      .map((p) => ({ productId: p.id, title: p.title }));
  }

  // seller side: reviews on my listings awaiting my reply
  let toReply: { productId: string; title: string; rating: number }[] = [];
  const mine = (myProducts ?? []) as { id: string; title: string }[];
  if (mine.length) {
    const titleById = new Map(mine.map((p) => [p.id, p.title]));
    const { data: unanswered } = await supabase
      .from("reviews")
      .select("product_id, rating")
      .in(
        "product_id",
        mine.map((p) => p.id)
      )
      .is("reply", null)
      .limit(25);
    toReply = (unanswered ?? []).map((r) => ({
      productId: r.product_id,
      title: titleById.get(r.product_id) ?? "your listing",
      rating: r.rating,
    }));
  }

  return NextResponse.json({ toReview, toReply });
}
