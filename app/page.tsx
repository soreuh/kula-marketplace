import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatUsd } from "@/lib/fees";
import type { Product } from "@/lib/types";
import { ProductCard, btnPrimary, btnOutline, EmptyState } from "@/components/ui";
import WaitlistForm from "@/components/waitlist-form";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: products }, { data: reviews }] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(3),
    supabase.from("reviews").select("product_id, rating"),
  ]);

  const featured = (products as Product[] | null) ?? [];
  const ratings: Record<string, { avg: number; count: number }> = {};
  for (const r of (reviews as { product_id: string; rating: number }[] | null) ?? []) {
    const e = (ratings[r.product_id] ??= { avg: 0, count: 0 });
    e.avg += r.rating;
    e.count += 1;
  }
  for (const k of Object.keys(ratings)) ratings[k].avg /= ratings[k].count;

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

      {/* ── featured content ── */}
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
                priceLabel={formatUsd(p.price_cents)}
                rating={ratings[p.id]?.avg ?? null}
                reviewCount={ratings[p.id]?.count ?? 0}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── how it works ── */}
      <section className="bg-mist/60 px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center font-display text-3xl font-bold lowercase">
            how it works
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-2">
            <div>
              <h3 className="mb-4 text-center font-display text-lg font-bold lowercase text-sage-700">
                for buyers
              </h3>
              <div className="flex flex-col gap-4">
                <StepCard
                  n={1}
                  title="browse"
                  body="find what you actually want to offer for a future class, not a generic results page."
                />
                <StepCard
                  n={2}
                  title="buy"
                  body={'pay once. it’s yours. no subscription, no login hoops, no "limited time access."'}
                />
                <StepCard
                  n={3}
                  title="teach"
                  body="download instantly and use it tomorrow — or adapt it until it sounds like you."
                />
              </div>
            </div>
            <div>
              <h3 className="mb-4 text-center font-display text-lg font-bold lowercase text-sage-700">
                for sellers
              </h3>
              <div className="flex flex-col gap-4">
                <StepCard
                  n={1}
                  title="upload"
                  body="post the sequence, workshop, or meditation you've already built. set your own price."
                />
                <StepCard
                  n={2}
                  title="get discovered"
                  body="teachers searching by style, level, and teachability find your work."
                />
                <StepCard
                  n={3}
                  title="get paid"
                  body="every sale pays your net straight to your bank via stripe, monthly. it earns while you sleep."
                />
              </div>
            </div>
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

function StepCard({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage-100 font-display font-bold text-sage-700">
        {n}
      </span>
      <div>
        <h4 className="font-display text-lg font-bold lowercase">{title}</h4>
        <p className="mt-0.5 text-fog">{body}</p>
      </div>
    </div>
  );
}
