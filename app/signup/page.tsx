"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { inputCls } from "@/components/ui";

/**
 * ONE unified signup — no buyer/seller fork. Every account can both buy
 * and sell; posting your first listing (or connecting Stripe) upgrades
 * the profile behind the scenes.
 */
export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: "buyer", display_name: displayName } },
    });

    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    if (!data.session) {
      setMessage(
        "Check your email for a confirmation link, then log in."
      );
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <div className="rounded-2xl border border-ink/5 bg-white p-8 shadow-sm">
        <h1 className="font-display text-3xl font-bold lowercase">
          join the kula
        </h1>
        <p className="mt-1 text-sm text-fog">
          one account for everything — buy resources you trust, and sell the
          work you&apos;ve already created.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <input
            className={inputCls}
            placeholder="display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
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
            minLength={6}
            placeholder="password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            disabled={busy}
            className="mt-2 rounded-full bg-sage-500 px-6 py-3 font-display font-semibold lowercase text-white hover:bg-sage-600 disabled:opacity-50"
          >
            {busy ? "creating…" : "sign up"}
          </button>
        </form>
        {message && (
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            {message}
          </p>
        )}
        <p className="mt-5 text-center text-sm text-fog">
          already have an account?{" "}
          <Link href="/login" className="text-sage-600 underline">
            log in
          </Link>
        </p>
      </div>
    </div>
  );
}
