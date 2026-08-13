import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatUsd } from "@/lib/fees";
import type { Instructor, Product } from "@/lib/types";
import {
  Avatar,
  EmptyState,
  ProductCard,
  VerifiedBadge,
  btnSmallOutline,
} from "@/components/ui";
import ProfileEdit from "./profile-edit";

export const dynamic = "force-dynamic";

export default async function InstructorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: instructor }, { data: products }, { data: auth }, { data: reviews }] =
    await Promise.all([
      supabase.from("instructors").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("products")
        .select("*")
        .eq("seller_id", id)
        .eq("status", "active")
        .order("created_at", { ascending: false }),
      supabase.auth.getUser(),
      supabase.from("reviews").select("product_id, rating"),
    ]);

  if (!instructor) notFound();
  const inst = instructor as Instructor;
  const listings = (products as Product[] | null) ?? [];
  const isOwner = auth.user?.id === inst.id;
  const name = inst.shop_name || inst.display_name || "kula instructor";

  const ratings: Record<string, { avg: number; count: number }> = {};
  for (const r of (reviews as { product_id: string; rating: number }[] | null) ?? []) {
    const e = (ratings[r.product_id] ??= { avg: 0, count: 0 });
    e.avg += r.rating;
    e.count += 1;
  }
  for (const k of Object.keys(ratings)) ratings[k].avg /= ratings[k].count;

  return (
    <div>
      <section className="bg-mist/60 px-5 py-12">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-5 sm:flex-row sm:items-center">
          <Avatar name={name} size={76} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-3xl font-bold">{name}</h1>
              {inst.stripe_charges_enabled && <VerifiedBadge />}
            </div>
            <p className="mt-1 text-sm text-fog">
              {listings.length} published listing{listings.length === 1 ? "" : "s"}
              {inst.specialisations.length > 0 &&
                ` · ${inst.specialisations.length} specialisation${inst.specialisations.length === 1 ? "" : "s"}`}
            </p>
            {inst.specialisations.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {inst.specialisations.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink/70"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
            {inst.bio && <p className="mt-3 max-w-2xl text-fog">{inst.bio}</p>}
          </div>
          {isOwner && (
            <Link href="/dashboard" className={btnSmallOutline}>
              + add content
            </Link>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5 py-8">
        {isOwner && (
          <ProfileEdit
            initial={{
              shop_name: inst.shop_name ?? "",
              bio: inst.bio ?? "",
              specialisations: inst.specialisations,
            }}
          />
        )}

        <h2 className="mb-4 mt-6 font-display text-2xl font-bold lowercase">
          published content
        </h2>
        {!listings.length ? (
          <EmptyState>
            nothing published yet
            {isOwner ? " — your first listing is waiting in the dashboard." : "."}
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((p) => (
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
  );
}
