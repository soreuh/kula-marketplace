import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InstructorRating from "@/components/instructor-rating";
import { formatUsd, priceLabel } from "@/lib/fees";
import { durationLabel } from "@/lib/categories";
import { coverUrl } from "@/lib/covers";
import type { Instructor, Product, Review } from "@/lib/types";
import {
  Chip,
  CoverArt,
  InstructorCard,
  Stars,
  TeachabilityBadge,
} from "@/components/ui";
import BuyButton from "./buy-button";
import ReviewForm from "./review-form";
import ReviewReply from "./review-reply";
import ViewPing from "./view-ping";

export const dynamic = "force-dynamic";

/** ~155-char excerpt of the SELLER'S OWN description — house SEO rule:
 *  search engines only ever see words a human wrote for this site. */
function excerpt(text: string | null): string | undefined {
  if (!text) return undefined;
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 155 ? clean.slice(0, 152).trimEnd() + "…" : clean;
}

/** "PDF · 12 pages · 2.1 MB" from whatever exists — type derives from
 *  file_path's extension (works on pre-024 rows too), pages/bytes are the
 *  auto-captured 024 columns. Missing parts simply drop out; empty string
 *  when nothing is known, and the callers render nothing. */
function fileMetaLabel(p: Product): string {
  const ext = p.file_path?.split(".").pop()?.toUpperCase();
  const parts: string[] = [];
  if (ext && ext.length <= 4) parts.push(ext);
  if (p.file_pages)
    parts.push(`${p.file_pages} page${p.file_pages === 1 ? "" : "s"}`);
  if (p.file_bytes)
    parts.push(
      p.file_bytes >= 1048576
        ? `${(p.file_bytes / 1048576).toFixed(1)} MB`
        : `${Math.max(1, Math.round(p.file_bytes / 1024))} KB`
    );
  return parts.join(" · ");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  // Same RLS-scoped read the page itself does: anon sees active listings
  // only, so drafts/archived can never leak metadata.
  const { data: p } = await supabase
    .from("products")
    .select("title, description, cover_path")
    .eq("id", id)
    .maybeSingle();
  if (!p) return {};
  const cover = coverUrl(p.cover_path);
  return {
    title: p.title,
    description: excerpt(p.description),
    alternates: { canonical: `/products/${id}` },
    // Next REPLACES the root openGraph when a page defines one — siteName
    // and type must be restated here or link cards lose the site name.
    openGraph: {
      siteName: "kula",
      type: "website",
      title: `${p.title} — kula`,
      description: excerpt(p.description),
      images: [{ url: cover ?? "/og.png" }],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: product }, { data: auth }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).single(),
    supabase.auth.getUser(),
  ]);

  if (!product) notFound();
  const p = product as Product;
  const user = auth.user;
  const isSeller = !!user && p.seller_id === user.id;

  const [{ data: instructor }, { data: reviews }, ownedRes] = await Promise.all([
    supabase.from("instructors").select("*").eq("id", p.seller_id).maybeSingle(),
    supabase
      .from("reviews")
      .select("*")
      .eq("product_id", p.id)
      .order("created_at", { ascending: false }),
    user && !isSeller
      ? supabase
          .from("orders")
          .select("id")
          .eq("buyer_id", user.id)
          .eq("product_id", p.id)
          .eq("status", "paid")
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const alreadyOwned = !!ownedRes.data;
  const reviewList = (reviews as Review[] | null) ?? [];
  const avg =
    reviewList.length > 0
      ? reviewList.reduce((s, r) => s + r.rating, 0) / reviewList.length
      : null;
  const alreadyReviewed =
    !!user && reviewList.some((r) => r.buyer_id === user.id);
  const previewUrl = coverUrl(p.preview_path);

  // Product structured data — publishes only what the page already shows:
  // title, the seller's description, real price, real review average.
  // aggregateRating only when reviews exist (fabricating one is exactly the
  // kind of thing the no-stuffing rule forbids).
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    ...(p.description ? { description: p.description } : {}),
    ...(coverUrl(p.cover_path) ? { image: coverUrl(p.cover_path) } : {}),
    offers: {
      "@type": "Offer",
      price: (p.price_cents / 100).toFixed(2),
      priceCurrency: "USD",
      availability:
        p.status === "active"
          ? "https://schema.org/InStock"
          : "https://schema.org/Discontinued",
    },
    ...(avg !== null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: avg.toFixed(1),
            reviewCount: reviewList.length,
          },
        }
      : {}),
  };

  const fileMeta = fileMetaLabel(p);
  const meta: [string, string | null][] = [
    // "what you get" leads — the space's norm (TpT/Etsy/Gumroad all
    // disclose format + length + size before purchase)
    ["file", fileMeta || null],
    ["duration", durationLabel(p.duration_minutes)],
    ["level", p.level],
    ["props needed", p.props],
    ["theme", p.theme],
    ["target audience", p.target_audience],
    ["peak pose", p.peak_pose],
    ["anatomy focus", p.anatomy_focus],
  ];
  const metaRows = meta.filter(([, v]) => v);

  return (
    <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c"),
      }}
    />
    <div className="mx-auto max-w-6xl px-5 py-10">
      <ViewPing productId={p.id} />
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* ── left: art, description, metadata, seller, reviews ── */}
        <div>
          <CoverArt
            seed={`${p.category}-${p.title}`}
            imagePath={p.cover_path}
            alt={p.title}
            className="h-72 w-full rounded-2xl sm:h-96"
          />
          <div className="mt-6">
            <div className="flex flex-wrap gap-1.5">
              <Chip>{p.category ?? "Resource"}</Chip>
              {p.content_type && <Chip>{p.content_type}</Chip>}
              {p.level && <Chip>{p.level}</Chip>}
              <TeachabilityBadge value={p.teachability} />
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight">
              {p.title}
            </h1>
            <div className="mt-2">
              <Stars rating={avg} count={reviewList.length} />
            </div>
            <p className="mt-4 whitespace-pre-wrap text-fog">{p.description}</p>
          </div>

          {metaRows.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-ink/5 bg-white text-sm shadow-sm">
              {metaRows.map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between gap-6 border-b border-ink/5 px-4 py-2.5 last:border-0"
                >
                  <span className="lowercase text-fog">{k}</span>
                  <span className="text-right font-medium">{v}</span>
                </div>
              ))}
            </div>
          )}

          {(p.usage_notes || p.sequence_breakdown) && (
            <div className="mt-6 flex flex-col gap-3">
              {p.usage_notes && (
                <details className="rounded-2xl border border-ink/5 bg-white p-4 shadow-sm">
                  <summary className="cursor-pointer font-display font-semibold lowercase">
                    usage notes
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-fog">
                    {p.usage_notes}
                  </p>
                </details>
              )}
              {p.sequence_breakdown && (
                <details className="rounded-2xl border border-ink/5 bg-white p-4 shadow-sm">
                  <summary className="cursor-pointer font-display font-semibold lowercase">
                    sequence breakdown
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-fog">
                    {p.sequence_breakdown}
                  </p>
                </details>
              )}
            </div>
          )}

          {/* Blurred preview — hidden once you own it. A teaser exists to sell
              the file; showing a deliberately degraded page 1 to someone who
              already has the real thing is noise. The SELLER still sees it
              (isSeller isn't excluded) so they can check how their own preview
              renders. */}
          {previewUrl && !alreadyOwned && (
            <div className="mt-8">
              <h2 className="mb-3 font-display text-2xl font-bold lowercase">
                preview
              </h2>
              <div className="relative overflow-hidden rounded-2xl border border-ink/5 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Blurred preview of the first page"
                  className="w-full blur-[2px]"
                />
                <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-white/85 via-transparent p-4">
                  <span className="rounded-full bg-white/90 px-4 py-1.5 text-sm font-semibold text-fog shadow-sm">
                    {p.file_pages
                      ? `page 1 of ${p.file_pages} — full file unlocks after purchase`
                      : "full file unlocks after purchase"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* seller mini-profile */}
          {instructor && (
            <div className="mt-8">
              <h2 className="mb-3 font-display text-2xl font-bold lowercase">
                about the instructor
              </h2>
              <InstructorCard
                instructor={instructor as Instructor}
                rating={<InstructorRating instructorId={(instructor as Instructor).id} />}
              />
            </div>
          )}

          {/* reviews */}
          <div className="mt-8">
            <h2 className="mb-3 font-display text-2xl font-bold lowercase">
              reviews
            </h2>
            {reviewList.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-8 text-center">
                <div className="flex justify-center">
                  <Stars showCount={false} />
                </div>
                <p className="mt-2 font-display font-semibold lowercase">
                  no reviews yet
                </p>
                <p className="text-sm text-fog">
                  be the first to review after purchasing.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {reviewList.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-2xl border border-ink/5 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        {r.reviewer_name ?? "verified buyer"}
                      </span>
                      <Stars rating={r.rating} count={1} showCount={false} />
                    </div>
                    {r.body && (
                      <p className="mt-1.5 text-sm text-fog">{r.body}</p>
                    )}
                    {r.reply && (
                      <div className="mt-2.5 rounded-xl bg-sage-50 p-3">
                        <p className="text-xs font-semibold lowercase text-sage-700">
                          response from the teacher
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-fog">
                          {r.reply}
                        </p>
                      </div>
                    )}
                    {isSeller && (
                      <ReviewReply reviewId={r.id} initial={r.reply} />
                    )}
                  </li>
                ))}
              </ul>
            )}
            {alreadyOwned && !alreadyReviewed && (
              <ReviewForm productId={p.id} />
            )}
          </div>
        </div>

        {/* ── right: price card ── */}
        <div className="h-fit rounded-2xl border border-ink/5 bg-white p-6 shadow-sm lg:sticky lg:top-24">
          <div className="flex items-baseline justify-between">
            <span className="lowercase text-fog">price</span>
            <span className="font-display text-4xl font-bold">
              {priceLabel(p.price_cents)}
            </span>
          </div>
          <p className="mt-1 text-right text-sm text-fog">
            {p.price_cents === 0
              ? "a gift from the teacher. lifetime access."
              : "one-time payment. lifetime access."}
          </p>
          {/* Etsy-pattern disclosure at the decision point: what exactly the
              money buys, right where the buy decision happens. */}
          {fileMeta && (
            <p className="mt-0.5 text-right text-xs text-fog">
              instant download · {fileMeta.toLowerCase()}
            </p>
          )}
          {/* Note: no fee breakdown here on purpose — commission is between
              kula and the seller (and partner rates are private). */}

          <div className="mt-6">
            {/* Order matters: ownership is checked BEFORE availability.
                "not currently available" used to come first, so a buyer who
                already owned a draft/archived/suspended listing was told their
                own purchase was unavailable and lost the download button on
                this page (the library still worked, and /api/download only
                ever checks for a paid order — so the page was simply lying).
                Access is permanent; only the ability to BUY goes away. */}
            {isSeller ? (
              <div className="flex flex-col gap-2">
                <p className="rounded-xl bg-sage-50 p-3 text-center text-sm text-sage-700">
                  you own this — it&apos;s your listing.
                </p>
                <a
                  href={`/api/download/${p.id}`}
                  className="flex w-full items-center justify-center rounded-full border border-ink/15 px-6 py-3 font-display font-semibold lowercase hover:border-ink/40"
                >
                  download your file
                </a>
              </div>
            ) : alreadyOwned ? (  // owns it — status is irrelevant
              <div className="flex flex-col gap-2">
                <p className="rounded-xl bg-sage-50 p-3 text-center text-sm text-sage-700">
                  you&apos;ve purchased this.
                </p>
                <a
                  href={`/api/download/${p.id}`}
                  className="flex w-full items-center justify-center rounded-full bg-sage-500 px-6 py-3.5 font-display font-semibold lowercase text-white hover:bg-sage-600"
                >
                  download
                </a>
              </div>
            ) : p.status !== "active" ? (
              // Doesn't own it and it isn't live — no buy button. (Mostly
              // unreachable: RLS hides non-active rows from anyone who isn't
              // the seller, an admin, or a prior buyer, so this is the admin
              // view. Kept so the UI can never offer an unbuyable listing.)
              <p className="rounded-xl bg-mist p-4 text-center text-sm text-fog">
                this listing is not currently available.
              </p>
            ) : (
              <BuyButton
                productId={p.id}
                loggedIn={!!user}
                totalLabel={formatUsd(p.price_cents)}
                free={p.price_cents === 0}
              />
            )}
          </div>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-fog">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            Secure payment via Stripe
          </p>
        </div>
      </div>
    </div>
    </>
  );
}
