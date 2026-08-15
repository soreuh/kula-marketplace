"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatUsd, priceLabel, timeAgo } from "@/lib/fees";
import { DURATIONS, TEACHABILITY } from "@/lib/categories";
import { CoverArt, StatTile, StatusChip, Stars, btnPrimary, fileInputCls, inputCls } from "@/components/ui";
import type { ProductOptions } from "@/lib/options";
import type { Product } from "@/lib/types";

export type SaleRow = {
  id: string;
  product_id: string;
  productTitle: string;
  amount_cents: number;
  fee_cents: number;
  seller_amount_cents: number;
  status: string;
  created_at: string;
};

import type { RatingMap as Ratings } from "@/lib/ratings";

export default function DashboardClient({
  userId,
  role,
  products,
  sales,
  ratings,
  stripeStarted,
  chargesEnabled,
  ipAgreed,
  aiEnabled,
  feeRateLabel,
  feePercent,
  feeFlatCents,
  options,
}: {
  userId: string;
  role: string;
  products: Product[];
  sales: SaleRow[];
  ratings: Ratings;
  stripeStarted: boolean;
  chargesEnabled: boolean;
  ipAgreed: boolean;
  aiEnabled: boolean;
  feeRateLabel: string;
  feePercent: number;
  feeFlatCents: number;
  options: ProductOptions; // admin-curated style/type/level lists
}) {
  const [tab, setTab] = useState<"content" | "earnings">("content");
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      {chargesEnabled ? (
        <PayoutsActivePanel feeRateLabel={feeRateLabel} />
      ) : (
        <ConnectStripeCard started={stripeStarted} />
      )}

      <div className="flex w-fit rounded-full bg-ink/5 p-1 font-display text-sm font-semibold lowercase">
        <button
          onClick={() => setTab("content")}
          className={
            "rounded-full px-5 py-2 transition " +
            (tab === "content" ? "bg-white shadow-sm" : "text-fog")
          }
        >
          my content
        </button>
        <button
          onClick={() => setTab("earnings")}
          className={
            "rounded-full px-5 py-2 transition " +
            (tab === "earnings" ? "bg-white shadow-sm" : "text-fog")
          }
        >
          earnings
        </button>
      </div>

      {tab === "content" ? (
        <ContentTab
          userId={userId}
          role={role}
          products={products}
          chargesEnabled={chargesEnabled}
          ipAgreed={ipAgreed}
          aiEnabled={aiEnabled}
          feePercent={feePercent}
          feeFlatCents={feeFlatCents}
          options={options}
          showForm={showForm}
          setShowForm={setShowForm}
        />
      ) : (
        <EarningsTab
          userId={userId}
          products={products}
          sales={sales}
          ratings={ratings}
          openUpload={() => {
            setTab("content");
            setShowForm(true);
          }}
        />
      )}
    </div>
  );
}

/* ───────────────────────── stripe banners ───────────────────────── */

function PayoutsActivePanel({ feeRateLabel }: { feeRateLabel: string }) {
  return (
    <div className="rounded-2xl border border-sage-200 bg-sage-50 p-5">
      <div className="flex items-center gap-2.5">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-sage-600)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20 6 9 17l-5-5" />
        </svg>
        <h3 className="font-display font-bold lowercase text-sage-700">
          stripe connected — payouts active
        </h3>
      </div>
      <p className="mt-1 text-sm text-sage-700/80">
        stripe deposits your earnings to your bank monthly (around the 1st).
        your kula rate: {feeRateLabel}.
      </p>
    </div>
  );
}

