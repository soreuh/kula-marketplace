import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchProductRatings } from "@/lib/ratings";
import { priceLabel } from "@/lib/fees";
import { CoverArt, Stars, btnPrimary } from "@/components/ui";
import type { Order, Product } from "@/lib/types";

export const dynamic = "force-dynamic";

/** The buyer's permanent shelf — everything purchased, downloadable forever. */
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
        {!paid.length ? (
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
          /* Compact rows mirroring the dashboard "my content" list (M3,
             Aleks 2026-08-15) — the shop-style ProductCard grid read as
             clunky for things you already own. Same row anatomy as the
             seller side: thumb · title + sub-line · action pills. */
          <div className="flex flex-col gap-4">
            {paid.map((o) => {
              const p = productById.get(o.product_id);
              const r = ratings[o.product_id];
              return (
                <div
                  key={o.id}
                  className="flex flex-wrap items-center gap-4 rounded-2xl border border-ink/5 bg-white p-3 text-sm shadow-sm"
                >
                  {p ? (
                    <>
                      <CoverArt
                        seed={`${p.category}-${p.title}`}
                        imagePath={p.cover_path}
                        className="h-14 w-20 shrink-0 rounded-xl"
                      />
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/products/${p.id}`}
                          className="truncate font-display font-semibold hover:text-sage-600"
                        >
                          {p.title}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-fog">
                          {p.content_type && <span>{p.content_type} ·</span>}
                          <span>{priceLabel(o.amount_cents)}</span>
                          {r && r.count > 0 && (
                            <Stars rating={r.avg} count={r.count} />
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-semibold">
                        (listing no longer public)
                      </p>
                      <p className="mt-1 text-fog">
                        purchased {new Date(o.created_at).toLocaleDateString()} —
                        your download still works.
                      </p>
                    </div>
                  )}
                  {p && (
                    <Link
                      href={`/products/${p.id}`}
                      className="rounded-full border border-ink/10 px-3.5 py-1.5 lowercase hover:border-ink/30"
                    >
                      view
                    </Link>
                  )}
                  <a
                    href={`/api/download/${o.product_id}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-sage-500 px-4 py-1.5 font-display font-semibold lowercase text-white hover:bg-sage-600"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M12 3v12" />
                      <path d="m7 10 5 5 5-5" />
                      <path d="M5 21h14" />
                    </svg>
                    download
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
