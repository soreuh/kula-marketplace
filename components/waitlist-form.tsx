"use client";

import { useState } from "react";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "already">("idle");
  const [error, setError] = useState<string | null>(null);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    setError(null);
    // one door for all signups: DB first, Mailchimp mirror when keyed
    const res = await fetch("/api/mailing-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source: "waitlist" }),
    }).catch(() => null);
    const json = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      setState("idle");
      setError(json?.error ?? "that didn't work — try again?");
      return;
    }
    setState(json?.already ? "already" : "done");
  }

  if (state === "done" || state === "already")
    return (
      <p className="rounded-xl bg-sage-50 p-4 text-center text-sm font-semibold text-sage-700">
        {state === "done"
          ? "you're on the list 🌿 we'll be in touch."
          : "you're already on the list 🌿"}
      </p>
    );

  return (
    <form onSubmit={join} className="flex gap-2">
      <input
        type="email"
        required
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="min-w-0 flex-1 rounded-xl border border-ink/10 bg-white px-4 py-2.5 placeholder:text-fog focus:border-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-200"
      />
      <button
        disabled={state === "busy"}
        className="rounded-xl bg-sage-500 px-5 py-2.5 font-display font-semibold lowercase text-white hover:bg-sage-600 disabled:opacity-50"
      >
        {state === "busy" ? "…" : "join"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
