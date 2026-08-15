"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProductCard, EmptyState } from "@/components/ui";
import { priceLabel } from "@/lib/fees";
import {
  DURATIONS,
  TEACHABILITY,
  durationLabel,
  teachabilityLabel,
} from "@/lib/categories";
import type { ProductOptions } from "@/lib/options";
import type { Product } from "@/lib/types";
import type { RatingMap } from "@/lib/ratings";

type ListKey = "teach" | "styles" | "types" | "levels";

/** Boolean quick-filters — separate from the list filters because they toggle
 *  a flag rather than adding to a multi-select list. */
type FlagKey = "freeOnly" | "featuredOnly";

type Filters = {
  /** $0 listings only. */
  freeOnly: boolean;
  /** Admin-starred picks only (products.featured_at).
   *  NOT the `featured_products` view — that scores EVERY active listing and
   *  the homepage just takes the top slice, so filtering on it would return
   *  the whole catalogue. The ★ picks are the curated set worth a filter. */
  featuredOnly: boolean;
  teach: string[];
  styles: string[];
  /** index range into DURATIONS ([lo, hi]); the full range means "any" */
  duration: [number, number];
  types: string[];
  levels: string[];
};

const FULL_RANGE: [number, number] = [0, DURATIONS.length - 1];

/** Sort orders, in menu order. "recommended" (the default) reuses the
 *  featured_products blended score — bayesian rating / conversion / recency,
 *  migration 013 — so the landing order is curated-feeling instead of
 *  upload-chronological. Everything else sorts fields already on the page. */
const SORTS = [
  ["recommended", "recommended"],
  ["rating", "top rated"],
  ["price-asc", "price: low to high"],
  ["price-desc", "price: high to low"],
  ["newest", "newest"],
] as const;
type Sort = (typeof SORTS)[number][0];

const EMPTY_FILTERS: Filters = {
  freeOnly: false,
  featuredOnly: false,
  teach: [],
  styles: [],
  duration: FULL_RANGE,
  types: [],
  levels: [],
};

/* ── URL as the source of truth (block N2) ──────────────────────────────
 * Every filter, the search text, and the sort live in the querystring
 * (?q=&sort=&free=1&featured=1&teach=…&style=…&type=…&level=…&dur=lo-hi;
 * list params repeat, so option labels may contain anything). Two wins:
 * browser BACK from a listing restores the exact explore state instead of
 * wiping it, and filtered views become shareable links her campaigns can
 * point at. Writes go through history.replaceState — a SHALLOW update, no
 * Next navigation — so filter clicks never refetch the (force-dynamic)
 * page; useSearchParams is read once for the initial state on mount.
 * Defaults are omitted so bare /explore stays bare. Unknown or malformed
 * values parse to defaults and fall away on the next write. */

type ParamsLike = { get(k: string): string | null; getAll(k: string): string[] };

function parseSort(sp: ParamsLike): Sort {
  const raw = sp.get("sort");
  return SORTS.some(([v]) => v === raw) ? (raw as Sort) : "recommended";
}

function parseFilters(sp: ParamsLike): Filters {
  const max = DURATIONS.length - 1;
  let duration: [number, number] = FULL_RANGE;
  const dur = sp.get("dur");
  if (dur) {
    const m = dur.match(/^(\d+)-(\d+)$/);
    if (m) {
      const lo = Math.min(parseInt(m[1], 10), max);
      const hi = Math.min(parseInt(m[2], 10), max);
      if (lo <= hi) duration = [lo, hi];
    }
  }
  return {
    freeOnly: sp.get("free") === "1",
    featuredOnly: sp.get("featured") === "1",
    teach: sp.getAll("teach"),
    styles: sp.getAll("style"),
    duration,
    types: sp.getAll("type"),
    levels: sp.getAll("level"),
  };
}

