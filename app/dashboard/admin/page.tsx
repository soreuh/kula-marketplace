import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatUsd, priceLabel } from "@/lib/fees";
import { StatusChip } from "@/components/ui";
import type { Order, PlatformSettings, Product, Profile } from "@/lib/types";
import {
  addProductOption,
  deleteProductOption,
  setCommissionOverride,
  setProductStatus,
  toggleFeatured,
  updateFeeSettings,
} from "./actions";
import NotificationSwitches from "./notification-switches";
import UsersPanel from "./users-panel";
import PeriodTiles from "./period-tiles";
import AdminSection from "@/components/admin-section";
import { updateGrowthModel } from "./actions";
import {
  DEFAULT_MID_DRIVERS,
  modelMonth,
  modelMonthIndex,
  resolveDrivers,
  type GrowthDrivers,
} from "@/lib/growth-model";

type OptionRow = { id: string; kind: string; label: string; sort: number };

export const dynamic = "force-dynamic";

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/admin");

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
  const allProducts = (products as Product[] | null) ?? [];
  const allUsers = (users as Profile[] | null) ?? [];
  const suspendedCount = allProducts.filter((p) => p.status === "suspended").length;
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
        {notice === "password" && (
          <p className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            password incorrect — nothing was changed. expand the section again
            and re-enter it.
          </p>
        )}
        <PeriodTiles
          orders={allOrders.map((o) => ({
            amount_cents: o.amount_cents,
            fee_cents: o.fee_cents,
            status: o.status,
            created_at: o.created_at,
          }))}
        />

        <GrowthSection
          settings={s}
          orders={allOrders}
          products={allProducts}
          users={allUsers}
        />

        <AdminSection
          title="notifications"
          subtitle="platform-wide switches for every email the app sends. individual users keep their own toggles in /settings — these override everyone's."
        >
          <NotificationSwitches
            initial={{
              notify_sale_emails: s.notify_sale_emails !== false,
              notify_content_updates: s.notify_content_updates !== false,
              notify_purchase_emails: s.notify_purchase_emails !== false,
              notify_review_emails: s.notify_review_emails !== false,
            }}
          />
        </AdminSection>

        <OptionsSection options={(optionRows as OptionRow[] | null) ?? []} />

        <AdminSection
          title="sellers"
          subtitle={`default rate: ${Number(s.fee_percent)}% + ${formatUsd(s.fee_flat_cents)} per sale — open to manage partner rates.`}
        >
          <SellersSection
            users={allUsers}
            products={allProducts}
            orders={allOrders}
            defaultPercent={Number(s.fee_percent)}
          />
        </AdminSection>

        <AdminSection
          title="listings"
          defaultOpen={suspendedCount > 0}
          badge={
            suspendedCount > 0 ? (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                {suspendedCount} suspended
              </span>
            ) : undefined
          }
          subtitle="feature (★) and moderate every listing. stays open while anything is suspended."
        >
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
        </AdminSection>

        <AdminSection title="people" subtitle="search, roles, pause / reactivate / delete.">
          <UsersPanel users={allUsers} />
        </AdminSection>

        <AdminSection title="all orders">
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
        </AdminSection>

        <AdminSection
          title="platform fee"
          subtitle="reprices every future sale on the marketplace — changing it asks for your password again."
        >
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
            <label className="text-fog">
              your password
              <input
                name="confirm_password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="re-enter to confirm"
                className={inputCls + " w-44"}
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
        </AdminSection>
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
}: {
  users: Profile[];
  products: Product[];
  orders: Order[];
  defaultPercent: number;
}) {
  const sellers = users.filter((u) => u.role === "seller" || u.role === "admin");
  const paid = orders.filter((o) => o.status === "paid");
  const sellerByProduct = new Map(products.map((p) => [p.id, p.seller_id]));

  return (
    <section>
      <div className="overflow-x-auto rounded-2xl border border-ink/5 bg-cream/40">
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
                    {/* DERIVED (023): partner IS "has a negotiated rate" —
                        no toggle, no state to desync. Set or blank the rate
                        (password-gated) and this follows. */}
                    {u.commission_override !== null ? (
                      <span className="rounded-full bg-sage-100 px-3 py-1 text-xs font-semibold text-sage-700">
                        partner ✓
                      </span>
                    ) : (
                      <span className="text-xs text-fog">—</span>
                    )}
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
                      id={`rate-form-${u.id}`}
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
                      <input
                        name="confirm_password"
                        type="password"
                        required
                        autoComplete="current-password"
                        placeholder="password"
                        title="rate changes require your password"
                        className="w-28 rounded-xl border border-ink/10 px-2 py-1.5"
                      />
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
    <AdminSection
      title="listing options"
      subtitle="the choices sellers pick from when posting content. removing one only affects future listings — existing listings keep their label. durations and the teachability scale are fixed parts of the product design."
    >
      {!options.length ? (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          run migration <code>009_product_options.sql</code> in the Supabase
          SQL editor to enable editing — until then the built-in lists apply.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
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
    </AdminSection>
  );
}

/* ───────────────────── growth model check-in (migration 020) ───────────────────── */

/**
 * Live actuals vs the growth model's Mid path (lib/growth-model.ts — a
 * verified replica of ../kula-growth-model.xlsx). The point is DRIVERS,
 * not vanity totals: sellers, listings/seller, and sales/listing are the
 * variables the model forecasts from, so when revenue lags, this table
 * says WHICH lever is behind. Flow metrics prorate the model by how far
 * through the month we are; stock metrics compare directly.
 */
function GrowthSection({
  settings,
  orders,
  products,
  users,
}: {
  settings: PlatformSettings;
  orders: Order[];
  products: Product[];
  users: Profile[];
}) {
  const drivers = resolveDrivers(settings.growth_model);
  const launch = settings.launch_date ?? null;
  const now = new Date();
  const mIdx = launch ? modelMonthIndex(launch, now) : 0;
  const model = mIdx >= 1
    ? modelMonth(drivers, mIdx, Number(settings.fee_percent), settings.fee_flat_cents)
    : null;

  // fraction of the current month elapsed — for prorating flow metrics
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthFrac = Math.min(1, now.getDate() / daysInMonth);

  // ---- actuals, current calendar month ----
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const paidMoney = orders.filter(
    (o) => o.status === "paid" && o.amount_cents > 0
  );
  const mPaid = paidMoney.filter((o) => new Date(o.created_at) >= monthStart);
  const gmv = mPaid.reduce((x, o) => x + o.amount_cents, 0);
  const fee = mPaid.reduce((x, o) => x + o.fee_cents, 0);
  // stripe cost estimated per real order (2.9% + 30¢) — labelled est.
  const stripeEst = mPaid.reduce(
    (x, o) => x + o.amount_cents * drivers.stripePct + drivers.stripeFlatCents,
    0
  );
  const liveListings = products.filter((p) => p.status === "active");
  const activeSellerIds = new Set(liveListings.map((p) => p.seller_id));
  const activeSellers = activeSellerIds.size;
  const lps = activeSellers ? liveListings.length / activeSellers : 0;
  const spl = liveListings.length ? mPaid.length / liveListings.length : 0;
  const avgPrice = mPaid.length ? gmv / mPaid.length : 0;

  // ---- funnels (all-time) ----
  const sellersWithListing = new Set(products.map((p) => p.seller_id)).size;
  const stripeConnected = users.filter((u) => u.stripe_charges_enabled).length;
  const freeClaimBuyers = new Map<string, string>(); // buyer -> first claim time
  for (const o of orders)
    if (o.status === "paid" && o.amount_cents === 0) {
      const prev = freeClaimBuyers.get(o.buyer_id);
      if (!prev || o.created_at < prev) freeClaimBuyers.set(o.buyer_id, o.created_at);
    }
  let converted = 0;
  for (const [buyer, claimedAt] of freeClaimBuyers)
    if (
      paidMoney.some((o) => o.buyer_id === buyer && o.created_at > claimedAt)
    )
      converted++;

  const num = (v: number, dp = 1) =>
    v.toLocaleString("en-US", { maximumFractionDigits: dp });
  // [label, actual display, target display, actual raw, target raw, isCost]
  // isCost rows never get the behind-plan dot: running UNDER the model on
  // a cost is good news, not a lag.
  type Row = [string, string, string, number, number, boolean];
  const rows: Row[] = model
    ? [
        ["active sellers (≥1 live listing)", num(activeSellers, 0), num(model.sellers), activeSellers, model.sellers, false],
        ["live listings", num(liveListings.length, 0), num(model.listings), liveListings.length, model.listings, false],
        ["listings per seller", num(lps, 2), num(model.listingsPerSeller, 2), lps, model.listingsPerSeller, false],
        [`paid sales (month ${mIdx})`, num(mPaid.length, 0), num(model.sales * monthFrac), mPaid.length, model.sales * monthFrac, false],
        ["sales per listing / mo", num(spl, 3), num(model.salesPerListing * monthFrac, 3), spl, model.salesPerListing * monthFrac, false],
        ["avg sale price", formatUsd(Math.round(avgPrice)), formatUsd(Math.round(drivers.avgPriceCents)), avgPrice, drivers.avgPriceCents, false],
        ["gmv this month", formatUsd(gmv), formatUsd(Math.round(model.gmvCents * monthFrac)), gmv, model.gmvCents * monthFrac, false],
        ["kula fee this month", formatUsd(fee), formatUsd(Math.round(model.kulaFeeCents * monthFrac)), fee, model.kulaFeeCents * monthFrac, false],
        ["stripe cost (est.)", formatUsd(Math.round(stripeEst)), formatUsd(Math.round(model.stripeCostCents * monthFrac)), stripeEst, model.stripeCostCents * monthFrac, true],
        [
          "kula net (est., excl. connect fees until live mode)",
          formatUsd(Math.round(fee - stripeEst)),
          formatUsd(Math.round((model.kulaFeeCents - model.stripeCostCents) * monthFrac)),
          fee - stripeEst,
          (model.kulaFeeCents - model.stripeCostCents) * monthFrac,
          false,
        ],
      ]
    : [];

  const D = drivers;
  const driverInput =
    "mt-1 block w-full rounded-xl border border-ink/10 bg-white px-2.5 py-1.5 text-sm focus:border-sage-400 focus:outline-none";
  const DRIVER_FIELDS: [keyof GrowthDrivers, string, number][] = [
    ["startingSellers", "starting sellers", D.startingSellers],
    ["growthEarly", "seller growth /mo, m1–12", D.growthEarly],
    ["growthLate", "seller growth /mo, m13+", D.growthLate],
    ["listingsPerSellerStart", "listings/seller at start", D.listingsPerSellerStart],
    ["newListingsPerMonth", "new listings/seller/mo", D.newListingsPerMonth],
    ["salesPerListingStart", "sales/listing/mo, start", D.salesPerListingStart],
    ["demandGrowth", "demand growth /mo", D.demandGrowth],
    ["demandCap", "demand cap (sales/listing)", D.demandCap],
    ["avgPriceCents", "avg listing price (¢)", D.avgPriceCents],
    ["stripePct", "stripe %", D.stripePct],
    ["stripeFlatCents", "stripe flat (¢)", D.stripeFlatCents],
    ["connectFeeCents", "connect fee (¢/seller/mo)", D.connectFeeCents],
    ["payoutShare", "share of sellers paid out /mo", D.payoutShare],
  ];
  const isCustom = !!settings.growth_model &&
    Object.keys(settings.growth_model).some(
      (k) =>
        settings.growth_model![k] !==
        DEFAULT_MID_DRIVERS[k as keyof GrowthDrivers]
    );

  return (
    <AdminSection
      title="growth model check-in"
      subtitle={
        model
          ? `month ${mIdx} of the 24-month model (launched ${launch}) — live actuals vs the mid path. flow rows are prorated to day ${now.getDate()} of ${daysInMonth}.`
          : "set a launch date below to compare live actuals against the growth model's mid path."
      }
      badge={
        isCustom ? (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            custom drivers
          </span>
        ) : undefined
      }
    >
      {model ? (
        <div className="overflow-x-auto rounded-2xl border border-ink/5">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-ink/5 text-left text-fog">
                <th className="p-3 font-display font-semibold lowercase">metric</th>
                <th className="p-3 font-display font-semibold lowercase">actual</th>
                <th className="p-3 font-display font-semibold lowercase">mid path</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, actual, target, rawA, rawT, isCost]) => (
                <tr key={label} className="border-b border-ink/5 last:border-0">
                  <td className="p-3 text-fog">
                    <span className="inline-flex items-center gap-2">
                      {/* behind-plan marker: below the mid path (costs exempt) */}
                      {!isCost && rawA < rawT && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-amber-300"
                          title="below the mid path"
                          aria-label="below the mid path"
                        />
                      )}
                      {label}
                    </span>
                  </td>
                  <td className="p-3 font-semibold tabular-nums">{actual}</td>
                  <td className="p-3 tabular-nums text-fog">{target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : mIdx === 0 && launch ? (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          launch date {launch} is in the future — the check-in starts at month 1.
        </p>
      ) : (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          run migration <code>020_admin_growth.sql</code> to enable this section.
        </p>
      )}

      {/* funnels — the leading indicators the TODO tracks */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-ink/5 bg-cream/40 p-4 text-sm">
          <h3 className="font-display font-semibold lowercase text-sage-700">
            seller activation (all-time)
          </h3>
          <p className="mt-1.5 text-fog">
            {users.length} accounts → {sellersWithListing} posted a listing →{" "}
            {stripeConnected} connected stripe
          </p>
        </div>
        <div className="rounded-2xl border border-ink/5 bg-cream/40 p-4 text-sm">
          <h3 className="font-display font-semibold lowercase text-sage-700">
            freebie funnel (all-time)
          </h3>
          <p className="mt-1.5 text-fog">
            {freeClaimBuyers.size} claimed a freebie → {converted} later bought
            something{" "}
            {freeClaimBuyers.size > 0 &&
              `(${Math.round((converted / freeClaimBuyers.size) * 100)}%)`}
          </p>
        </div>
      </div>

      {/* editable drivers — nested, collapsed */}
      <details className="group/drivers mt-4 rounded-2xl border border-ink/5 bg-cream/40 p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold lowercase text-sage-700 [&::-webkit-details-marker]:hidden">
          model drivers (mid scenario) — edit ▾
        </summary>
        <p className="mt-2 text-xs text-fog">
          these mirror the editable cells in kula-growth-model.xlsx. changing
          them recomputes the whole comparison — the spreadsheet stays the
          reference; &quot;reset&quot; returns everything to its mid column.
          the kula fee itself always comes from the platform fee setting (bottom of this page).
        </p>
        <form action={updateGrowthModel} className="mt-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <label className="text-xs text-fog">
              launch date (month 1)
              <input
                name="launch_date"
                type="date"
                defaultValue={launch ?? ""}
                className={driverInput}
              />
            </label>
            {DRIVER_FIELDS.map(([name, label, value]) => (
              <label key={name} className="text-xs text-fog">
                {label}
                <input
                  name={name}
                  type="number"
                  step="any"
                  min="0"
                  defaultValue={value}
                  className={driverInput}
                />
              </label>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button className="rounded-full bg-sage-500 px-5 py-2 text-sm font-display font-semibold lowercase text-white hover:bg-sage-600">
              save drivers
            </button>
            <button
              name="reset"
              value="true"
              className="rounded-full border border-ink/10 px-5 py-2 text-sm lowercase text-fog hover:border-ink/30"
            >
              reset to mid defaults
            </button>
          </div>
        </form>
      </details>
    </AdminSection>
  );
}
