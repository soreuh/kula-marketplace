"use client";

import { useState } from "react";

const CATEGORIES = [
  "copyright",
  "inappropriate content",
  "misleading listing",
  "something else",
];

/**
 * "Report this listing" — rendered ONLY for logged-in users (the page
 * gates it; /api/report re-checks auth, moderation, and rate limit, so
 * the UI gate is convenience, not security). A tiny inline form under the
 * price card, not a modal: pick a category, optionally say more, send.
 * The report lands in the kula inbox as email.
 */
export default function ReportListing({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, category, details }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Something went wrong");
      return;
    }
    setDone(true);
  }

  if (done)
    return (
      <p className="mt-2 rounded-xl bg-sage-50 p-3 text-center text-xs text-sage-700">
        thanks — we&apos;ll take a look.
      </p>
    );

  if (!open)
    return (
      <p className="mt-2 text-center text-xs">
        <button
          onClick={() => setOpen(true)}
          className="lowercase text-fog underline hover:text-ink"
        >
          report this listing
        </button>
      </p>
    );

  return (
    <form
      onSubmit={submit}
      className="mt-3 flex flex-col gap-2 rounded-xl bg-mist/70 p-3 text-sm"
    >
      <p className="font-display text-sm font-semibold lowercase">
        report this listing
      </p>
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="rounded-lg border border-ink/10 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-sage-400"
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        maxLength={2000}
        rows={3}
        placeholder="anything that helps us look into it (optional)"
        className="rounded-lg border border-ink/10 bg-white px-2.5 py-1.5 text-sm outline-none placeholder:text-fog focus:border-sage-400"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-sage-500 px-4 py-1.5 font-display text-xs font-semibold lowercase text-white hover:bg-sage-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "sending…" : "send report"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs lowercase text-fog underline hover:text-ink"
        >
          cancel
        </button>
      </div>
      {error && (
        <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p>
      )}
    </form>
  );
}
