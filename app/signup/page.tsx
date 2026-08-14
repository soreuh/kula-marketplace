"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { inputCls } from "@/components/ui";
import { TERMS_VERSION } from "@/lib/site";

/**
 * ONE unified signup — no buyer/seller fork. Every account can both buy
 * and sell; posting your first listing (or connecting Stripe) upgrades
 * the profile behind the scenes.
 *
 * LEGAL CONSENT (clickwrap): agreeing to /terms + /privacy is an explicit,
 * unchecked-by-default checkbox — not fine print under the button. Courts
 * enforce affirmative assent far more reliably than passive "by signing up
 * you agree" notices, which matters here because the terms carry real
 * mechanics (IP ownership, assumption of risk, chargebacks). The consent
 * travels in the signup metadata; migration 014 stamps it onto the profile
 * with a SERVER-side timestamp + TERMS_VERSION, so acceptance is provable
 * after the fact. Keep the box unchecked by default.
 *
 * MARKETING (owner decision, Aug 2026): the consent line ALSO covers
 * marketing email, and every account is pushed into the Mailchimp
 * audience on signup — which is why the post-login consent modal was
 * removed rather than left to ask a question already answered here.
 * This is a BUNDLED consent: fine under US CAN-SPAM with a working
 * unsubscribe + physical address in every campaign, NOT valid consent
 * under GDPR/CASL. Splitting this into two checkboxes (terms required,
 * marketing optional) is the change to make if EU/Canada recipients
 * ever matter. Privacy §3 is worded to match — keep them in sync.
 */
export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setMessage(
        "please agree to the terms & conditions and privacy policy to continue."
      );
      return;
    }
    setBusy(true);
    setMessage(null);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: "buyer",
          display_name: displayName,
          terms_accepted: true,
          terms_version: TERMS_VERSION,
        },
      },
    });

    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    // Mailing list: disclosed in the consent line above. Never block or
    // fail signup on this — Mailchimp is best-effort by design.
    if (email) {
      fetch("/api/mailing-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "account" }),
      }).catch(() => null);
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
          <label className="mt-1 flex items-start gap-2.5 text-sm text-fog">
            <input
              type="checkbox"
              required
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-sage-500"
            />
            <span>
              i agree to the{" "}
              <Link
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sage-600 underline"
              >
                terms &amp; conditions
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sage-600 underline"
              >
                privacy policy
              </Link>
              , and to receiving occasional updates from kula — unsubscribe
              any time.
            </span>
          </label>
          <button
            disabled={busy || !agreed}
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
