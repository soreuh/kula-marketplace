"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatUsd, priceLabel, timeAgo } from "@/lib/fees";
import { DURATIONS, TEACHABILITY } from "@/lib/categories";
import { CoverArt, StatTile, StatusChip, Stars, inputCls } from "@/components/ui";
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

type Ratings = Record<string, { avg: number; count: number }>;

export default function DashboardClient({
  userId,
  role,
  products,
  sales,
  ratings,
  stripeStarted,
  chargesEnabled,
  saleNotifications,
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
  saleNotifications: boolean;
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
          saleNotifications={saleNotifications}
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
        stripe deposits your earnings to your bank monthly (around the 1st),
        once your balance reaches $5.00. your kula rate: {feeRateLabel}.
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
    const res = await fetch("/api/stripe/onboard", { method: "POST" });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Could not start Stripe onboarding");
      return;
    }
    window.location.href = json.url;
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
        className="mt-4 w-full rounded-full bg-sage-500 px-6 py-3 font-display font-semibold lowercase text-white hover:bg-sage-600 disabled:opacity-50"
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
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "draft" | "suspended"
  >("all");

  const needle = q.trim().toLowerCase();
  const visible = products.filter(
    (p) =>
      (statusFilter === "all" || p.status === statusFilter) &&
      (!needle ||
        `${p.title} ${p.theme ?? ""} ${p.category ?? ""} ${p.content_type ?? ""}`
          .toLowerCase()
          .includes(needle))
  );
  const hasSuspended = products.some((p) => p.status === "suspended");

  return (
    <div className="flex flex-col gap-4">
      {showForm ? (
        <UploadDialog
          userId={userId}
          role={role}
          ipAgreed={ipAgreed}
          aiEnabled={aiEnabled}
          canPublish={chargesEnabled}
          feePercent={feePercent}
          feeFlatCents={feeFlatCents}
          options={options}
          onClose={() => setShowForm(false)}
        />
      ) : (
        <div>
          <button
            onClick={() => setShowForm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-sage-500 px-6 py-3 font-display font-semibold lowercase text-white hover:bg-sage-600 sm:w-fit"
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
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-sage-500 px-6 py-3 font-display font-semibold lowercase text-white hover:bg-sage-600"
          >
            <span aria-hidden>+</span> post your first content
          </button>
        </div>
      ) : (
        <>
          {/* search + status filter over your own listings */}
          {products.length > 1 && (
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
              <ProductRow key={p.id} product={p} canPublish={chargesEnabled} />
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
}: {
  product: Product;
  canPublish: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggleStatus() {
    setBusy(true);
    const supabase = createClient();
    await supabase
      .from("products")
      .update({ status: product.status === "active" ? "draft" : "active" })
      .eq("id", product.id);
    setBusy(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Delete "${product.title}"? This can't be undone.`)) return;
    setBusy(true);
    const supabase = createClient();
    if (product.file_path) {
      await supabase.storage.from("product-files").remove([product.file_path]);
    }
    const coverPaths = [product.cover_path, product.preview_path].filter(
      Boolean
    ) as string[];
    if (coverPaths.length) {
      await supabase.storage.from("covers").remove(coverPaths);
    }
    await supabase.from("products").delete().eq("id", product.id);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-ink/5 bg-white p-3 text-sm shadow-sm">
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
      {product.status !== "suspended" && (
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
      )}
      <button
        onClick={remove}
        disabled={busy}
        className="rounded-full border border-red-200 px-3.5 py-1.5 lowercase text-red-700 hover:bg-red-50"
      >
        delete
      </button>
    </div>
  );
}

/* ───────────────────────── earnings tab ───────────────────────── */

function EarningsTab({
  userId,
  products,
  sales,
  ratings,
  saleNotifications,
  openUpload,
}: {
  userId: string;
  products: Product[];
  sales: SaleRow[];
  ratings: Ratings;
  saleNotifications: boolean;
  openUpload: () => void;
}) {
  const [notify, setNotify] = useState(saleNotifications);
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

  async function toggleNotify() {
    const next = !notify;
    setNotify(next);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ sale_notifications: next })
      .eq("id", userId);
  }

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

      {/* notifications */}
      <label className="flex w-fit cursor-pointer items-center gap-3 rounded-2xl border border-ink/5 bg-white px-5 py-3.5 shadow-sm">
        <button
          type="button"
          role="switch"
          aria-checked={notify}
          onClick={toggleNotify}
          className={
            "relative h-6 w-11 rounded-full transition " +
            (notify ? "bg-sage-500" : "bg-ink/15")
          }
        >
          <span
            className={
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all " +
              (notify ? "left-[22px]" : "left-0.5")
            }
          />
        </button>
        <span className="text-sm">
          email me when I make a sale
          <span className="block text-xs text-fog">
            sent to your account email
          </span>
        </span>
      </label>
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
  onClose: () => void;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<string>("");
  const [contentType, setContentType] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [theme, setTheme] = useState("");
  const [teachability, setTeachability] = useState<string>("");
  // optional
  const [anatomyFocus, setAnatomyFocus] = useState("");
  const [usageNotes, setUsageNotes] = useState("");
  const [peakPose, setPeakPose] = useState("");
  const [sequenceBreakdown, setSequenceBreakdown] = useState("");
  const [propsNeeded, setPropsNeeded] = useState("");

  const [ipChecked, setIpChecked] = useState(ipAgreed);
  const [isFree, setIsFree] = useState(false); // $0 marketing freebie
  const [publish, setPublish] = useState(canPublish); // drafts-only until Stripe (free exempt)
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

  async function generatePreview(f: File): Promise<Blob | null> {
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
      const data = await f.arrayBuffer();
      const doc = await pdfjs.getDocument({ data }).promise;
      const page = await doc.getPage(1);
      const base = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: 700 / base.width });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(vp.width);
      canvas.height = Math.round(vp.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise;
      const out = document.createElement("canvas");
      out.width = canvas.width;
      out.height = canvas.height;
      const octx = out.getContext("2d");
      if (!octx) return null;
      octx.filter = "blur(7px)";
      octx.drawImage(canvas, 0, 0);
      return await new Promise((resolve) =>
        out.toBlob((b) => resolve(b), "image/jpeg", 0.75)
      );
    } catch {
      return null; // preview is best-effort — never block publishing
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const priceCents = isFree ? 0 : Math.round(parseFloat(price) * 100);
    if (!file) return setMessage("Add the file you're selling.");
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

      // 1) main file → private bucket
      setProgress("uploading file…");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${userId}/${crypto.randomUUID()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("product-files")
        .upload(filePath, file);
      if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

      // 2) blurred preview (PDF only) → public covers bucket
      let previewPath: string | null = null;
      if (file.name.toLowerCase().endsWith(".pdf")) {
        setProgress("creating blurred preview…");
        const blob = await generatePreview(file);
        if (blob) {
          previewPath = `${userId}/preview-${crypto.randomUUID()}.jpg`;
          const { error } = await supabase.storage
            .from("covers")
            .upload(previewPath, blob, { contentType: "image/jpeg" });
          if (error) previewPath = null;
        }
      }

      // 3) cover image (optional)
      let coverPath: string | null = null;
      if (cover) {
        setProgress("uploading cover image…");
        const ext = (cover.name.split(".").pop() ?? "jpg").toLowerCase();
        coverPath = `${userId}/cover-${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("covers")
          .upload(coverPath, cover);
        if (error) coverPath = null;
      }

      // 4) first-time IP agreement stamp
      if (!ipAgreed) {
        await supabase
          .from("profiles")
          .update({ ip_agreement_accepted_at: new Date().toISOString() })
          .eq("id", userId);
      }

      // 5) the listing itself
      setProgress("publishing…");
      const { error: insErr } = await supabase.from("products").insert({
        seller_id: userId,
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
        status: publish && (canPublish || isFree) ? "active" : "draft",
      });
      if (insErr) throw new Error(`Save failed: ${insErr.message}`);

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
          post content to sell
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
          <label className="text-fog">
            cover image
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="mt-1 block w-full text-xs"
              onChange={(e) => setCover(e.target.files?.[0] ?? null)}
            />
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

      {canPublish || isFree ? (
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
