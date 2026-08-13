import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buyerTotalCents, formatUsd } from "@/lib/fees";
import type { PlatformSettings, Product } from "@/lib/types";
import { ProductCard, btnPrimary, btnOutline, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: products }, { data: settings }] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(3),
    supabase.from("platform_settings").select("*").single(),
  ]);

  const s = settings as PlatformSettings | null;
  const featured = (products as Product[] | null) ?? [];

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
                priceLabel={s ? formatUsd(buyerTotalCents(p.price_cents, s)) : "—"}
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
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <HowCard
              title="browse"
              body="find what you actually want to offer for a future class, not a generic results page."
              icon={
                <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v15H6.5A2.5 2.5 0 0 0 4 20.5zM20 5.5A2.5 2.5 0 0 0 17.5 3H12v15h5.5a2.5 2.5 0 0 1 2.5 2.5z" />
              }
            />
            <HowCard
              title="buy"
              body={'pay once. it’s yours. no subscription, no login hoops, no "limited time access."'}
              icon={
                <>
                  <path d="M12 2v20" />
                  <path d="M17 6.5C17 4.6 14.8 3.5 12 3.5S7 4.6 7 6.5 9 9.5 12 9.5s5 1.1 5 3-2.2 3-5 3-5-1.1-5-3" />
                </>
              }
            />
            <HowCard
              title="teach"
              body="use it tomorrow. or upload the workshop you developed last year and let it earn while you sleep."
              icon={<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H13z" />}
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
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white p-7 shadow-sm">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-100 text-sage-600">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {icon}
        </svg>
      </span>
      <h3 className="mt-5 font-display text-xl font-bold lowercase">{title}</h3>
      <p className="mt-2 text-fog">{body}</p>
    </div>
  );
}
