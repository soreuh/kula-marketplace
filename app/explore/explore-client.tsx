"use client";

import { useMemo, useState } from "react";
import { ProductCard, EmptyState } from "@/components/ui";
import { formatUsd } from "@/lib/fees";
import {
  STYLES,
  CONTENT_TYPES,
  LEVELS,
  DURATIONS,
  TEACHABILITY,
  durationLabel,
  teachabilityLabel,
} from "@/lib/categories";
import type { Product } from "@/lib/types";
import type { RatingMap } from "./page";

type ListKey = "teach" | "styles" | "types" | "levels";

type Filters = {
  teach: string[];
  styles: string[];
  /** index range into DURATIONS ([lo, hi]); the full range means "any" */
  duration: [number, number];
  types: string[];
  levels: string[];
};

const FULL_RANGE: [number, number] = [0, DURATIONS.length - 1];

const EMPTY_FILTERS: Filters = {
  teach: [],
  styles: [],
  duration: FULL_RANGE,
  types: [],
  levels: [],
};

export default function ExploreClient({
  products,
  ratings,
}: {
  products: Product[];
  ratings: RatingMap;
}) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [panelOpen, setPanelOpen] = useState(false); // mobile slide-in

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
    const chips: { key: ListKey | "duration"; value: string | number; label: string }[] = [];
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

  const filterBody = (
    <>
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
        {STYLES.map((s) => (
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
        {CONTENT_TYPES.map((t) => (
          <Check
            key={t}
            label={t}
            checked={filters.types.includes(t)}
            onChange={() => toggle("types", t)}
          />
        ))}
      </FilterGroup>
      <FilterGroup title="level">
        {LEVELS.map((l) => (
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
      {/* search + mobile filter button */}
      <div className="flex gap-3">
        <label className="flex flex-1 items-center gap-3 rounded-2xl border border-ink/10 bg-white px-4 py-3 shadow-sm focus-within:border-sage-400">
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
                  priceLabel={formatUsd(p.price_cents)}
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
