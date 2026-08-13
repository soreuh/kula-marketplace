"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LeafLogo } from "@/components/ui";

/**
 * Marketing consent — asked once per user, 800ms after first login.
 * Can't be dismissed without a choice (spec).
 */
export default function ConsentModal({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  async function choose(consent: boolean) {
    setBusy(true);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ marketing_consent: consent })
      .eq("id", userId);
    if (consent) {
      // DB + Mailchimp mirror (when keyed); duplicates are fine
      await fetch("/api/mailing-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "consent" }),
      }).catch(() => null);
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-5">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 text-center shadow-xl">
        <div className="flex justify-center">
          <LeafLogo size={48} />
        </div>
        <h2 className="mt-4 font-display text-2xl font-bold lowercase">
          stay in the loop?
        </h2>
        <p className="mt-2 text-sm text-fog">
          can we send you occasional updates about new content and features on
          kula? no spam, unsubscribe any time.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => choose(false)}
            disabled={busy}
            className="flex-1 rounded-full border border-ink/15 px-4 py-2.5 font-display font-semibold lowercase hover:border-ink/40 disabled:opacity-50"
          >
            no thanks
          </button>
          <button
            onClick={() => choose(true)}
            disabled={busy}
            className="flex-1 rounded-full bg-sage-500 px-4 py-2.5 font-display font-semibold lowercase text-white hover:bg-sage-600 disabled:opacity-50"
          >
            yes please
          </button>
        </div>
      </div>
    </div>
  );
}
