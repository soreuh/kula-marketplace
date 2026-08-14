"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { inputCls } from "@/components/ui";

/**
 * The seller's one public response to a review. RLS + a DB trigger
 * (migration 010) enforce that only this product's seller can write it,
 * and that a seller can never alter the buyer's stars or words.
 * Saving an empty box removes the reply.
 */
export default function ReviewReply({
  reviewId,
  initial,
}: {
  reviewId: string;
  initial: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const clean = text.trim();
    const { error: err } = await supabase
      .from("reviews")
      .update({
        reply: clean || null,
        replied_at: clean ? new Date().toISOString() : null,
      })
      .eq("id", reviewId);
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 text-sm lowercase text-sage-600 underline hover:text-sage-700"
      >
        {initial ? "edit your reply" : "reply as the teacher"}
      </button>
    );

  return (
    <div className="mt-2.5 flex flex-col gap-2">
      <textarea
        className={inputCls}
        rows={2}
        maxLength={1000}
        placeholder="thank them, add context, or clear something up…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-full bg-sage-500 px-4 py-1.5 text-sm font-semibold lowercase text-white hover:bg-sage-600 disabled:opacity-50"
        >
          {busy ? "saving…" : initial ? "update reply" : "post reply"}
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setText(initial ?? "");
          }}
          className="text-sm lowercase text-fog hover:text-ink"
        >
          cancel
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
