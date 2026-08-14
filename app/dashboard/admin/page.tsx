import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatUsd, priceLabel } from "@/lib/fees";
import { StatTile, StatusChip } from "@/components/ui";
import type { Order, PlatformSettings, Product, Profile } from "@/lib/types";
import {
  addProductOption,
  deleteProductOption,
  setCommissionOverride,
  setProductStatus,
  toggleFeatured,
  togglePartner,
  updateFeeSettings,
} from "./actions";
import UsersPanel from "./users-panel";

type OptionRow = { id: string; kind: string; label: string; sort: number };

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") redirect("/dashboard");

  const [{ data: settings }, { data: orders }, { data: products }, { data: users }, { data: optionRows }] =
    await Promise.all([
      supabase.from("platform_settings").select("*").single(),
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("product_options").select("*").order("sort").order("label"),
    ]);

  const s = settings as PlatformSettings;
  const allOrders = (orders as Order[] | null) ?? [];
  const paid = allOrders.filter((o) => o.status === "paid");
  const feeRevenue = paid.reduce((sum, o) => sum + o.fee_cents, 0);
  const grossVolume = paid.reduce((sum, o) => sum + o.amount_cents, 0);
  const inputCls =
    "mt-1 block w-28 rounded-xl border border-ink/10 bg-white px-3 py-2 focus:border-sage-400 focus:outline-none";

  return (
    <div>
      <section className="bg-mist/60 px-5 py-10">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-display text-4xl font-bold lowercase">
            admin dashboard
          </h1>
          <p className="mt-1 text-fog">
            the whole marketplace at a glance — fees, orders, listings, people.
          </p>
        </div>
      </section>

      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-5 py-8">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile label="your fee revenue" value={formatUsd(feeRevenue)} />
          <StatTile label="gross volume" value={formatUsd(grossVolume)} />
          <StatTile label="paid orders" value={String(paid.length)} />
        </section>

        <section className="rounded-2xl border border-ink/5 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-display text-xl font-bold lowercase">
            platform fee
          </h2>
          <form
            action={updateFeeSettings}
            className="flex flex-wrap items-end gap-4 text-sm"
          >
            <label className="text-fog">
              percent
              <input
                name="fee_percent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                defaultValue={Number(s.fee_percent)}
                className={inputCls}
              />
            </label>
            <label className="text-fog">
              flat (¢)
              <input
                name="fee_flat_cents"
                type="number"
                step="1"
                min="0"
                defaultValue={s.fee_flat_cents}
                className={inputCls}
              />
            </label>
            <button className="rounded-full bg-sage-500 px-6 py-2.5 font-display font-semibold lowercase text-white hover:bg-sage-600">
              save
            </button>
            <span className="text-fog">
              the fee comes out of the listing price — on a $20.00 sale the
              seller nets{" "}
              {formatUsd(
                2000 -
                  Math.min(
                    2000,
                    Math.round((2000 * Number(s.fee_percent)) / 100) +
                      s.fee_flat_cents
                  )
              )}
              .
            </span>
          </form>
        </section>

        <OptionsSection options={(optionRows as OptionRow[] | null) ?? []} />

        <SellersSection
          users={(users as Profile[] | null) ?? []}
          products={(products as Product[] | null) ?? []}
          orders={allOrders}
          defaultPercent={Number(s.fee_percent)}
          flatCents={s.fee_flat_cents}
        />

        <section>
          <h2 className="mb-3 font-display text-xl font-bold lowercase">
            listings
          </h2>
          <ul className="overflow-hidden rounded-2xl border border-ink/5 bg-white text-sm shadow-sm">
            {!(products as Product[] | null)?.length && (
              <li className="p-4 text-fog">no listings yet.</li>
            )}
            {((products as Product[] | null) ?? []).map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-3 border-b border-ink/5 p-3.5 last:border-0"
              >
                <StatusChip status={p.status} />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {p.title}
                </span>
                <span className="text-fog">{priceLabel(p.price_cents)}</span>
                <form action={toggleFeatured}>
                  <input type="hidden" name="product_id" value={p.id} />
                  <input
                    type="hidden"
                    name="make_featured"
                    value={p.featured_at ? "false" : "true"}
                  />
                  <button
                    title={
                      p.featured_at
                        ? "remove from the homepage featured shelf"
                        : "feature on the homepage (your picks outrank the auto-fill)"
                    }
                    className={
                      "rounded-full px-3.5 py-1.5 lowercase transition " +
                      (p.featured_at
                        ? "bg-sage-500 font-semibold text-white hover:bg-sage-600"
                        : "border border-ink/10 text-fog hover:border-ink/30")
                    }
                  >
                    {p.featured_at ? "★ featured" : "☆ feature"}
                  </button>
                </form>
                <form action={setProductStatus}>
                  <input type="hidden" name="product_id" value={p.id} />
                  <input
                    type="hidden"
                    name="status"
                    value={p.status === "suspended" ? "active" : "suspended"}
                  />
                  <button className="rounded-full border border-ink/10 px-3.5 py-1.5 lowercase hover:border-ink/30">
                    {p.status === "suspended" ? "reinstate" : "suspend"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>

        <UsersPanel users={(users as Profile[] | null) ?? []} />

        <section>
          <h2 className="mb-3 font-display text-xl font-bold lowercase">
            all orders
          </h2>
          <ul className="overflow-hidden rounded-2xl border border-ink/5 bg-white text-sm shadow-sm">
            {!allOrders.length && (
              <li className="p-4 text-fog">no orders yet.</li>
            )}
            {allOrders.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-center gap-3 border-b border-ink/5 p-3.5 last:border-0"
              >
                <StatusChip status={o.status} />
                <span className="min-w-0 flex-1 text-fog">
                  {new Date(o.created_at).toLocaleString()}
                </span>
                <span>total {formatUsd(o.amount_cents)}</span>
                <span className="font-semibold text-sage-700">
                  fee {formatUsd(o.fee_cents)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

/**
 * Sellers panel: every seller, their payout status, and their commission
 * rate. Everyone follows the platform default unless a per-seller override
 * ("partner rate") is set here — blank the field to return them to default.
 */
function SellersSection({
  users,
  products,
  orders,
  defaultPercent,
  flatCents,
}: {
  users: Profile[];
  products: Product[];
  orders: Order[];
  defaultPercent: number;
  flatCents: number;
}) {
  const sellers = users.filter((u) => u.role === "seller" || u.role === "admin");
  const paid = orders.filter((o) => o.status === "paid");
  const sellerByProduct = new Map(products.map((p) => [p.id, p.seller_id]));

  return (
    <section>
      <h2 className="mb-1 font-display text-xl font-bold lowercase">sellers</h2>
      <p className="mb-3 text-sm text-fog">
        default rate: {defaultPercent}% + {formatUsd(flatCents)} per sale — set a
        custom rate below to give a seller a discount; blank returns them to the
        default.
      </p>
      <div className="overflow-x-auto rounded-2xl border border-ink/5 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-ink/5 text-left text-fog">
              <th className="p-3.5 font-display font-semibold lowercase">seller</th>
              <th className="p-3.5 font-display font-semibold lowercase">status</th>
              <th className="p-3.5 font-display font-semibold lowercase">listings</th>
              <th className="p-3.5 font-display font-semibold lowercase">paid sales</th>
              <th className="p-3.5 font-display font-semibold lowercase">partner</th>
              <th className="p-3.5 font-display font-semibold lowercase">rate</th>
              <th className="p-3.5 font-display font-semibold lowercase">set rate</th>
            </tr>
          </thead>
          <tbody>
            {!sellers.length && (
              <tr>
                <td className="p-4 text-fog" colSpan={6}>
                  no sellers yet.
                </td>
              </tr>
            )}
            {sellers.map((u) => {
              const theirListings = products.filter((p) => p.seller_id === u.id);
              const theirSales = paid.filter(
                (o) => sellerByProduct.get(o.product_id) === u.id
              );
              return (
                <tr key={u.id} className="border-b border-ink/5 last:border-0">
                  <td className="max-w-[220px] p-3.5">
                    <div className="truncate font-medium">
                      {u.display_name ?? u.email}
                    </div>
                    <div className="truncate text-xs text-fog">{u.email}</div>
                  </td>
                  <td className="p-3.5">
                    {u.stripe_charges_enabled ? (
                      <span className="rounded-full bg-sage-100 px-3 py-1 text-xs font-semibold text-sage-700">
                        active
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                        not active
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 tabular-nums">{theirListings.length}</td>
                  <td className="p-3.5 tabular-nums">{theirSales.length}</td>
                  <td className="p-3.5">
                    <form action={togglePartner}>
                      <input type="hidden" name="user_id" value={u.id} />
                      <input
                        type="hidden"
                        name="make_partner"
                        value={u.partner ? "false" : "true"}
                      />
                      <button
                        title={
                          u.partner
                            ? "Remove partner status (also clears their custom rate)"
                            : "Mark as partner"
                        }
                        className={
                          "rounded-full px-3 py-1.5 text-xs font-semibold transition " +
                          (u.partner
                            ? "bg-sage-500 text-white hover:bg-sage-600"
                            : "border border-ink/15 text-fog hover:border-ink/40")
                        }
                      >
                        {u.partner ? "partner ✓" : "mark partner"}
                      </button>
                    </form>
                  </td>
                  <td className="p-3.5">
                    {u.commission_override !== null ? (
                      <span className="rounded-full bg-sage-100 px-2.5 py-0.5 text-xs font-semibold text-sage-700">
                        deal · {Number(u.commission_override)}%
                      </span>
                    ) : (
                      <span className="text-fog">default · {defaultPercent}%</span>
                    )}
                  </td>
                  <td className="p-3.5">
                    <form
                      action={setCommissionOverride}
                      className="flex items-center gap-1.5"
                    >
                      <input type="hidden" name="user_id" value={u.id} />
                      <input
                        name="commission_override"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        defaultValue={u.commission_override ?? ""}
                        placeholder="default"
                        className="w-20 rounded-xl border border-ink/10 px-2 py-1.5"
                      />
                      <span className="text-fog">%</span>
                      <button className="rounded-full border border-ink/10 px-3 py-1.5 lowercase hover:border-ink/30">
                        set
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-1.5 text-xs text-fog">
        status = stripe payouts ready (refreshes when the seller visits their
        dashboard). rate changes apply to future sales only.
      </p>
    </section>
  );
}

/* ───────────────────── listing options (styles/types/levels) ───────────────────── */

const OPTION_KINDS: { kind: string; title: string }[] = [
  { kind: "style", title: "yoga styles" },
  { kind: "content_type", title: "content types" },
  { kind: "level", title: "levels" },
];

function OptionsSection({ options }: { options: OptionRow[] }) {
  return (
    // native <details> — collapsed by default, no client JS needed
    <details className="group rounded-2xl border border-ink/5 bg-white p-6 shadow-sm">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 [&::-webkit-details-marker]:hidden">
        <div>
          <h2 className="font-display text-xl font-bold lowercase">
            listing options
          </h2>
          <p className="mt-1 text-sm text-fog">
            the choices sellers pick from when posting content. removing one
            only affects future listings — existing listings keep their label.
            durations and the teachability scale are fixed parts of the
            product design.
          </p>
        </div>
        <span
          className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mist text-fog transition-transform group-open:rotate-180"
          aria-hidden
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </summary>

      {!options.length ? (
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          run migration <code>009_product_options.sql</code> in the Supabase
          SQL editor to enable editing — until then the built-in lists apply.
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-3">
          {OPTION_KINDS.map(({ kind, title }) => (
            <div key={kind}>
              <h3 className="font-display text-sm font-semibold lowercase text-sage-700">
                {title}
              </h3>
              <ul className="mt-2.5 flex flex-col gap-1.5">
                {options
                  .filter((o) => o.kind === kind)
                  .map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-ink/5 bg-cream px-3 py-1.5 text-sm"
                    >
                      <span className="truncate">{o.label}</span>
                      <form action={deleteProductOption}>
                        <input type="hidden" name="id" value={o.id} />
                        <button
                          title={`remove "${o.label}" from future listings`}
                          className="rounded-full px-1.5 text-fog hover:bg-red-50 hover:text-red-700"
                          aria-label={`delete ${o.label}`}
                        >
                          ×
                        </button>
                      </form>
                    </li>
                  ))}
              </ul>
              <form action={addProductOption} className="mt-2.5 flex gap-1.5">
                <input type="hidden" name="kind" value={kind} />
                <input
                  name="label"
                  required
                  maxLength={40}
                  placeholder="add new…"
                  className="min-w-0 flex-1 rounded-xl border border-ink/10 bg-white px-3 py-1.5 text-sm focus:border-sage-400 focus:outline-none"
                />
                <button className="rounded-full bg-sage-500 px-3.5 py-1.5 text-sm font-semibold lowercase text-white hover:bg-sage-600">
                  add
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </details>
  );
}
