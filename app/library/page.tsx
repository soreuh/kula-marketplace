import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchProductRatings } from "@/lib/ratings";
import { priceLabel } from "@/lib/fees";
import { btnPrimary } from "@/components/ui";
import LibraryList, { type LibraryRow } from "./library-list";
import type { Order, Product } from "@/lib/types";

export const dynamic = "force-dynamic";

/** The buyer's permanent shelf — everything purchased, downloadable forever.
 *  Server side: auth + fetches + row prep. Rendering, search, and type
 *  filters live in the client LibraryList (M3+M4, 2026-08-15) — compact
 *  rows mirroring the dashboard "my content" list, with search/filter
 *  state mirrored to the URL per the return-path rule. */
export default async function LibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/library");

  const [{ data: orders }, ratings] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .eq("buyer_id", user.id)
      .eq("status", "paid")
      .order("created_at", { ascending: false }),
    fetchProductRatings(supabase),
  ]);

  const paid = (orders as Order[] | null) ?? [];
  const productIds = [...new Set(paid.map((o) => o.product_id))];

  // Fetch via service-role-free path: buyers may not "see" suspended products
  // through RLS, so fall back to the order info if a product is hidden.
  const { data: products } = productIds.length
    ? await supabase.from("products").select("*").in("id", productIds)
    : { data: [] as Product[] };
  const productById = new Map(
    ((products as Product[] | null) ?? []).map((p) => [p.id, p])
  );

  const rows = paid.map((o): LibraryRow => {
    const p = productById.get(o.product_id);
    const r = ratings[o.product_id];
    return {
      orderId: o.id,
      productId: o.product_id,
      title: p?.title ?? null,
      contentType: p?.content_type ?? null,
      category: p?.category ?? null,
      coverPath: p?.cover_path ?? null,
      paidLabel: priceLabel(o.amount_cents),
      rating: r && r.count > 0 ? { avg: r.avg, count: r.count } : null,
      purchased: o.created_at,
    };
  });

  return (
    <div>
      <section className="bg-mist/60 px-5 py-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="font-display text-4xl font-bold lowercase">
            your library
          </h1>
          <p className="mt-1 text-fog">
            everything you&apos;ve purchased — yours forever, download any time.
            when a teacher updates their file, your library always has the
            latest version.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 py-8">
        {!rows.length ? (
          <div className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-12 text-center">
            <h3 className="font-display text-2xl font-bold lowercase">
              nothing here yet
            </h3>
            <p className="mt-1 text-fog">find something worth teaching tomorrow.</p>
            <Link href="/explore" className={btnPrimary + " mt-5"}>
              explore content <span aria-hidden>→</span>
            </Link>
          </div>
        ) : (
          <LibraryList rows={rows} />
        )}
      </div>
    </div>
  );
}
