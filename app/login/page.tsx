"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/site";
import { AuthCard, Note, btnPrimary, inputCls } from "@/components/ui";

/**
 * Return-path integrity (block N1): if the user was interrupted on the way
 * to somewhere — buy button, library, an email link — that destination
 * arrives here as ?next= and login sends them straight back to it. The
 * param is validated by safeNext (same-site relative paths only) and is
 * preserved across the login ↔ signup cross-links so switching forms
 * doesn't drop it.
 *
 * With no next: role-aware landing. Sellers/admins live in the dashboard;
 * pure buyers get explore — the old always-/dashboard default marched
 * buyers into the "connect stripe" seller pitch mid-purchase.
 */
export default function LoginPage() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setBusy(false);
      setMessage(error.message);
      return;
    }
    let dest = next;
    if (!dest) {
      const { data: me } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      dest = me?.role === "buyer" ? "/explore" : "/dashboard";
    }
    router.push(dest);
    router.refresh();
  }

  return (
    <AuthCard>
        <h1 className="font-display text-3xl font-bold lowercase">welcome back</h1>
        <p className="mt-1 text-sm text-fog">log in to your kula account.</p>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <input
            className={inputCls}
            type="email"
            required
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className={inputCls}
            type="password"
            required
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Link
            href="/forgot-password"
            className="self-end text-xs lowercase text-fog underline hover:text-ink"
          >
            forgot your password?
          </Link>
          <button
            disabled={busy}
            className={`mt-2 w-full justify-center ${btnPrimary}`}
          >
            {busy ? "logging in…" : "log in"}
          </button>
        </form>
        {message && (
          <Note className="mt-3">{message}</Note>
        )}
        <p className="mt-5 text-center text-sm text-fog">
          new here?{" "}
          <Link
            href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
            className="text-sage-600 underline"
          >
            create an account
          </Link>
        </p>
    </AuthCard>
  );
}
