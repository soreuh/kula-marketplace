import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchProductRatings } from "@/lib/ratings";
import { priceLabel } from "@/lib/fees";
import type { Product } from "@/lib/types";
import { ProductCard, btnPrimary, btnOutline, EmptyState } from "@/components/ui";
import WaitlistForm from "@/components/waitlist-form";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: products }, { data: freeProducts }, ratings] =
    await Promise.all([
      // featured shelf: admin picks first (featured_at, newest pick first),
      // then the transparent score fills remaining slots — see the
      // featured_products view (migration 013). Scope: paid listings, PLUS
      // anything the admin starred regardless of price — ★ always features.
      // Unstarred freebies never score their way in; they have their own
      // shelf below (which skips already-featured items so nothing shows
      // twice).
      supabase
        .from("featured_products")
        .select("*")
        .or("price_cents.gt.0,featured_at.not.is.null")
        .order("featured_at", { ascending: false, nullsFirst: false })
        .order("featured_score", { ascending: false })
        .limit(3),
      // over-fetch: some of these may already sit on the featured shelf
      supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .eq("price_cents", 0)
        .order("created_at", { ascending: false })
        .limit(6),
      fetchProductRatings(supabase),
    ]);

  const featured = (products as Product[] | null) ?? [];
  const featuredIds = new Set(featured.map((p) => p.id));
  // a starred freebie lives on the featured shelf — don't render it twice
  const freebies = ((freeProducts as Product[] | null) ?? [])
    .filter((p) => !featuredIds.has(p.id))
    .slice(0, 3);
  return (
    <div>
      {/* ── hero ── */}
      <section className="bg-mist/60 px-5 pb-20 pt-16 text-center sm:pt-24">
        <h1 className="mx-auto max-w-3xl font-display text-5xl font-bold lowercase leading-[1.05] tracking-tight sm:text-6xl">
          buy and sell yoga sequences, class plans, workshops, guided
          meditations, <span className="text-sage-500">and more</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-fog">
          built for the work you&apos;re already doing— buy what you need to
          support your teaching. sell what you&apos;ve already created.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/explore" className={btnPrimary}>
            explore content <span aria-hidden>→</span>
          </Link>
          <Link href="/signup" className={btnOutline}>
            start selling
          </Link>
        </div>

        {/* waitlist */}
        <div className="mx-auto mt-12 max-w-md rounded-2xl bg-white p-6 text-left shadow-sm">
          <div className="flex items-center gap-2 font-display font-bold lowercase">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-sage-600)" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <circle cx="9" cy="8" r="3.2" />
              <path d="M3.5 19c1-2.8 3-4.2 5.5-4.2s4.5 1.4 5.5 4.2" />
              <circle cx="17" cy="9" r="2.6" />
              <path d="M15.5 14.6c2.3.1 4 1.4 4.9 3.9" />
            </svg>
            stay in the loop
          </div>
          <p className="mb-3 mt-1 text-sm text-fog">
            get notified about new content, features, and updates from kula.
          </p>
          <WaitlistForm />
        </div>
      </section>

      {/* ── featured content (hidden while only freebies exist) ── */}
      {(featured.length > 0 || freebies.length === 0) && (
        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-bold lowercase">
                featured content
              </h2>
              <p className="mt-1 text-fog">
                handcrafted by instructors, ready to teach from.
              </p>
            </div>
            <Link href="/explore" className={btnOutline + " !px-5 !py-2 text-sm"}>
              browse all content <span aria-hidden>→</span>
            </Link>
          </div>

          {!featured.length ? (
            <EmptyState>
              no listings yet — instructors, this stage is yours.
            </EmptyState>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((p) => (
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
        </section>
      )}

      {/* ── start with something free (self-hiding until freebies exist) ── */}
      {freebies.length > 0 && (
        <section className="bg-sage-50/70 px-5 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-bold lowercase">
                  start with something free
                </h2>
                <p className="mt-1 text-fog">
                  full resources, on the house — download one, teach from it,
                  see how kula feels. no card needed, just an account.
                </p>
              </div>
              <Link href="/explore" className={btnOutline + " !px-5 !py-2 text-sm"}>
                see everything <span aria-hidden>→</span>
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {freebies.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  priceLabel={priceLabel(p.price_cents)}
                  rating={ratings[p.id]?.avg ?? null}
                  reviewCount={ratings[p.id]?.count ?? 0}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── how it works — one merged flow, no buyer/seller split ── */}
      <section className="bg-mist/60 px-5 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-display text-3xl font-bold lowercase">
            how it works
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <HowCard
              title="browse"
              body="find what you actually want to offer for a future class, not a generic results page."
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4-4" />
                </svg>
              }
            />
            <HowCard
              title="buy"
              body={'pay once. it’s yours. no subscription, no login hoops, no "limited time access."'}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M6 7h12l1.2 13H4.8L6 7z" />
                  <path d="M9 10V6a3 3 0 0 1 6 0v4" />
                </svg>
              }
            />
            <HowCard
              title="teach"
              body="download instantly and use it tomorrow — or adapt it until it sounds like you. then sell your own."
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 8 12 3 3 8l9 5z" />
                  <path d="M3 8v8l9 5 9-5V8" />
                  <path d="M12 13v8" />
                </svg>
              }
            />
          </div>
        </div>
      </section>

      {/* ── sell pitch ── */}
      <section className="px-5 py-20 text-center">
        <h2 className="font-display text-4xl font-bold lowercase leading-tight">
          you already wrote it.
          <br />
          <span className="text-sage-500">it already meant something.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-fog">
          that sequence from last tuesday. the workshop you only ran once. the
          meditation script that had students lingering after class just to tell
          you how much they needed it that day.
        </p>
        <p className="mx-auto mt-4 max-w-2xl font-semibold">
          put it on kula. set your price. get paid every time someone downloads
          it.
        </p>
        <div className="mt-8">
          <Link href="/signup" className={btnPrimary}>
            start selling <span aria-hidden>→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}

function HowCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-sage-100 text-sage-600">
        {icon}
      </span>
      <h4 className="mt-3 font-display text-lg font-bold lowercase">{title}</h4>
      <p className="mt-1 text-fog">{body}</p>
    </div>
  );
}