function buildQuery(query: string, sort: Sort, filters: Filters): string {
  const p = new URLSearchParams();
  if (query.trim()) p.set("q", query.trim());
  if (sort !== "recommended") p.set("sort", sort);
  if (filters.freeOnly) p.set("free", "1");
  if (filters.featuredOnly) p.set("featured", "1");
  filters.teach.forEach((v) => p.append("teach", v));
  filters.styles.forEach((v) => p.append("style", v));
  filters.types.forEach((v) => p.append("type", v));
  filters.levels.forEach((v) => p.append("level", v));
  const [lo, hi] = filters.duration;
  if (lo > 0 || hi < DURATIONS.length - 1) p.set("dur", `${lo}-${hi}`);
  return p.toString();
}

export default function ExploreClient({
  products,
  scores,
  ratings,
  options,
}: {
  products: Product[];
  scores: Record<string, number>; // featured_score by product id (may be empty)
  ratings: RatingMap;
  options: ProductOptions; // admin-curated lists (styles/types/levels)
}) {
  const sp = useSearchParams();
  const [query, setQuery] = useState(() => sp.get("q") ?? "");
  const [sort, setSort] = useState<Sort>(() => parseSort(sp));
  const [filters, setFilters] = useState<Filters>(() => parseFilters(sp));
  const [panelOpen, setPanelOpen] = useState(false); // mobile slide-in

  // Mirror state → URL, shallowly (no navigation, no refetch). replaceState
  // rather than pushState: fifteen checkbox clicks should not become
  // fifteen history entries between the user and the previous page.
  useEffect(() => {
    const qs = buildQuery(query, sort, filters);
    window.history.replaceState(null, "", qs ? `/explore?${qs}` : "/explore");
  }, [query, sort, filters]);

  // Both quick-filters are gated on there being something for them to match.
  // A filter that can only ever return an empty grid reads as broken, so each
  // appears the moment the catalogue can satisfy it: the first ★ set in admin,
  // or the first $0 listing published.
  const hasFeatured = useMemo(
    () => products.some((p) => !!p.featured_at),
    [products]
  );
  const hasFree = useMemo(
    () => products.some((p) => p.price_cents === 0),
    [products]
  );

  function toggleFlag(key: FlagKey) {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggle<K extends ListKey>(key: K, value: Filters[K][number]) {
    setFilters((prev) => {
      const list = prev[key] as (typeof value)[];
      return {
        ...prev,
        [key]: list.includes(value)
          ? list.filter((v) => v !== value)
          : [...list, value],
      };
    });
  }

  const activeChips = useMemo(() => {
    const chips: {
      key: ListKey | "duration" | FlagKey;
      value: string | number;
      label: string;
    }[] = [];
    if (filters.freeOnly)
      chips.push({ key: "freeOnly", value: 0, label: "free only" });
    if (filters.featuredOnly)
      chips.push({ key: "featuredOnly", value: 0, label: "featured only" });
    filters.teach.forEach((v) =>
      chips.push({ key: "teach", value: v, label: teachabilityLabel(v) ?? v })
    );
    filters.styles.forEach((v) => chips.push({ key: "styles", value: v, label: v }));
    const [dLo, dHi] = filters.duration;
    if (dLo > 0 || dHi < DURATIONS.length - 1) {
      const lo = durationLabel(DURATIONS[dLo]);
      const hi = durationLabel(DURATIONS[dHi]);
      chips.push({
        key: "duration",
        value: 0,
        label: dLo === dHi ? `${lo}` : `${lo} – ${hi}`,
      });
    }
    filters.types.forEach((v) => chips.push({ key: "types", value: v, label: v }));
    filters.levels.forEach((v) => chips.push({ key: "levels", value: v, label: v }));
    return chips;
  }, [filters]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (filters.freeOnly && p.price_cents !== 0) return false;
      if (filters.featuredOnly && !p.featured_at) return false;
      if (
        q &&
        !`${p.title} ${p.description ?? ""} ${p.category ?? ""} ${p.theme ?? ""} ${p.content_type ?? ""}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      if (filters.teach.length && !filters.teach.includes(p.teachability ?? ""))
        return false;
      if (filters.styles.length && !filters.styles.includes(p.category ?? ""))
        return false;
      const [dLo, dHi] = filters.duration;
      if (dLo > 0 || dHi < DURATIONS.length - 1) {
        const m = p.duration_minutes ?? -1;
        if (m < DURATIONS[dLo]) return false;
        // the top bucket (2 hr+) has no upper bound
        if (dHi < DURATIONS.length - 1 && m > DURATIONS[dHi]) return false;
      }
      if (filters.types.length && !filters.types.includes(p.content_type ?? ""))
        return false;
      if (filters.levels.length && !filters.levels.includes(p.level ?? ""))
        return false;
      return true;
    });
  }, [products, query, filters]);

  const sorted = useMemo(() => {
    const newest = (a: Product, b: Product) =>
      +new Date(b.created_at) - +new Date(a.created_at);
    const cmp: Record<Sort, (a: Product, b: Product) => number> = {
      recommended: (a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0),
      // avg first (unrated sinks below any rating), review count breaks ties
      rating: (a, b) =>
        (ratings[b.id]?.avg ?? -1) - (ratings[a.id]?.avg ?? -1) ||
        (ratings[b.id]?.count ?? 0) - (ratings[a.id]?.count ?? 0),
      "price-asc": (a, b) => a.price_cents - b.price_cents,
      "price-desc": (a, b) => b.price_cents - a.price_cents,
      newest,
    };
    // every order tie-breaks on newest, so equal items land predictably
    return [...filtered].sort((a, b) => cmp[sort](a, b) || newest(a, b));
  }, [filtered, sort, scores, ratings]);

  const filterBody = (
    <>
      {(hasFree || hasFeatured) && (
        <FilterGroup title="show me">
          {hasFree && (
            <Check
              label="free only"
              checked={filters.freeOnly}
              onChange={() => toggleFlag("freeOnly")}
            />
          )}
          {hasFeatured && (
            <Check
              label="featured only"
              checked={filters.featuredOnly}
              onChange={() => toggleFlag("featuredOnly")}
            />
          )}
        </FilterGroup>
      )}
      <FilterGroup title="teachability">
        {TEACHABILITY.map((t) => (
          <Check
            key={t.value}
            label={t.label}
            checked={filters.teach.includes(t.value)}
            onChange={() => toggle("teach", t.value)}
          />
        ))}
      </FilterGroup>
      <FilterGroup title="yoga style">
        {options.styles.map((s) => (
          <Check
            key={s}
            label={s}
            checked={filters.styles.includes(s)}
            onChange={() => toggle("styles", s)}
          />
        ))}
      </FilterGroup>
      <FilterGroup title="duration">
        <DurationSlider
          value={filters.duration}
          onChange={(range) =>
            setFilters((prev) => ({ ...prev, duration: range }))
          }
        />
      </FilterGroup>
      <FilterGroup title="content type">
        {options.contentTypes.map((t) => (
          <Check
            key={t}
            label={t}
            checked={filters.types.includes(t)}
            onChange={() => toggle("types", t)}
          />
        ))}
      </FilterGroup>
      <FilterGroup title="level">
        {options.levels.map((l) => (
          <Check
            key={l}
            label={l}
            checked={filters.levels.includes(l)}
            onChange={() => toggle("levels", l)}
          />
        ))}
      </FilterGroup>
    </>
  );

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      {/* search + sort + mobile filter button (wraps on narrow screens) */}
      <div className="flex flex-wrap gap-3">
        <label className="flex min-w-[200px] flex-1 items-center gap-3 rounded-2xl border border-ink/10 bg-white px-4 py-3 shadow-sm focus-within:border-sage-400">
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
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          aria-label="sort listings"
          className="rounded-2xl border border-ink/10 bg-white px-4 py-3 font-display text-sm font-semibold lowercase shadow-sm outline-none focus:border-sage-400"
        >
          {SORTS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          onClick={() => setPanelOpen(true)}
          className="rounded-2xl border border-ink/10 bg-white px-4 font-display text-sm font-semibold lowercase shadow-sm lg:hidden"
        >
          filters{activeChips.length ? ` (${activeChips.length})` : ""}
        </button>
      </div>

      {/* active filter chips */}
      {activeChips.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {activeChips.map((c) => (
            <button
              key={`${c.key}-${c.value}`}
              onClick={() =>
                c.key === "duration"
                  ? setFilters((prev) => ({ ...prev, duration: FULL_RANGE }))
                  : c.key === "freeOnly" || c.key === "featuredOnly"
                    ? toggleFlag(c.key)
                    : toggle(c.key, c.value as never)
              }
              className="inline-flex items-center gap-1.5 rounded-full bg-sage-100 px-3 py-1 text-sm font-semibold text-sage-700 hover:bg-sage-200"
            >
              {c.label} <span aria-hidden>×</span>
            </button>
          ))}
          <button
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="text-sm lowercase text-fog underline hover:text-ink"
          >
            clear all
          </button>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[230px_1fr]">
        {/* desktop sidebar */}
        <aside className="hidden h-fit rounded-2xl border border-ink/5 bg-white p-5 shadow-sm lg:block">
          <h2 className="font-display text-lg font-bold lowercase">filters</h2>
          {filterBody}
        </aside>

        {/* mobile slide-in panel */}
        {panelOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-ink/40"
              onClick={() => setPanelOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] overflow-y-auto bg-white p-5 shadow-xl">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold lowercase">filters</h2>
                <button
                  onClick={() => setPanelOpen(false)}
                  className="rounded-full bg-mist px-3 py-1 text-sm lowercase"
                >
                  done
                </button>
              </div>
              {filterBody}
            </div>
          </div>
        )}

        {/* grid */}
        <div>
          {!sorted.length ? (
            <EmptyState>
              {products.length
                ? "nothing matches those filters — try widening the search."
                : "no listings yet. instructors, this stage is yours."}
            </EmptyState>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {sorted.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  priceLabel={priceLabel(p.price_cents)}
                  rating={ratings[p.id]?.avg ?? null}
                  reviewCount={ratings[p.id]?.count ?? 0}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Dual-thumb slider over the DURATIONS buckets — two overlaid native range
 * inputs, so it works with mouse, touch, and keyboard. Only the thumbs catch
 * pointer events (see .dual-range in globals.css). Full range = filter off.
 */
function DurationSlider({
  value,
  onChange,
}: {
  value: [number, number];
  onChange: (v: [number, number]) => void;
}) {
  const max = DURATIONS.length - 1;
  const [lo, hi] = value;
  const pct = (i: number) => (i / max) * 100;
  return (
    <div className="pt-1">
      <div className="flex items-baseline justify-between">
        <span className="font-semibold">
          {durationLabel(DURATIONS[lo])}
          {lo !== hi && ` – ${durationLabel(DURATIONS[hi])}`}
        </span>
        {(lo > 0 || hi < max) && (
          <button
            type="button"
            onClick={() => onChange([0, max])}
            className="text-xs lowercase text-fog underline hover:text-ink"
          >
            any
          </button>
        )}
      </div>
      <div className="relative mt-3 h-5">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-ink/10" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-sage-400"
          style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }}
        />
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={lo}
          aria-label="minimum duration"
          onChange={(e) => onChange([Math.min(Number(e.target.value), hi), hi])}
          className="dual-range absolute inset-0 w-full"
          style={{ zIndex: lo === hi && lo > 0 ? 4 : 2 }}
        />
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={hi}
          aria-label="maximum duration"
          onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo)])}
          className="dual-range absolute inset-0 w-full"
          style={{ zIndex: 3 }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-fog">
        <span>15 min</span>
        <span>1 hr</span>
        <span>2 hr+</span>
      </div>
    </div>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 border-t border-ink/5 pt-4 first:mt-2">
      <h3 className="mb-2.5 font-display text-sm font-semibold lowercase">
        {title}
      </h3>
      <div className="flex flex-col gap-2 text-sm">{children}</div>
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded accent-[var(--color-sage-500)]"
      />
      {label}
    </label>
  );
}
