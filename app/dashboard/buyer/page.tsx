import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatUsd } from "@/lib/fees";
import { StatusChip, btnPrimary } from "@/components/ui";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

type OrderWithProduct = Order & {
  products: { title: string; category: string | null } | null;
};

export default async function BuyerDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: orders } = await supabase
    .from("orders")
    .select("*, products(title, category)")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  const list = (orders as OrderWithProduct[] | null) ?? [];

  return (
    <div>
      <section className="bg-mist/60 px-5 py-10">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-display text-4xl font-bold lowercase">
            your library
          </h1>
          <p className="mt-1 text-fog">
            everything you&apos;ve purchased — yours forever, download any time.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-5 py-8">
        {!list.length ? (
          <div className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-12 text-center">
            <h3 className="font-display text-2xl font-bold lowercase">
              nothing here yet
            </h3>
            <p className="mt-1 text-fog">
              find something worth teaching tomorrow.
            </p>
            <Link href="/explore" className={btnPrimary + " mt-5"}>
              explore content <span aria-hidden>→</span>
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {list.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink/5 bg-white p-4 text-sm shadow-sm"
              >
                <StatusChip status={o.status} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display font-semibold">
                    {o.products?.title ?? "(listing removed)"}
                  </div>
                  <div className="text-fog">
                    {formatUsd(o.amount_cents)} ·{" "}
                    {new Date(o.created_at).toLocaleDateString()}
                  </div>
                </div>
                {o.status === "paid" && (
                  <a
                    href={`/api/download/${o.product_id}`}
                    className="rounded-full bg-sage-500 px-5 py-2 font-display font-semibold lowercase text-white hover:bg-sage-600"
                  >
                    download
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
