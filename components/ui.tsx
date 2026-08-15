import Link from "next/link";
import type { Instructor, Product } from "@/lib/types";
import { coverUrl } from "@/lib/covers";
import { placeholderCover } from "@/lib/cover-placeholders";
import { teachabilityLabel } from "@/lib/categories";

/* Shared presentational pieces — server-safe (no hooks). */

/**
 * The kula mark — क, the Devanagari letter "ka": the first letter of कुल
 * (kula), Sanskrit for family / community / clan. Chosen over the usual ॐ
 * because it IS the brand name rather than generic wellness iconography.
 *
 * The glyph is a traced OUTLINE (Noto Sans Devanagari 600, converted to a
 * path), not live text — so it renders identically everywhere and needs no
 * Devanagari font on the visitor's machine. Don't "simplify" this by
 * swapping in a <text> element; most systems would fall back to tofu.
 * The matching favicon is app/icon.svg, inverted for contrast at 16px.
 */
export function KulaMark({ size = 34 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-xl bg-sage-100"
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.72}
        height={size * 0.72}
        viewBox="0 0 64 64"
        fill="var(--color-sage-700)"
        aria-hidden
      >
        <path d="M52 21.53H36.15V29.36Q36.99 28.74 38.11 28.3Q39.61 27.66 41.58 27.66Q45.28 27.66 47.4 29.85Q49.52 32.03 49.52 35.8Q49.52 38.25 48.62 40.6Q47.72 42.95 45.62 45.5L40.64 42.66Q42.1 41.06 42.96 39.43Q43.82 37.8 43.82 35.9Q43.82 34.1 42.98 33.2Q42.15 32.3 40.64 32.3Q39.18 32.3 37.96 33.16Q36.84 34 36.15 35.17V47.17H30.46V40.18Q30.02 40.48 29.58 40.72Q28.32 41.46 26.83 41.85Q25.35 42.24 23.64 42.24Q20.86 42.24 18.66 41.24Q16.45 40.24 15.17 38.3Q13.9 36.38 13.9 33.56Q13.9 29.46 16.63 27.22Q19.36 24.98 24.22 24.98Q25.5 24.98 26.66 25.1Q27.83 25.22 28.9 25.48L28.42 30.14Q27.64 29.96 26.71 29.86Q25.78 29.76 24.82 29.76Q22.32 29.76 20.98 30.78Q19.64 31.8 19.64 33.7Q19.64 35.6 20.86 36.56Q22.08 37.5 23.98 37.5Q26.28 37.5 28.12 36.24Q29.54 35.26 30.46 34.1V21.53H12V16.85H52Z" />
      </svg>
    </span>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <KulaMark />
      <span className="font-display text-xl font-bold lowercase">kula</span>
    </span>
  );
}

/**
 * The centered white card every auth page (login / signup / forgot / reset)
 * wraps itself in. Structural only — pages keep their own headings/content.
 */
export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <div className="rounded-2xl border border-ink/5 bg-white p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}

/**
 * Inline feedback note. tone: "error" (red) for failures, "notice" (amber)
 * for warnings/mixed messages, "success" (sage) for confirmations.
 * className carries the margin (mt-3 etc.) so spacing stays per-page.
 */
export function Note({
  tone = "error",
  className = "",
  children,
}: {
  tone?: "error" | "notice" | "success";
  className?: string;
  children: React.ReactNode;
}) {
  const tones = {
    error: "bg-red-50 text-red-700",
    notice: "bg-amber-50 text-amber-800",
    success: "bg-sage-50 text-sage-700",
  } as const;
  return (
    <p className={`rounded-xl p-3 text-sm ${tones[tone]} ${className}`}>
      {children}
    </p>
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
/** Bare `<input type="file">`s vanish against the page — this gives the
 *  clickable area a visible dashed rim + a styled browse pill (Tailwind
 *  `file:` modifiers). Use on every file input that isn't a full dropzone. */
export const fileInputCls =
  "block w-full cursor-pointer rounded-xl border border-dashed border-ink/20 bg-white p-2.5 text-xs text-fog transition hover:border-sage-400 file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-sage-100 file:px-3.5 file:py-1.5 file:font-display file:text-xs file:font-semibold file:lowercase file:text-sage-700 hover:file:bg-sage-200";

/** The ONLY way to derive a PUBLIC name for an account (030): shop name
 *  first, then display_name — but anything containing "@" is masked to the
 *  fallback, so an email-seeded name (pre-030 rows, or bad data sneaking
 *  back) can never render on a public page. Private contexts (nav greeting,
 *  admin) may keep their own email-based fallbacks. */
export function publicName(p: {
  shop_name?: string | null;
  display_name?: string | null;
}): string {
  const raw = p.shop_name || p.display_name;
  return raw && !raw.includes("@") ? raw : "kula member";
}

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
  alt = "",
}: {
  seed: string;
  imagePath?: string | null;
  className?: string;
  /** Listing covers should pass the title; decorative placeholders stay "". */
  alt?: string;
}) {
  const url = coverUrl(imagePath);
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={alt} className={`object-cover ${className}`} />
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
        alt={product.title}
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
        // ring + mist backdrop: a pale or transparent upload must still
        // read as a button against the white nav (lesson of 2026-08-15 —
        // an uploaded light-background mark rendered invisible)
        className="rounded-full bg-mist object-cover ring-1 ring-ink/10"
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
export function InstructorCard({
  instructor,
  rating,
}: {
  instructor: Instructor;
  /** Optional aggregate-rating slot — pass <InstructorRating instructorId/>.
   *  A slot rather than a fetch so this file stays server-safe AND importable
   *  by client components (dashboard-client pulls Stars/CoverArt from here). */
  rating?: React.ReactNode;
}) {
  const name = publicName(instructor);
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
        {rating && <div className="mt-1.5">{rating}</div>}
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
