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

type Filters = {
  teach: string[];
  styles: string[];
  durations: number[];
  types: string[];
  levels: string[];
};

const EMPTY_FILTERS: Filters = {
  teach: [],
  styles: [],
  durations: [],
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

  function toggle<K extends keyof Filters>(key: K, value: Filters[K][number]) {
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
    const chips: { key: keyof Filters; value: string | number; label: string }[] = [];
    filters.teach.forEach((v) =>
      chips.push({ key: "teach", value: v, label: teachabilityLabel(v) ?? v })
    );
    filters.styles.forEach((v) => chips.push({ key: "styles", value: v, label: v }));
    filters.durations.forEach((v) =>
      chips.push({ key: "durations", value: v, label: durationLabel(v) ?? String(v) })
    );
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
      if (
        filters.durations.length &&
        !filters.durations.includes(p.duration_minutes ?? -1)
      )
        return false;
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
        {DURATIONS.map((d) => (
          <Check
            key={d}
            label={durationLabel(d) ?? String(d)}
            checked={filters.durations.includes(d)}
            onChange={() => toggle("durations", d)}
          />
        ))}
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
              onClick={() => toggle(c.key, c.value as never)}
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
