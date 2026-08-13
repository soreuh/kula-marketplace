"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { inputCls } from "@/components/ui";

export default function ReviewForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return setError("Pick a star rating first.");
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return setError("Please log in.");
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    const { error: insertError } = await supabase.from("reviews").insert({
      product_id: productId,
      buyer_id: user.id,
      rating,
      body: body.trim() || null,
      reviewer_name: profile?.display_name ?? "verified buyer",
    });
    setBusy(false);
    if (insertError) return setError(insertError.message);
    router.refresh();
  }

  return (
    <form
      onSubmit={submit}
      className="mt-4 rounded-2xl border border-ink/5 bg-white p-5 shadow-sm"
    >
      <h3 className="font-display font-bold lowercase">leave a review</h3>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill={(hover || rating) >= n ? "var(--color-sage-500)" : "none"}
              stroke={(hover || rating) >= n ? "var(--color-sage-500)" : "#b0b2aa"}
              strokeWidth="1.6"
            >
              <path d="M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6-5.4-2.9L6.6 19.7l1.1-6L3.2 9.4l6.1-.8z" />
            </svg>
          </button>
        ))}
      </div>
      <textarea
        className={inputCls + " mt-3"}
        rows={3}
        placeholder="how did teaching from it go? (optional)"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <button
        disabled={busy}
        className="mt-3 rounded-full bg-sage-500 px-5 py-2 font-display text-sm font-semibold lowercase text-white hover:bg-sage-600 disabled:opacity-50"
      >
        {busy ? "posting…" : "post review"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}
