"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { inputCls } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/reset-password` }
    );
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <div className="rounded-2xl border border-ink/5 bg-white p-8 shadow-sm">
        <h1 className="font-display text-3xl font-bold lowercase">
          reset your password
        </h1>

        {sent ? (
          <p className="mt-4 rounded-xl bg-sage-50 p-4 text-sm text-sage-700">
            if an account exists for that address, a reset link is on its way —
            check your inbox (and spam). the link works in this browser.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-fog">
              enter your account email and we&apos;ll send you a link to set a
              new one.
            </p>
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
              <input
                className={inputCls}
                type="email"
                required
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button
                disabled={busy}
                className="mt-2 rounded-full bg-sage-500 px-6 py-3 font-display font-semibold lowercase text-white hover:bg-sage-600 disabled:opacity-50"
              >
                {busy ? "sending…" : "send reset link"}
              </button>
            </form>
            {message && (
              <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {message}
              </p>
            )}
          </>
        )}

        <p className="mt-5 text-center text-sm text-fog">
          remembered it?{" "}
          <Link href="/login" className="text-sage-600 underline">
            log in
          </Link>
        </p>
      </div>
    </div>
  );
}