function ConnectStripeCard({ started }: { started: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/onboard", { method: "POST" });
      // A crashed route returns an HTML error page — don't let a failed
      // .json() parse strand the button in "opening…" forever.
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) {
        setError(
          json.error ??
            `could not start stripe onboarding (HTTP ${res.status}) — try again, and if it persists check the platform's Stripe Connect setup`,
        );
        return;
      }
      window.location.href = json.url;
    } catch {
      setError("network hiccup talking to the server — try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" className="mt-0.5 shrink-0" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
        <div>
          <h3 className="font-display font-bold lowercase text-amber-900">
            connect stripe to receive payouts
          </h3>
          <p className="mt-1 text-sm text-amber-800">
            identity verification and active payout capabilities are required.
            onboarding is hosted securely by stripe. you can prepare listings
            right now — they save as drafts and go live once stripe is
            connected.
            {started && " your setup is partway done — resume below."}
          </p>
        </div>
      </div>
      <button
        onClick={connect}
        disabled={busy}
        className={`mt-4 w-full justify-center ${btnPrimary}`}
      >
        {busy
          ? "opening…"
          : started
            ? "resume stripe setup"
            : "connect stripe to receive payouts"}
      </button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}

/* ───────────────────────── my content tab ───────────────────────── */

function ContentTab({
  userId,
  role,
  products,
  chargesEnabled,
  ipAgreed,
  aiEnabled,
  feePercent,
  feeFlatCents,
  options,
  showForm,
  setShowForm,
}: {
  userId: string;
  role: string;
  products: Product[];
  chargesEnabled: boolean;
  ipAgreed: boolean;
  aiEnabled: boolean;
  feePercent: number;
  feeFlatCents: number;
  options: ProductOptions;
  showForm: boolean;
  setShowForm: (v: boolean) => void;
}) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "draft" | "suspended" | "archived"
  >("all");

  const needle = q.trim().toLowerCase();
  const visible = products.filter(
    (p) =>
      // "all" means all the LIVE-ish ones; archived is its own filter so a
      // long tail of retired listings doesn't bury current work.
      (statusFilter === "all" ? p.status !== "archived" : p.status === statusFilter) &&
      (!needle ||
        `${p.title} ${p.theme ?? ""} ${p.category ?? ""} ${p.content_type ?? ""}`
          .toLowerCase()
          .includes(needle))
  );
  const hasSuspended = products.some((p) => p.status === "suspended");

  return (
    <div className="flex flex-col gap-4">
      {showForm || editing ? (
        <UploadDialog
          key={editing?.id ?? "new"}
          userId={userId}
          role={role}
          ipAgreed={ipAgreed}
          aiEnabled={aiEnabled}
          canPublish={chargesEnabled}
          feePercent={feePercent}
          feeFlatCents={feeFlatCents}
          options={options}
          editing={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      ) : (
        <div>
          <button
            onClick={() => setShowForm(true)}
            className={`w-full justify-center sm:w-fit ${btnPrimary}`}
          >
            <span aria-hidden>+</span> post content to sell
          </button>
          {!chargesEnabled && (
            <p className="mt-1.5 text-xs text-fog">
              you can prep listings now — they stay drafts until stripe is
              connected.
            </p>
          )}
        </div>
      )}

      {!products.length && !showForm ? (
        <div className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-12 text-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-sage-100 text-sage-600">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 8 12 3 3 8l9 5z" />
              <path d="M3 8v8l9 5 9-5V8" />
              <path d="M12 13v8" />
            </svg>
          </span>
          <h3 className="mt-4 font-display text-2xl font-bold lowercase">
            no content yet
          </h3>
          <p className="mt-1 text-fog">create your first listing to start earning.</p>
          <button
            onClick={() => setShowForm(true)}
            className={`mt-5 ${btnPrimary}`}
          >
            <span aria-hidden>+</span> post your first content
          </button>
        </div>
      ) : (
        <>
          {/* Search + status filter — ALWAYS shown once you have any listing.
              It used to appear only with 2+ listings, which meant the chips
              moved around as the list grew and, worse, a seller with a single
              listing could archive it and be left with no chip to find it
              again. The zero-listings case is the empty state above. */}
          {(
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex min-w-[180px] flex-1 items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-2 text-sm focus-within:border-sage-400 sm:max-w-xs">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-fog" aria-hidden>
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4-4" />
                </svg>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="search your listings…"
                  className="w-full bg-transparent outline-none placeholder:text-fog"
                />
              </label>
              {(
                [
                  ["all", "all"],
                  ["active", "live"],
                  ["draft", "drafts"],
                  ["archived", "archived"],
                  ...(hasSuspended ? [["suspended", "suspended"]] : []),
                ] as [typeof statusFilter, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  className={
                    "rounded-full px-3.5 py-1.5 text-sm lowercase transition " +
                    (statusFilter === value
                      ? "bg-sage-500 font-semibold text-white"
                      : "border border-ink/10 bg-white text-fog hover:border-ink/30")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {visible.map((p) => (
              <ProductRow
                key={p.id}
                product={p}
                canPublish={chargesEnabled}
                onEdit={setEditing}
                onRestored={() => setStatusFilter("all")}
              />
            ))}
            {!visible.length && products.length > 0 && (
              <p className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-8 text-center text-sm text-fog">
                no listings match — clear the search or pick a different filter.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ProductRow({
  product,
  canPublish,
  onEdit,
  onRestored,
}: {
  product: Product;
  canPublish: boolean;
  onEdit: (p: Product) => void;
  onRestored: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function toggleStatus() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("products")
      .update({ status: product.status === "active" ? "draft" : "active" })
      .eq("id", product.id);
    setBusy(false);
    if (error) return setErr(error.message);
    router.refresh();
  }

  /**
   * ARCHIVE — replaces the old delete button (migrations 016/017).
   *
   * The previous version removed the storage files FIRST and then ran a
   * row delete whose error was never checked. For any listing that had
   * sold, the row delete was rejected by the orders foreign key while the
   * files were already gone — leaving a live, buyable listing with no file
   * behind it and permanently breaking every prior buyer's download.
   *
   * Nothing is destroyed now. The row stays (orders keep their reference),
   * the files stay (buyers keep the "lifetime access" they paid for), and
   * the reviews stay AND keep counting toward this teacher's instructor
   * rating (view in 017) — earned reputation is not a side effect of a
   * listing's current publish state.
   */
  async function archive() {
    if (
      !confirm(
        `Archive "${product.title}"?\n\n` +
          `It comes off the marketplace right away and can't be bought again.\n\n` +
          `Nothing is deleted: anyone who already bought it keeps their download, ` +
          `its reviews still count toward your instructor rating, and you can ` +
          `restore it at any time.`
      )
    )
      return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("products")
      .update({ status: "archived" })
      .eq("id", product.id);
    setBusy(false);
    if (error) return setErr(error.message);
    router.refresh();
  }

  /**
   * Archived → draft. Republishing then goes through the normal gate.
   *
   * onRestored() moves the status filter off "archived" first: the row is
   * about to stop matching that filter, and without it the seller is left
   * staring at an empty "no listings match" panel wondering where their
   * listing went until they reload the page.
   */
  async function restore() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("products")
      .update({ status: "draft" })
      .eq("id", product.id);
    setBusy(false);
    if (error) return setErr(error.message);
    onRestored();
    router.refresh();
  }

  const isArchived = product.status === "archived";

  return (
    <div className="rounded-2xl border border-ink/5 bg-white p-3 text-sm shadow-sm">
    <div className={"flex items-center gap-4 " + (isArchived ? "opacity-60" : "")}>
      <CoverArt
        seed={`${product.category}-${product.title}`}
        imagePath={product.cover_path}
        className="h-14 w-20 shrink-0 rounded-xl"
      />
      <div className="min-w-0 flex-1">
        <Link
          href={`/products/${product.id}`}
          className="truncate font-display font-semibold hover:text-sage-600"
        >
          {product.title}
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <StatusChip status={product.status} />
          <span className="text-fog">{priceLabel(product.price_cents)}</span>
          <span className="text-fog">· {product.views} views</span>
        </div>
      </div>
      {product.status !== "suspended" && !isArchived && (
        <>
          <button
            onClick={() => onEdit(product)}
            disabled={busy}
            className="rounded-full border border-ink/10 px-3.5 py-1.5 lowercase hover:border-ink/30 disabled:opacity-40"
          >
            edit
          </button>
          <button
            onClick={toggleStatus}
            disabled={
              busy ||
              (product.status === "draft" && !canPublish && product.price_cents > 0)
            }
            title={
              product.status === "draft" && !canPublish && product.price_cents > 0
                ? "Connect Stripe to publish paid listings — free ones publish now"
                : undefined
            }
            className="rounded-full border border-ink/10 px-3.5 py-1.5 lowercase hover:border-ink/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {product.status === "active" ? "unpublish" : "publish"}
          </button>
        </>
      )}
      {isArchived ? (
        <button
          onClick={restore}
          disabled={busy}
          className="rounded-full border border-ink/10 px-3.5 py-1.5 lowercase hover:border-ink/30 disabled:opacity-40"
        >
          restore
        </button>
      ) : (
        product.status !== "suspended" && (
          <button
            onClick={archive}
            disabled={busy}
            title="Takes it off the marketplace. Nothing is deleted — buyers keep their downloads and reviews still count toward your rating."
            className="rounded-full border border-ink/10 px-3.5 py-1.5 lowercase text-fog hover:border-ink/30 disabled:opacity-40"
          >
            archive
          </button>
        )
      )}
    </div>
    {isArchived && (
      <p className="mt-2 rounded-xl bg-mist/70 px-3 py-2 text-xs text-fog">
        archived — off the marketplace, but nothing was deleted. buyers who
        already have it keep their download, and its reviews still count toward
        your instructor rating.
      </p>
    )}
    {err && <p className="mt-2 text-xs text-red-700">{err}</p>}
    </div>
  );
}

/* ───────────────────────── earnings tab ───────────────────────── */

function EarningsTab({
  userId,
  products,
  sales,
  ratings,
  openUpload,
}: {
  userId: string;
  products: Product[];
  sales: SaleRow[];
  ratings: Ratings;
  openUpload: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [perfQuery, setPerfQuery] = useState("");

  const paid = sales.filter((s) => s.status === "paid");
  const perfNeedle = perfQuery.trim().toLowerCase();
  const perfProducts = products.filter(
    (p) => !perfNeedle || p.title.toLowerCase().includes(perfNeedle)
  );
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthPaid = paid.filter(
    (s) => new Date(s.created_at).getTime() >= monthStart
  );
  const sum = (rows: SaleRow[], k: "seller_amount_cents" | "fee_cents" | "amount_cents") =>
    rows.reduce((acc, r) => acc + r[k], 0);
  const soldTitles = new Set(paid.map((s) => s.product_id)).size;

  if (!products.length) {
    return (
      <div className="rounded-2xl border border-ink/5 bg-white p-8 shadow-sm">
        <h3 className="font-display text-2xl font-bold lowercase">
          getting started
        </h3>
        <p className="mt-1 text-fog">three steps to your first sale:</p>
        <ol className="mt-5 flex flex-col gap-4">
          <ChecklistItem n={1} title="publish your first listing">
            <button onClick={openUpload} className="text-sage-600 underline">
              post content to sell →
            </button>
          </ChecklistItem>
          <ChecklistItem n={2} title="complete your profile">
            <Link href={`/profile/${userId}`} className="text-sage-600 underline">
              add a bio and specialisations →
            </Link>
          </ChecklistItem>
          <ChecklistItem n={3} title="share your store link">
            <button
              onClick={() => {
                navigator.clipboard
                  .writeText(`${window.location.origin}/profile/${userId}`)
                  .then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
              }}
              className="text-sage-600 underline"
            >
              {copied ? "copied ✓" : "copy your profile link"}
            </button>
          </ChecklistItem>
        </ol>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label="your earnings"
          value={formatUsd(sum(paid, "seller_amount_cents"))}
          sub={`kula fees ${formatUsd(sum(paid, "fee_cents"))} all time`}
        />
        <StatTile
          label="this month"
          value={formatUsd(sum(monthPaid, "seller_amount_cents"))}
          sub={`kula fees ${formatUsd(sum(monthPaid, "fee_cents"))}`}
        />
        <StatTile
          label="products sold"
          value={String(soldTitles)}
          sub={`of ${products.length} listing${products.length === 1 ? "" : "s"}`}
        />
      </div>

      {/* published content performance */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-xl font-bold lowercase">
          listing performance
        </h3>
        {products.length > 1 && (
          <label className="flex items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-2 text-sm focus-within:border-sage-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-fog" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4-4" />
            </svg>
            <input
              value={perfQuery}
              onChange={(e) => setPerfQuery(e.target.value)}
              placeholder="filter listings…"
              className="w-40 bg-transparent outline-none placeholder:text-fog"
            />
          </label>
        )}
      </div>
      <div className="-mt-3 overflow-x-auto rounded-2xl border border-ink/5 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-ink/5 text-left text-fog">
              <th className="p-3.5 font-display font-semibold lowercase">listing</th>
              <th className="p-3.5 font-display font-semibold lowercase">views</th>
              <th className="p-3.5 font-display font-semibold lowercase">sales</th>
              <th className="p-3.5 font-display font-semibold lowercase">conv.</th>
              <th className="p-3.5 font-display font-semibold lowercase">rating</th>
              <th className="p-3.5 font-display font-semibold lowercase">gross</th>
              <th className="p-3.5 font-display font-semibold lowercase">your net</th>
            </tr>
          </thead>
          <tbody>
            {perfProducts.map((p) => {
              const pSales = paid.filter((s) => s.product_id === p.id);
              const gross = sum(pSales, "amount_cents");
              const net = sum(pSales, "seller_amount_cents");
              const fees = sum(pSales, "fee_cents");
              const conv =
                p.views > 0
                  ? `${Math.round((pSales.length / p.views) * 100)}%`
                  : "—";
              const r = ratings[p.id];
              return (
                <tr key={p.id} className="border-b border-ink/5 last:border-0">
                  <td className="max-w-[220px] truncate p-3.5 font-medium">
                    {p.title}
                  </td>
                  <td className="p-3.5 tabular-nums">{p.views}</td>
                  <td className="p-3.5 tabular-nums">{pSales.length}</td>
                  <td className="p-3.5 tabular-nums">{conv}</td>
                  <td className="p-3.5">
                    {r ? (
                      <Stars rating={r.avg} count={r.count} />
                    ) : (
                      <span className="text-fog">—</span>
                    )}
                  </td>
                  <td className="p-3.5 tabular-nums">{formatUsd(gross)}</td>
                  <td className="p-3.5">
                    <span className="font-semibold text-sage-700 tabular-nums">
                      {formatUsd(net)}
                    </span>
                    <span className="block text-xs text-fog">
                      fee {formatUsd(fees)}
                    </span>
                  </td>
                </tr>
              );
            })}
            {!perfProducts.length && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-fog">
                  no listings match that search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* recent transactions */}
      <div>
        <h3 className="mb-2 font-display text-xl font-bold lowercase">
          recent transactions
        </h3>
        {!sales.length ? (
          <p className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-8 text-center text-fog">
            no sales yet — every practice starts somewhere.
          </p>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-ink/5 bg-white text-sm shadow-sm">
            {sales.slice(0, 25).map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-4 border-b border-ink/5 p-4 last:border-0"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{s.productTitle}</div>
                  <div className="text-xs text-fog">{timeAgo(s.created_at)}</div>
                </div>
                <div className="text-right">
                  <div
                    className={
                      s.status === "refunded"
                        ? "text-fog line-through"
                        : "font-semibold text-sage-700"
                    }
                  >
                    +{formatUsd(s.seller_amount_cents)}
                    {s.status === "refunded" && (
                      <span className="ml-1.5 no-underline">refunded</span>
                    )}
                  </div>
                  <div className="text-xs text-fog">
                    gross {formatUsd(s.amount_cents)} · fee {formatUsd(s.fee_cents)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  );
}

function ChecklistItem({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sage-100 font-display text-sm font-bold text-sage-700">
        {n}
      </span>
      <div className="text-sm">
        <div className="font-semibold">{title}</div>
        <div className="mt-0.5">{children}</div>
      </div>
    </li>
  );
}

/* ───────────────────────── upload dialog ───────────────────────── */

const ACCEPTED = [".pdf", ".ppt", ".pptx"];
const MAX_BYTES = 50 * 1024 * 1024;

type Suggestions = {
  title?: string;
  category?: string;
  content_type?: string;
  level?: string;
  duration_minutes?: number;
  teachability?: string;
  theme?: string;
  peak_pose?: string | null;
};

function UploadDialog({
  userId,
  role,
  ipAgreed,
  aiEnabled,
  canPublish,
  feePercent,
  feeFlatCents,
  options,
  editing,
  onClose,
}: {
  userId: string;
  role: string;
  ipAgreed: boolean;
  aiEnabled: boolean;
  canPublish: boolean;
  feePercent: number;
  feeFlatCents: number;
  options: ProductOptions;
  /** Present = EDIT an existing listing; null/undefined = create a new one. */
  editing?: Product | null;
  onClose: () => void;
}) {
  const isEdit = !!editing;
  /** Original (sanitized) filename of the current sale file, recovered from
   *  the storage path `{sellerId}/{uuid}-{name}` — shown in the edit
   *  dropzone so sellers can confirm WHICH file they're about to replace.
   *  Slice past the 36-char uuid + hyphen; falls back to null on any
   *  unexpected path shape (e.g. legacy uploads). */
  const currentFileName = (() => {
    const path = editing?.file_path;
    if (!path) return null;
    const tail = path.split("/").pop() ?? "";
    return tail.length > 37 ? tail.slice(37) : tail || null;
  })();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  // In edit mode every field seeds from the existing listing; a new file or
  // cover is OPTIONAL (leave them alone and the current ones are kept).
  const [file, setFile] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [removeCover, setRemoveCover] = useState(false);

  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [price, setPrice] = useState(
    editing && editing.price_cents > 0 ? (editing.price_cents / 100).toFixed(2) : ""
  );
  const [category, setCategory] = useState<string>(editing?.category ?? "");
  const [contentType, setContentType] = useState<string>(editing?.content_type ?? "");
  const [duration, setDuration] = useState<string>(
    editing?.duration_minutes != null ? String(editing.duration_minutes) : ""
  );
  const [level, setLevel] = useState<string>(editing?.level ?? "");
  const [theme, setTheme] = useState(editing?.theme ?? "");
  // Defaults to "ready" on NEW listings (owner request, Aug 2026): the
  // teachability cards don't read as a required field the way inputs and
  // selects do, and an empty selection kept tripping people at submit.
  // "ready" is also the honest majority case. Edit mode keeps the real value.
  const [teachability, setTeachability] = useState<string>(
    editing?.teachability ?? "ready"
  );
  // optional
  const [anatomyFocus, setAnatomyFocus] = useState(editing?.anatomy_focus ?? "");
  const [usageNotes, setUsageNotes] = useState(editing?.usage_notes ?? "");
  const [peakPose, setPeakPose] = useState(editing?.peak_pose ?? "");
  const [sequenceBreakdown, setSequenceBreakdown] = useState(
    editing?.sequence_breakdown ?? ""
  );
  const [propsNeeded, setPropsNeeded] = useState(editing?.props ?? "");

  const [ipChecked, setIpChecked] = useState(ipAgreed);
  const [isFree, setIsFree] = useState(editing ? editing.price_cents === 0 : false);
  const [publish, setPublish] = useState(
    editing ? editing.status === "active" : canPublish
  );
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);

  useEffect(() => {
    // preload pdf.js while the seller fills the form
    if (typeof window !== "undefined") void import("pdfjs-dist");
  }, []);

  function acceptFile(f: File | null) {
    if (!f) return;
    const ext = "." + (f.name.split(".").pop() ?? "").toLowerCase();
    if (!ACCEPTED.includes(ext))
      return setMessage("Only PDF, PPT, or PPTX files are accepted.");
    if (f.size > MAX_BYTES)
      return setMessage("File is over the 50MB limit.");
    setMessage(null);
    setFile(f);
  }

  async function suggest() {
    setSuggesting(true);
    setMessage(null);
    const res = await fetch("/api/ai/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });
    const json = await res.json();
    setSuggesting(false);
    if (!res.ok) return setMessage(json.error ?? "Suggestion failed");
    setSuggestions(json.suggestions as Suggestions);
  }

  function applySuggestion(key: keyof Suggestions) {
    if (!suggestions) return;
    const v = suggestions[key];
    if (v === undefined || v === null) return;
    if (key === "title") setTitle(String(v));
    if (key === "category") setCategory(String(v));
    if (key === "content_type") setContentType(String(v));
    if (key === "level") setLevel(String(v));
    if (key === "duration_minutes") setDuration(String(v));
    if (key === "teachability") setTeachability(String(v));
    if (key === "theme") setTheme(String(v));
    if (key === "peak_pose") setPeakPose(String(v));
  }

  function applyAll() {
    if (!suggestions) return;
    (Object.keys(suggestions) as (keyof Suggestions)[]).forEach(applySuggestion);
  }

  /** SHA-256 (hex) of a file — how we tell a real content change from a
   *  re-upload of the same file. Same hash → no swap, no buyer email. */
  async function sha256Hex(f: File): Promise<string | null> {
    try {
      const buf = await crypto.subtle.digest("SHA-256", await f.arrayBuffer());
      return [...new Uint8Array(buf)]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      return null; // no hash → treat as changed (conservative: email goes out)
    }
  }

  /** Blurred page-1 preview + page count from ONE pdf.js pass — pages is
   *  read the moment the doc opens, so even a failed render still reports
   *  it. Both are best-effort and never block publishing. */
  async function generatePreview(
    f: File
  ): Promise<{ blob: Blob | null; pages: number | null }> {
    let pages: number | null = null;
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
      const data = await f.arrayBuffer();
      const doc = await pdfjs.getDocument({ data }).promise;
      pages = doc.numPages;
      const page = await doc.getPage(1);
      const base = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: 700 / base.width });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(vp.width);
      canvas.height = Math.round(vp.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) return { blob: null, pages };
      await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise;
      const out = document.createElement("canvas");
      out.width = canvas.width;
      out.height = canvas.height;
      const octx = out.getContext("2d");
      if (!octx) return { blob: null, pages };
      octx.filter = "blur(7px)";
      octx.drawImage(canvas, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) =>
        out.toBlob((b) => resolve(b), "image/jpeg", 0.75)
      );
      return { blob, pages };
    } catch {
      return { blob: null, pages }; // best-effort — never block publishing
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const priceCents = isFree ? 0 : Math.round(parseFloat(price) * 100);
    if (!file && !isEdit) return setMessage("Add the file you're selling.");
    if (!isFree && (!Number.isFinite(priceCents) || priceCents < 100))
      return setMessage(
        "Price must be at least $1.00 (below that, fees would eat the entire sale) — or tick the free-listing box."
      );
    if (!category || !contentType || !duration || !level || !teachability || !theme.trim())
      return setMessage("Fill in every required field (marked •).");
    if (!ipChecked)
      return setMessage("Confirm the content is yours to sell.");

    setBusy(true);
    setMessage(null);
    const supabase = createClient();

    try {
      // 0) one account type: posting your first listing quietly upgrades a
      //    buyer profile to seller (the DB role guard allows this exact
      //    self-transition; product inserts require it).
      if (role === "buyer") {
        const { error: roleErr } = await supabase
          .from("profiles")
          .update({ role: "seller" })
          .eq("id", userId);
        if (roleErr)
          throw new Error(`Could not enable selling: ${roleErr.message}`);
      }

      // 1) main file → private bucket.
      //    On edit with no new file chosen, keep the existing one. When a new
      //    file IS uploaded it goes to a NEW path and the old object is left
      //    in storage on purpose — never delete something a buyer may hold.
      //    The sha256 decides whether this is a REAL content change: same
      //    hash as the current file → skip the swap entirely (no new object,
      //    no buyer email — re-uploading your own file is a no-op).
      let filePath = editing?.file_path ?? null;
      let fileHash: string | null | undefined = undefined; // undefined = untouched
      let contentChanged = false;
      let effectiveFile = file; // null = keep the current file (incl. same-hash skip)
      if (file && isEdit) {
        const h = await sha256Hex(file);
        if (h && editing!.file_sha256 && h === editing!.file_sha256) {
          effectiveFile = null; // identical content — no swap, no buyer email
        } else {
          fileHash = h;
          contentChanged = true;
        }
      } else if (file) {
        fileHash = await sha256Hex(file);
      }
      if (effectiveFile) {
        setProgress("uploading file…");
        const safeName = effectiveFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        filePath = `${userId}/${crypto.randomUUID()}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("product-files")
          .upload(filePath, effectiveFile);
        if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
      }

      // 2) blurred preview (PDF only) → public covers bucket. The same
      //    pdf.js pass reports the page count for the "what you get" row
      //    (024) — auto-captured, the seller never types it. Non-PDFs get
      //    no preview and a null count (type + size still display).
      let previewPath: string | null = editing?.preview_path ?? null;
      let filePages: number | null = null;
      if (effectiveFile && effectiveFile.name.toLowerCase().endsWith(".pdf")) {
        setProgress("creating blurred preview…");
        const { blob, pages } = await generatePreview(effectiveFile);
        filePages = pages;
        if (blob) {
          previewPath = `${userId}/preview-${crypto.randomUUID()}.jpg`;
          const { error } = await supabase.storage
            .from("covers")
            .upload(previewPath, blob, { contentType: "image/jpeg" });
          if (error) previewPath = editing?.preview_path ?? null;
        }
      }

      // 3) cover image (optional). Priority: new upload > explicit removal >
      //    keep existing. Removal only nulls the row's pointer — the old
      //    object stays in storage (house rule: never delete what's referenced
      //    elsewhere or might be); the card falls back to placeholder art.
      let coverPath: string | null = removeCover
        ? null
        : (editing?.cover_path ?? null);
      if (cover) {
        setProgress("uploading cover image…");
        const ext = (cover.name.split(".").pop() ?? "jpg").toLowerCase();
        coverPath = `${userId}/cover-${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("covers")
          .upload(coverPath, cover);
        if (error) coverPath = removeCover ? null : (editing?.cover_path ?? null);
      }

      // 4) first-time IP agreement stamp
      if (!ipAgreed) {
        await supabase
          .from("profiles")
          .update({ ip_agreement_accepted_at: new Date().toISOString() })
          .eq("id", userId);
      }

      // 5) the listing itself
      setProgress(isEdit ? "saving changes…" : "publishing…");
      const fields = {
        title: title.trim(),
        description: description.trim(),
        category,
        content_type: contentType,
        duration_minutes: parseInt(duration, 10),
        level,
        theme: theme.trim(),
        teachability,
        props: propsNeeded.trim() || null,
        anatomy_focus: anatomyFocus.trim() || null,
        usage_notes: usageNotes.trim() || null,
        peak_pose: peakPose.trim() || null,
        sequence_breakdown: sequenceBreakdown.trim() || null,
        price_cents: priceCents,
        file_path: filePath,
        cover_path: coverPath,
        preview_path: previewPath,
        // undefined = leave the stored hash untouched (no new file)
        ...(fileHash !== undefined ? { file_sha256: fileHash } : {}),
        // new file → auto-captured size + page count (024); no new file →
        // both columns stay untouched, same pattern as the hash above
        ...(effectiveFile
          ? { file_bytes: effectiveFile.size, file_pages: filePages }
          : {}),
      };

      if (isEdit) {
        // Status is normally left alone on edit — publish/unpublish is its own
        // button. The exception: flipping a live listing from free to paid
        // while Stripe isn't connected would be rejected by the DB gate
        // (migration 005), so demote it to draft and say so plainly.
        const mustDemote =
          editing!.status === "active" && priceCents > 0 && !canPublish;
        const { error: updErr } = await supabase
          .from("products")
          .update(mustDemote ? { ...fields, status: "draft" } : fields)
          .eq("id", editing!.id);
        if (updErr) throw new Error(`Save failed: ${updErr.message}`);

        // Real content change → tell prior owners (paid + free claimers).
        // The route re-verifies ownership, honors the platform kill switch
        // and each buyer's own preference, and rate-limits to 1/product/day
        // — so this call is a suggestion, not an authority. Best-effort.
        if (contentChanged) {
          fetch("/api/notify-update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId: editing!.id }),
          }).catch(() => null);
        }
        if (mustDemote)
          alert(
            "Saved — but because this listing now has a price and Stripe isn't connected yet, it's been moved back to draft. Connect Stripe and hit publish."
          );
      } else {
        const { error: insErr } = await supabase.from("products").insert({
          seller_id: userId,
          ...fields,
          status: publish && (canPublish || isFree) ? "active" : "draft",
        });
        if (insErr) throw new Error(`Save failed: ${insErr.message}`);
      }

      onClose();
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  const req = <span className="text-sage-600">•</span>;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-ink/5 bg-white p-6 text-sm shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl font-bold lowercase">
          {isEdit ? "edit listing" : "post content to sell"}
        </h3>
        <button type="button" onClick={onClose} className="text-fog hover:text-ink">
          cancel
        </button>
      </div>

      {/* drag & drop */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          acceptFile(e.dataTransfer.files?.[0] ?? null);
        }}
        onClick={() => fileInput.current?.click()}
        className={
          "cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition " +
          (dragOver
            ? "border-sage-400 bg-sage-50"
            : file
              ? "border-sage-300 bg-sage-50/50"
              : "border-ink/15 hover:border-ink/30")
        }
      >
        {file ? (
          <>
            <p className="font-semibold">{file.name}</p>
            <p className="mt-0.5 text-xs text-fog">
              {(file.size / 1024 / 1024).toFixed(1)}MB — click to swap
            </p>
          </>
        ) : isEdit ? (
          <>
            <p className="font-display font-semibold lowercase">
              keeping your current file
              {currentFileName && (
                <span className="ml-1.5 font-sans text-sm font-normal normal-case text-sage-700">
                  ({currentFileName})
                </span>
              )}
            </p>
            <p className="mt-0.5 text-xs text-fog">
              click to replace it — everyone who owns this listing, now or
              later, gets the new version, and prior owners get an email that
              an update is ready. re-uploading the identical file does nothing.
            </p>
          </>
        ) : (
          <>
            <p className="font-display font-semibold lowercase">
              drag & drop your file here {req}
            </p>
            <p className="mt-0.5 text-xs text-fog">
              PDF, PPT, or PPTX · 50MB max · this is the file buyers receive
            </p>
          </>
        )}
        <input
          ref={fileInput}
          type="file"
          accept=".pdf,.ppt,.pptx"
          className="hidden"
          onChange={(e) => acceptFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {/* Cover photo — promoted OUT of the optional-details drawer (owner
          call, Aug 2026): it's the highest-leverage optional field on the
          form — cards, the featured shelf, and link previews are all
          image-led, and no cover means placeholder art + a generic share
          image. Optional stays optional; it's just visible now. */}
      <div className="rounded-2xl border border-ink/10 bg-cream/40 p-4">
        <p className="font-display font-semibold lowercase">
          cover photo{" "}
          <span className="font-sans text-sm font-normal text-fog">
            (optional — this is what buyers see first)
          </span>
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-4">
          {coverPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverPreview} alt="new cover preview" className="h-20 w-32 rounded-xl object-cover" />
          ) : isEdit && editing!.cover_path && !removeCover ? (
            <CoverArt
              seed=""
              imagePath={editing!.cover_path}
              alt="current cover"
              className="h-20 w-32 rounded-xl"
            />
          ) : (
            <div className="flex h-20 w-32 items-center justify-center rounded-xl border border-dashed border-ink/15 text-xs text-fog">
              {removeCover ? "cover removed" : "no cover yet"}
            </div>
          )}
          <div className="flex min-w-48 flex-1 flex-col gap-1.5 text-sm">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className={fileInputCls}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setCover(f);
                setRemoveCover(false);
                setCoverPreview(f ? URL.createObjectURL(f) : null);
              }}
            />
            <span className="text-xs text-fog">
              JPG, PNG, or WebP · 5MB max
              {isEdit && editing!.cover_path && " · choosing a file replaces the current cover"}
            </span>
            {isEdit && editing!.cover_path && !cover && (
              <button
                type="button"
                onClick={() => setRemoveCover((v) => !v)}
                className="w-fit rounded-full border border-ink/10 px-3 py-1 text-xs lowercase text-fog hover:border-ink/30"
              >
                {removeCover ? "keep current cover" : "remove cover"}
              </button>
            )}
          </div>
        </div>
      </div>

      <label className="text-fog">
        description {req}
        <textarea
          className={inputCls + " mt-1"}
          rows={3}
          required
          placeholder="what's inside, who it's for, how to teach from it"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      {aiEnabled && (
        <div className="rounded-xl bg-mist/70 p-3">
          <button
            type="button"
            onClick={suggest}
            disabled={suggesting || description.trim().length < 20}
            className="rounded-full bg-sage-500 px-4 py-1.5 font-display text-sm font-semibold lowercase text-white hover:bg-sage-600 disabled:opacity-40"
          >
            {suggesting ? "thinking…" : "✨ suggest details from description"}
          </button>
          {suggestions && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {(Object.entries(suggestions) as [keyof Suggestions, unknown][])
                .filter(([, v]) => v !== null && v !== undefined && v !== "")
                .map(([k, v]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => applySuggestion(k)}
                    className="rounded-full border border-sage-300 bg-white px-3 py-1 text-xs hover:bg-sage-50"
                    title="click to use"
                  >
                    <span className="text-fog">{k.replace(/_/g, " ")}:</span>{" "}
                    <span className="font-semibold">{String(v)}</span>
                  </button>
                ))}
              <button
                type="button"
                onClick={applyAll}
                className="rounded-full bg-sage-500 px-3 py-1 text-xs font-semibold text-white hover:bg-sage-600"
              >
                accept all
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-fog">
          title {req}
          <input
            className={inputCls + " mt-1"}
            required
            maxLength={80}
            placeholder="60-min vinyasa flow — hip openers"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <div className="text-fog">
          {!isFree ? (
            <label className="block">
              your price (USD, min $1.00) {req}
              <input
                className={inputCls + " mt-1"}
                required
                type="number"
                min="1"
                step="0.01"
                placeholder="15.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <NetPreview
                price={price}
                feePercent={feePercent}
                feeFlatCents={feeFlatCents}
              />
            </label>
          ) : (
            <p className="rounded-lg bg-sage-50 px-2.5 py-1.5 text-xs text-sage-700">
              this listing will be <strong>free</strong> — buyers add it to
              their library instantly, and it can publish even before stripe
              is connected.
            </p>
          )}
          <label className="mt-2 flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={isFree}
              onChange={(e) => setIsFree(e.target.checked)}
              className="h-4 w-4 rounded accent-[var(--color-sage-500)]"
            />
            <span className="text-xs">
              free listing — a taste of your teaching, on the house
            </span>
          </label>
        </div>
        <label className="text-fog">
          content type {req}
          <select
            className={inputCls + " mt-1"}
            required
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
          >
            <option value="">choose…</option>
            {options.contentTypes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="text-fog">
          yoga style {req}
          <select
            className={inputCls + " mt-1"}
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">choose…</option>
            {options.styles.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="text-fog">
          duration {req}
          <select
            className={inputCls + " mt-1"}
            required
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          >
            <option value="">choose…</option>
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d >= 120 ? "2 hr+" : `${d} min`}
              </option>
            ))}
          </select>
        </label>
        <label className="text-fog">
          level {req}
          <select
            className={inputCls + " mt-1"}
            required
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            <option value="">choose…</option>
            {options.levels.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
        <label className="text-fog sm:col-span-2">
          theme {req}
          <input
            className={inputCls + " mt-1"}
            required
            placeholder="e.g. hip openers & letting go"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          />
        </label>
      </div>

      <div>
        <span className="text-fog">teachability {req}</span>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {TEACHABILITY.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTeachability(t.value)}
              className={
                "rounded-xl border p-3 text-left transition " +
                (teachability === t.value
                  ? "border-sage-500 bg-sage-50 ring-2 ring-sage-200"
                  : "border-ink/10 hover:border-ink/30")
              }
            >
              <span className="block font-display font-semibold lowercase">
                {t.label}
              </span>
              <span className="mt-0.5 block text-xs text-fog">{t.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <details className="rounded-xl border border-ink/10 p-4">
        <summary className="cursor-pointer font-display font-semibold lowercase">
          optional details (buyers love these)
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-fog">
            props needed
            <input className={inputCls + " mt-1"} placeholder="blocks, strap, bolster" value={propsNeeded} onChange={(e) => setPropsNeeded(e.target.value)} />
          </label>
          <label className="text-fog">
            peak pose
            <input className={inputCls + " mt-1"} placeholder="eka pada rajakapotasana" value={peakPose} onChange={(e) => setPeakPose(e.target.value)} />
          </label>
          <label className="text-fog">
            anatomy focus
            <input className={inputCls + " mt-1"} placeholder="hips, hamstrings" value={anatomyFocus} onChange={(e) => setAnatomyFocus(e.target.value)} />
          </label>
          <label className="text-fog sm:col-span-2">
            usage notes
            <textarea className={inputCls + " mt-1"} rows={2} placeholder="tips for teaching from this" value={usageNotes} onChange={(e) => setUsageNotes(e.target.value)} />
          </label>
          <label className="text-fog sm:col-span-2">
            sequence breakdown
            <textarea className={inputCls + " mt-1"} rows={2} placeholder="warm-up → standing series → peak → cool-down" value={sequenceBreakdown} onChange={(e) => setSequenceBreakdown(e.target.value)} />
          </label>
        </div>
      </details>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-mist/70 p-4">
        <input
          type="checkbox"
          checked={ipChecked}
          onChange={(e) => setIpChecked(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded accent-[var(--color-sage-500)]"
        />
        <span className="text-fog">
          I confirm this content is my original work and I own the rights to
          sell it on kula.
        </span>
      </label>

      {isEdit ? (
        <p className="rounded-xl bg-mist/70 p-3 text-sm text-fog">
          this listing stays{" "}
          <strong>{editing!.status === "active" ? "live" : editing!.status}</strong>{" "}
          — use the publish / unpublish button on the listing to change that.
        </p>
      ) : canPublish || isFree ? (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={publish}
            onChange={(e) => setPublish(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-sage-500)]"
          />
          publish immediately
        </label>
      ) : (
        <p className="rounded-xl bg-sage-50 p-3 text-sm text-sage-700">
          this saves as a <strong>draft</strong> — paid listings go live the
          moment stripe is connected (button at the top of the dashboard).
          free listings can publish right away.
        </p>
      )}

      <button
        disabled={busy}
        className="self-start rounded-full bg-sage-500 px-6 py-2.5 font-display font-semibold lowercase text-white hover:bg-sage-600 disabled:opacity-50"
      >
        {busy
          ? (progress ?? "saving…")
          : isEdit
            ? "save changes"
            : publish && (canPublish || isFree)
              ? "publish listing"
              : "save draft"}
      </button>
      {message && <p className="text-red-600">{message}</p>}
    </form>
  );
}

/**
 * Live "you'll net $X" line under the price field. Buyers always pay the
 * sticker price; kula's commission comes out of it. Mirrors lib/fees.ts
 * (feePercent already reflects this seller's negotiated rate, if any).
 */
function NetPreview({
  price,
  feePercent,
  feeFlatCents,
}: {
  price: string;
  feePercent: number;
  feeFlatCents: number;
}) {
  const priceCents = Math.round(parseFloat(price) * 100);
  if (!Number.isFinite(priceCents) || priceCents < 100) return null;
  const fee = Math.min(
    priceCents,
    Math.round((priceCents * feePercent) / 100) + feeFlatCents
  );
  return (
    <span className="mt-1.5 block rounded-lg bg-sage-50 px-2.5 py-1.5 text-xs text-sage-700">
      buyers pay {formatUsd(priceCents)} — you&apos;ll net{" "}
      <strong>{formatUsd(priceCents - fee)}</strong> per sale (after kula&apos;s{" "}
      {feePercent}% + {formatUsd(feeFlatCents)})
    </span>
  );
}
