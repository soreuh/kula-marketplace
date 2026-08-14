import Link from "next/link";
import type { Instructor, Product } from "@/lib/types";
import { coverUrl } from "@/lib/covers";
import { placeholderCover } from "@/lib/cover-placeholders";
import { teachabilityLabel } from "@/lib/categories";

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

export function TeachabilityBadge({ value }: { value: string | null }) {
  const label = teachabilityLabel(value);
  if (!label) return null;
  const tone =
    value === "ready"
      ? "bg-sage-100 text-sage-700"
      : value === "adapt"
        ? "bg-amber-100 text-amber-800"
        : "bg-mist text-fog";
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
      {label}
    </span>
  );
}

/** Star rating row. rating=null/count=0 renders empty stars + "New". */
export function Stars({
  rating = null,
  count = 0,
  showCount = true,
}: {
  rating?: number | null;
  count?: number;
  showCount?: boolean;
}) {
  const filled = rating ? Math.round(rating) : 0;
  return (
    <span className="flex items-center gap-1 text-fog" aria-label={rating ? `${rating.toFixed(1)} stars` : "No reviews yet"}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={i < filled ? "var(--color-sage-500)" : "none"}
          stroke={i < filled ? "var(--color-sage-500)" : "currentColor"}
          strokeWidth="1.6"
          aria-hidden
        >
          <path d="M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6-5.4-2.9L6.6 19.7l1.1-6L3.2 9.4l6.1-.8z" />
        </svg>
      ))}
      {showCount && (
        <span className="ml-1 text-sm">
          {count > 0 ? `${rating?.toFixed(1)} (${count})` : "New"}
        </span>
      )}
    </span>
  );
}

/* Deterministic soft-gradient cover art (fallback when no cover image). */
const COVERS: [string, string][] = [
  ["#d8a47f", "#ecd0ab"],
  ["#9db5a0", "#d3dfc9"],
  ["#c98d6b", "#eabf97"],
  ["#8fa5b5", "#cfdae0"],
  ["#b5a08f", "#ded2c2"],
];

function coverIndex(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % COVERS.length;
}

export function CoverArt({
  seed,
  imagePath = null,
  className = "",
}: {
  seed: string;
  imagePath?: string | null;
  className?: string;
}) {
  const url = coverUrl(imagePath);
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className={`object-cover ${className}`} />
    );
  }
  // no seller cover → a curated placeholder photo, picked by a stable
  // hash of the listing seed (see lib/cover-placeholders.ts)
  const photo = placeholderCover(seed);
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photo} alt="" className={`object-cover ${className}`} />
    );
  }
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

/** The reusable listing tile used everywhere (spec: Product Card). */
export function ProductCard({
  product,
  priceLabel,
  rating = null,
  reviewCount = 0,
  ownedHref,
}: {
  product: Product;
  priceLabel: string;
  rating?: number | null;
  reviewCount?: number;
  /** when set, renders a Download action instead of price/details */
  ownedHref?: string;
}) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-ink/5 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <CoverArt
        seed={`${product.category}-${product.title}`}
        imagePath={product.cover_path}
        className="h-44 w-full"
      />
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex flex-wrap gap-1.5">
          <Chip>{product.category ?? "Resource"}</Chip>
          <TeachabilityBadge value={product.teachability} />
        </div>
        <h3 className="font-display text-lg font-bold leading-snug group-hover:text-sage-600">
          {product.title}
        </h3>
        <Stars rating={rating} count={reviewCount} />
        <div className="mt-auto flex items-center justify-between border-t border-ink/5 pt-3">
          {ownedHref ? (
            <>
              <span className="text-sm font-semibold text-sage-700">owned</span>
              <span className="rounded-full bg-sage-500 px-4 py-1.5 text-sm font-display font-semibold lowercase text-white">
                download
              </span>
            </>
          ) : (
            <>
              <span className="font-display text-xl font-bold">{priceLabel}</span>
              <span className="text-sm font-semibold lowercase text-sage-600">
                view details →
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

/** Initials avatar for instructor profiles. */
export function Avatar({
  name,
  size = 48,
  imagePath = null,
}: {
  name: string;
  size?: number;
  /** covers-bucket path of an uploaded profile photo; initials otherwise */
  imagePath?: string | null;
}) {
  const url = coverUrl(imagePath);
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-sage-500 font-display font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials || "K"}
    </span>
  );
}

/** Seller mini-profile card shown on listing detail pages. */
export function InstructorCard({ instructor }: { instructor: Instructor }) {
  const name = instructor.shop_name || instructor.display_name || "kula instructor";
  return (
    <Link
      href={`/profile/${instructor.id}`}
      className="flex items-start gap-4 rounded-2xl border border-ink/5 bg-white p-5 shadow-sm transition hover:shadow-md"
    >
      <Avatar name={name} imagePath={instructor.avatar_path} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display font-bold">{name}</span>
          {instructor.stripe_charges_enabled && <VerifiedBadge />}
        </div>
        {instructor.specialisations.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {instructor.specialisations.slice(0, 4).map((s) => (
              <span
                key={s}
                className="rounded-full bg-mist px-2.5 py-0.5 text-xs text-ink/70"
              >
                {s}
              </span>
            ))}
          </div>
        )}
        {instructor.bio && (
          <p className="mt-2 line-clamp-2 text-sm text-fog">{instructor.bio}</p>
        )}
        <span className="mt-2 inline-block text-sm font-semibold lowercase text-sage-600">
          view profile →
        </span>
      </div>
    </Link>
  );
}

export function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sage-100 px-2.5 py-0.5 text-xs font-semibold text-sage-700">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20 6 9 17l-5-5" />
      </svg>
      Stripe Verified
    </span>
  );
}

/** Stat tile: sentence-case label, semibold sans value, optional dim note. */
export function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-ink/5 bg-white p-5 shadow-sm">
      <div className="text-sm lowercase text-fog">{label}</div>
      <div className="mt-1 text-3xl font-semibold">{value}</div>
      {sub && <div className="mt-1 text-xs text-fog">{sub}</div>}
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
