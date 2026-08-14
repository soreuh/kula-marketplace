"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthCard, Note, btnPrimary, inputCls } from "@/components/ui";

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
    <AuthCard>
        <h1 className="font-display text-3xl font-bold lowercase">
          reset your password
        </h1>

        {sent ? (
          <Note tone="success" className="mt-4">
            if an account exists for that address, a reset link is on its way —
            check your inbox (and spam). the link works in this browser.
          </Note>
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
                className={`mt-2 w-full justify-center ${btnPrimary}`}
              >
                {busy ? "sending…" : "send reset link"}
              </button>
            </form>
            {message && (
              <Note className="mt-3">{message}</Note>
            )}
          </>
        )}

        <p className="mt-5 text-center text-sm text-fog">
          remembered it?{" "}
          <Link href="/login" className="text-sage-600 underline">
            log in
          </Link>
        </p>
    </AuthCard>
  );
}
