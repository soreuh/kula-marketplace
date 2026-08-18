"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CoverArt, Stars, inputCls } from "@/components/ui";

/**
 * The library's client list (M3 + M4, 2026-08-15): compact rows mirroring
 * the dashboard "my content" list (thumb · title + sub-line · view /
 * download pills), plus search and content-type filter chips — the same
 * tools the seller side has for their own listings. Search/filter state
 * mirrors to the URL (?q= &type=) via shallow history.replaceState, per
 * the return-path standing rule — browser back restores it, and the view
 * is shareable/bookmarkable. Defaults are omitted so bare /library stays
 * bare; unknown values match nothing and fall away on the next write.
 */
export type LibraryRow = {
  orderId: string;
  productId: string;
  /** null = listing hidden from this buyer (suspended/removed) */
  title: string | null;
  contentType: string | null;
  category: string | null;
  coverPath: string | null;
  paidLabel: string;
  rating: { avg: number; count: number } | null;
  purchased: string;
};

export default function LibraryList({ rows }: { rows: LibraryRow[] }) {
  const sp = useSearchParams();
  const [query, setQuery] = useState(() => sp.get("q") ?? "");
  const [type, setType] = useState(() => sp.get("type") ?? "");

  // Mirror state → URL, shallowly (no navigation, no refetch).
  useEffect(() => {
    const p = new URLSearchParams();
    if (query.trim()) p.set("q", query.trim());
    if (type) p.set("type", type);
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `/library?${qs}` : "/library");
  }, [query, type]);

  // Type chips only exist once the shelf spans more than one type.
  const types = useMemo(
    () =>
      [...new Set(rows.map((r) => r.contentType).filter(Boolean))] as string[],
    [rows]
  );

  const needle = query.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (type && r.contentType !== type) return false;
    if (needle && !(r.title ?? "").toLowerCase().includes(needle)) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <div className="relative w-full max-w-sm">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fog"
            width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            placeholder="search your library…"
            className={`${inputCls} pl-9`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {types.length > 1 && (
          <>
            <FilterChip active={!type} onClick={() => setType("")}>
              all
            </FilterChip>
            {types.map((t) => (
              <FilterChip
                key={t}
                active={type === t}
                onClick={() => setType(type === t ? "" : t)}
              >
                {t}
              </FilterChip>
            ))}
          </>
        )}
      </div>

      {!filtered.length ? (
        <div className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-10 text-center text-fog">
          nothing in your library matches —{" "}
          <button
            onClick={() => {
              setQuery("");
              setType("");
            }}
            className="underline hover:text-ink"
          >
            clear the search
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((r) => (
            <div
              key={r.orderId}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-ink/5 bg-white p-3 text-sm shadow-sm"
            >
              {r.title ? (
                <>
                  {/* M10: thumb links like the title */}
                  <Link
                    href={`/products/${r.productId}`}
                    tabIndex={-1}
                    className="shrink-0"
                  >
                    <CoverArt
                      seed={`${r.category}-${r.title}`}
                      imagePath={r.coverPath}
                      className="h-14 w-20 rounded-xl"
                    />
                  </Link>
                  <div className="min-w-0 flex-1 basis-40">
                    <Link
                      href={`/products/${r.productId}`}
                      className="truncate font-display font-semibold hover:text-sage-600"
                    >
                      {r.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-fog">
                      {r.contentType && <span>{r.contentType} ·</span>}
                      <span>{r.paidLabel}</span>
                      {r.rating && (
                        <Stars rating={r.rating.avg} count={r.rating.count} />
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
                    purchased {new Date(r.purchased).toLocaleDateString()} —
                    your download still works.
                  </p>
                </div>
              )}
              {/* M5: pills grouped — full-width line on phones, inline on sm+ */}
              <div className="flex w-full items-center gap-2 sm:w-auto">
              {r.title && (
                <Link
                  href={`/products/${r.productId}`}
                  className="rounded-full border border-ink/10 bg-white px-3.5 py-1.5 lowercase hover:border-ink/30"
                >
                  view
                </Link>
              )}
              <a
                href={`/api/download/${r.productId}`}
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-full px-4 py-1.5 text-sm lowercase transition " +
        (active
          ? "bg-sage-500 font-display font-semibold text-white"
          : "border border-ink/10 bg-white text-ink hover:border-ink/30")
      }
    >
      {children}
    </button>
  );
}
