"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatUsd } from "@/lib/fees";
import { STYLES } from "@/lib/categories";
import { CoverArt, StatTile, StatusChip, inputCls } from "@/components/ui";
import type { Order, Product } from "@/lib/types";

/* ── the whole dashboard body: stripe banner + "my content | earnings" tabs ── */
export function SellerTabs({
  userId,
  products,
  sales,
  stripeStarted,
  chargesEnabled,
}: {
  userId: string;
  products: Product[];
  sales: Order[];
  stripeStarted: boolean;
  chargesEnabled: boolean;
}) {
  const [tab, setTab] = useState<"content" | "earnings">("content");
  const [showForm, setShowForm] = useState(false);
  const earned = sales.reduce((sum, o) => sum + o.seller_amount_cents, 0);

  return (
    <div className="flex flex-col gap-6">
      {!chargesEnabled && <ConnectStripeCard started={stripeStarted} />}

      {/* segmented tabs */}
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
        <div className="flex flex-col gap-4">
          {showForm ? (
            <NewProductForm userId={userId} onClose={() => setShowForm(false)} />
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-sage-500 px-6 py-3 font-display font-semibold lowercase text-white hover:bg-sage-600 sm:w-fit"
            >
              <span aria-hidden>+</span> post content to sell
            </button>
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
              <p className="mt-1 text-fog">
                create your first listing to start earning.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-sage-500 px-6 py-3 font-display font-semibold lowercase text-white hover:bg-sage-600"
              >
                <span aria-hidden>+</span> post your first content
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {products.map((p) => (
                <ProductRow key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <StatTile label="total earned" value={formatUsd(earned)} />
            <StatTile label="sales" value={String(sales.length)} />
          </div>
          {!sales.length ? (
            <div className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-10 text-center text-fog">
              no sales yet — every practice starts somewhere.
            </div>
          ) : (
            <ul className="overflow-hidden rounded-2xl border border-ink/5 bg-white text-sm shadow-sm">
              {sales.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between border-b border-ink/5 p-4 last:border-0"
                >
                  <span className="text-fog">
                    {new Date(o.created_at).toLocaleString()}
                  </span>
                  <span className="font-semibold text-sage-700">
                    +{formatUsd(o.seller_amount_cents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm text-fog">
            payouts are deposited to your bank by Stripe on a rolling basis.
          </p>
        </div>
      )}
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
            onboarding is hosted securely by stripe.
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

function NewProductForm({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(STYLES[0]);
  const [price, setPrice] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [publish, setPublish] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const priceCents = Math.round(parseFloat(price) * 100);
    if (!file) return setMessage("Choose a file to sell.");
    if (!Number.isFinite(priceCents) || priceCents < 100)
      return setMessage("Price must be at least $1.00.");

    setBusy(true);
    setMessage(null);
    const supabase = createClient();

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${userId}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("product-files")
      .upload(path, file);
    if (uploadError) {
      setBusy(false);
      return setMessage(`Upload failed: ${uploadError.message}`);
    }

    const { error: insertError } = await supabase.from("products").insert({
      seller_id: userId,
      title,
      description,
      category,
      price_cents: priceCents,
      file_path: path,
      status: publish ? "active" : "draft",
    });
    setBusy(false);
    if (insertError) return setMessage(`Save failed: ${insertError.message}`);

    onClose();
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-ink/5 bg-white p-6 text-sm shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl font-bold lowercase">
          new listing
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-fog hover:text-ink"
        >
          cancel
        </button>
      </div>
      <input
        className={inputCls}
        required
        placeholder="title (e.g. 60-min vinyasa flow — hip openers)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className={inputCls}
        rows={3}
        placeholder="description — what's inside, who it's for, how to teach from it"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <label className="text-fog">
          style
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputCls + " mt-1"}
          >
            {STYLES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="text-fog">
          your price (USD)
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
        </label>
      </div>
      <p className="text-xs text-fog">
        you receive this full amount. the platform fee is added on top at
        checkout.
      </p>
      <label className="rounded-xl border border-dashed border-ink/15 p-4 text-fog">
        the file buyers receive (pdf, audio, video, zip…)
        <input
          type="file"
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-2 block w-full text-xs"
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={publish}
          onChange={(e) => setPublish(e.target.checked)}
          className="h-4 w-4 accent-[var(--color-sage-500)]"
        />
        publish immediately
      </label>
      <button
        disabled={busy}
        className="mt-1 self-start rounded-full bg-sage-500 px-6 py-2.5 font-display font-semibold lowercase text-white hover:bg-sage-600 disabled:opacity-50"
      >
        {busy ? "saving…" : "create listing"}
      </button>
      {message && <p className="text-red-600">{message}</p>}
    </form>
  );
}

function ProductRow({ product }: { product: Product }) {
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
    await supabase.from("products").delete().eq("id", product.id);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-ink/5 bg-white p-3 text-sm shadow-sm">
      <CoverArt
        seed={`${product.category}-${product.title}`}
        className="h-14 w-20 shrink-0 rounded-xl"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate font-display font-semibold">
          {product.title}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <StatusChip status={product.status} />
          <span className="text-fog">{formatUsd(product.price_cents)}</span>
        </div>
      </div>
      {product.status !== "suspended" && (
        <button
          onClick={toggleStatus}
          disabled={busy}
          className="rounded-full border border-ink/10 px-3.5 py-1.5 lowercase hover:border-ink/30"
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
