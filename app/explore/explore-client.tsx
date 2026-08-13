"use client";

import { useMemo, useState } from "react";
import { ProductCard, EmptyState } from "@/components/ui";
import { buyerTotalCents, formatUsd } from "@/lib/fees";
import { STYLES } from "@/lib/categories";
import type { PlatformSettings, Product } from "@/lib/types";

export default function ExploreClient({
  products,
  settings,
}: {
  products: Product[];
  settings: PlatformSettings | null;
}) {
  const [query, setQuery] = useState("");
  const [styles, setStyles] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (
        q &&
        !`${p.title} ${p.description ?? ""} ${p.category ?? ""}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      if (styles.length && !styles.includes(p.category ?? "Other")) return false;
      return true;
    });
  }, [products, query, styles]);

  function toggleStyle(style: string) {
    setStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      {/* search */}
      <label className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-white px-4 py-3 shadow-sm focus-within:border-sage-400">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-fog" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4-4" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search by title, theme, or style..."
          className="w-full bg-transparent outline-none placeholder:text-fog"
        />
      </label>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
        {/* filters */}
        <aside className="h-fit rounded-2xl border border-ink/5 bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-bold lowercase">filters</h2>
          <div className="mt-4 border-t border-ink/5 pt-4">
            <h3 className="mb-3 font-display text-sm font-semibold lowercase">
              style
            </h3>
            <div className="flex flex-col gap-2 text-sm">
              {STYLES.map((style) => (
                <label key={style} className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={styles.includes(style)}
                    onChange={() => toggleStyle(style)}
                    className="h-4 w-4 rounded accent-[var(--color-sage-500)]"
                  />
                  {style}
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* grid */}
        <div>
          {!filtered.length ? (
            <EmptyState>
              {products.length
                ? "nothing matches those filters — try widening the search."
                : "no listings yet. instructors, this stage is yours."}
            </EmptyState>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  priceLabel={
                    settings
                      ? formatUsd(buyerTotalCents(p.price_cents, settings))
                      : "—"
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
