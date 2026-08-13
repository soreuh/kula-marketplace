import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatUsd } from "@/lib/fees";
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
import ViewPing from "./view-ping";

export const dynamic = "force-dynamic";

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

  const meta: [string, string | null][] = [
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
    <div className="mx-auto max-w-6xl px-5 py-10">
      <ViewPing productId={p.id} />
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* ── left: art, description, metadata, seller, reviews ── */}
        <div>
          <CoverArt
            seed={`${p.category}-${p.title}`}
            imagePath={p.cover_path}
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

          {/* blurred preview */}
          {previewUrl && (
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
                    full file unlocks after purchase
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
              <InstructorCard instructor={instructor as Instructor} />
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
              {formatUsd(p.price_cents)}
            </span>
          </div>
          <p className="mt-1 text-right text-sm text-fog">
            one-time payment. lifetime access.
          </p>
          {/* Note: no fee breakdown here on purpose — commission is between
              kula and the seller (and partner rates are private). */}

          <div className="mt-6">
            {p.status !== "active" && !isSeller ? (
              <p className="rounded-xl bg-mist p-4 text-center text-sm text-fog">
                this listing is not currently available.
              </p>
            ) : isSeller ? (
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
            ) : alreadyOwned ? (
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
            ) : (
              <BuyButton
                productId={p.id}
                loggedIn={!!user}
                totalLabel={formatUsd(p.price_cents)}
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
  );
}
