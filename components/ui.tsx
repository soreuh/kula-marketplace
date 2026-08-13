import Link from "next/link";
import type { Product } from "@/lib/types";

/* Shared presentational pieces — server-safe (no hooks). */

export function LeafLogo({ size = 34 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-xl bg-sage-100"
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--color-sage-600)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M20 4c-8 0-14 4-15 12 4 1 8 1 11-2s4-7 4-10z" />
        <path d="M5 16c3-4 7-7 11-8" />
      </svg>
    </span>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <LeafLogo />
      <span className="font-display text-xl font-bold lowercase">kula</span>
    </span>
  );
}

/* button class strings — reuse everywhere for consistency */
export const btnPrimary =
  "inline-flex items-center gap-2 rounded-full bg-sage-500 px-6 py-3 font-display font-semibold lowercase text-white shadow-sm transition hover:bg-sage-600 disabled:opacity-50";
export const btnOutline =
  "inline-flex items-center gap-2 rounded-full border border-ink/20 bg-white px-6 py-3 font-display font-semibold lowercase text-ink transition hover:border-ink/40";
export const btnSmall =
  "inline-flex items-center gap-1.5 rounded-full bg-sage-500 px-4 py-1.5 text-sm font-display font-semibold lowercase text-white transition hover:bg-sage-600 disabled:opacity-50";
export const btnSmallOutline =
  "inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-white px-4 py-1.5 text-sm font-display font-semibold lowercase text-ink transition hover:border-ink/40";
export const inputCls =
  "w-full rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-ink placeholder:text-fog focus:border-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-200";

export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full border border-ink/10 bg-white px-3 py-1 text-xs font-semibold text-ink/70">
      {children}
    </span>
  );
}

export function StatusChip({ status }: { status: string }) {
  const tone =
    status === "active" || status === "paid"
      ? "bg-sage-100 text-sage-700"
      : status === "suspended" || status === "refunded"
        ? "bg-red-100 text-red-700"
        : "bg-mist text-fog";
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
      {status}
    </span>
  );
}

export function Stars() {
  return (
    <span className="flex items-center gap-1 text-fog" aria-label="No reviews yet">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6-5.4-2.9L6.6 19.7l1.1-6L3.2 9.4l6.1-.8z" />
        </svg>
      ))}
      <span className="ml-1 text-sm">New</span>
    </span>
  );
}

/* Deterministic soft-gradient cover art (until real listing photos exist). */
const COVERS: [string, string][] = [
  ["#d8a47f", "#ecd0ab"], // dusk sand
  ["#9db5a0", "#d3dfc9"], // sage morning
  ["#c98d6b", "#eabf97"], // sunset mat
  ["#8fa5b5", "#cfdae0"], // sea sky
  ["#b5a08f", "#ded2c2"], // studio stone
];

function coverIndex(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % COVERS.length;
}

export function CoverArt({
  seed,
  className = "",
}: {
  seed: string;
  className?: string;
}) {
  const [from, to] = COVERS[coverIndex(seed)];
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute -bottom-6 -right-6 h-40 w-40 rotate-12"
      >
        <path d="M20 4c-8 0-14 4-15 12 4 1 8 1 11-2s4-7 4-10z" />
        <path d="M5 16c3-4 7-7 11-8" />
      </svg>
    </div>
  );
}

export function ProductCard({
  product,
  priceLabel,
}: {
  product: Product;
  priceLabel: string;
}) {
  return (
    <Link
      href={`/product/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-ink/5 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <CoverArt seed={`${product.category}-${product.title}`} className="h-44 w-full" />
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div>
          <Chip>{product.category ?? "Resource"}</Chip>
        </div>
        <h3 className="font-display text-lg font-bold leading-snug group-hover:text-sage-600">
          {product.title}
        </h3>
        <Stars />
        <div className="mt-auto flex items-center justify-between border-t border-ink/5 pt-3">
          <span className="font-display text-xl font-bold">{priceLabel}</span>
          <span className="text-sm font-semibold lowercase text-sage-600">
            view details →
          </span>
        </div>
      </div>
    </Link>
  );
}

/* Stat tile: label sentence-case, value semibold sans, proportional figures. */
export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-ink/5 bg-white p-5 shadow-sm">
      <div className="text-sm lowercase text-fog">{label}</div>
      <div className="mt-1 text-3xl font-semibold">{value}</div>
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-10 text-center text-fog">
      {children}
    </div>
  );
}
