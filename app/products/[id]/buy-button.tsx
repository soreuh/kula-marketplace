"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BuyButton({
  productId,
  loggedIn,
  totalLabel,
  free = false,
}: {
  productId: string;
  loggedIn: boolean;
  totalLabel: string;
  free?: boolean;
}) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    if (!loggedIn) {
      router.push("/login");
      return;
    }
    setBusy(true);
    setError(null);
    if (free) {
      // $0 listing: record the claim, no Stripe involved
      const res = await fetch("/api/claim-free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const json = await res.json();
      setBusy(false);
      if (!res.ok) {
        setError(json.error ?? "Something went wrong");
        return;
      }
      router.refresh(); // the price card flips to the download state
      return;
    }
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Something went wrong");
      return;
    }
    window.location.href = json.url; // → Stripe Checkout
  }

  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-mist/70 p-4 text-sm">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded accent-[var(--color-sage-500)]"
        />
        <span className="text-fog">
          I agree to kula&apos;s{" "}
          <a href="/terms" className="underline" target="_blank">
            licensing terms
          </a>
          . I understand this content is for personal teaching use only and may
          not be resold or redistributed.
        </span>
      </label>
      <button
        onClick={buy}
        disabled={busy || !agreed}
        className="mt-4 w-full rounded-full bg-sage-500 px-6 py-3.5 font-display font-semibold lowercase text-white transition hover:bg-sage-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy
          ? free
            ? "adding…"
            : "redirecting…"
          : free
            ? "add to your library — free"
            : `buy for ${totalLabel}`}
      </button>
      {error && (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-center text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
