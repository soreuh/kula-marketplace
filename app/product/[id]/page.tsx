import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buyerTotalCents, feeCents, formatUsd } from "@/lib/fees";
import type { PlatformSettings, Product } from "@/lib/types";
import { Chip, CoverArt, Stars } from "@/components/ui";
import BuyButton from "./buy-button";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: product }, { data: settings }, { data: auth }] =
    await Promise.all([
      supabase.from("products").select("*").eq("id", id).single(),
      supabase.from("platform_settings").select("*").single(),
      supabase.auth.getUser(),
    ]);

  if (!product) notFound();
  const p = product as Product;
  const s = settings as PlatformSettings | null;
  const total = s ? buyerTotalCents(p.price_cents, s) : p.price_cents;

  let alreadyOwned = false;
  if (auth.user) {
    const { data: order } = await supabase
      .from("orders")
      .select("id")
      .eq("buyer_id", auth.user.id)
      .eq("product_id", p.id)
      .eq("status", "paid")
      .maybeSingle();
    alreadyOwned = !!order;
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* left: art + description */}
        <div>
          <CoverArt
            seed={`${p.category}-${p.title}`}
            className="h-72 w-full rounded-2xl sm:h-96"
          />
          <div className="mt-6">
            <Chip>{p.category ?? "Resource"}</Chip>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight">
              {p.title}
            </h1>
            <div className="mt-2">
              <Stars />
            </div>
            <p className="mt-4 whitespace-pre-wrap text-fog">{p.description}</p>
          </div>

          {/* reviews (system coming later — honest empty state, like the original) */}
          <div className="mt-10">
            <h2 className="mb-3 font-display text-2xl font-bold lowercase">
              reviews
            </h2>
            <div className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-8 text-center">
              <div className="flex justify-center">
                <Stars />
              </div>
              <p className="mt-2 font-display font-semibold lowercase">
                no reviews yet
              </p>
              <p className="text-sm text-fog">
                be the first to review after purchasing.
              </p>
            </div>
          </div>
        </div>

        {/* right: price card */}
        <div className="h-fit rounded-2xl border border-ink/5 bg-white p-6 shadow-sm lg:sticky lg:top-24">
          <div className="flex items-baseline justify-between">
            <span className="lowercase text-fog">price</span>
            <span className="font-display text-4xl font-bold">
              {formatUsd(total)}
            </span>
          </div>
          <p className="mt-1 text-right text-sm text-fog">
            one-time payment. lifetime access.
          </p>
          {s && (
            <div className="mt-4 space-y-1 border-t border-ink/5 pt-4 text-sm text-fog">
              <div className="flex justify-between">
                <span>instructor&apos;s price</span>
                <span>{formatUsd(p.price_cents)}</span>
              </div>
              <div className="flex justify-between">
                <span>platform fee</span>
                <span>{formatUsd(feeCents(p.price_cents, s))}</span>
              </div>
            </div>
          )}

          <div className="mt-6">
            {p.status !== "active" ? (
              <p className="rounded-xl bg-mist p-4 text-center text-sm text-fog">
                this listing is not currently available.
              </p>
            ) : alreadyOwned ? (
              <a
                href={`/api/download/${p.id}`}
                className="flex w-full items-center justify-center rounded-full bg-sage-500 px-6 py-3.5 font-display font-semibold lowercase text-white hover:bg-sage-600"
              >
                you own this — download
              </a>
            ) : (
              <BuyButton
                productId={p.id}
                loggedIn={!!auth.user}
                totalLabel={formatUsd(total)}
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
