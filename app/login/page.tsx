"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthCard, Note, btnPrimary, inputCls } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.push("/dashboard");
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
          <Link href="/signup" className="text-sage-600 underline">
            create an account
          </Link>
        </p>
    </AuthCard>
  );
}
