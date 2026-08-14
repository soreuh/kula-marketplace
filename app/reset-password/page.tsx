"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthCard, Note, btnPrimary, inputCls } from "@/components/ui";

/**
 * Landing page for the recovery link Supabase emails from
 * /forgot-password. The browser client exchanges the link's code for a
 * temporary session automatically on load; we wait for that, then let
 * the user set a new password. The exchange only works in the browser
 * that requested the link (PKCE) — anything else shows the retry path.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">(
    "checking"
  );
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let done = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        done = true;
        setStatus("ready");
      }
    });

    // already exchanged (or already signed in)?
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        done = true;
        setStatus("ready");
      }
    });

    const t = setTimeout(() => {
      if (!done) setStatus("invalid");
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
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
        <h1 className="font-display text-3xl font-bold lowercase">
          set a new password
        </h1>

        {status === "checking" && (
          <p className="mt-4 text-sm text-fog">checking your reset link…</p>
        )}

        {status === "invalid" && (
          <div className="mt-4">
            <Note tone="notice">
              this link is expired, already used, or was opened in a different
              browser than the one that requested it.
            </Note>
            <Link
              href="/forgot-password"
              className={`mt-4 ${btnPrimary}`}
            >
              request a new link
            </Link>
          </div>
        )}

        {status === "ready" && (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
            <input
              className={inputCls}
              type="password"
              required
              minLength={6}
              placeholder="new password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              disabled={busy}
              className={`mt-2 w-full justify-center ${btnPrimary}`}
            >
              {busy ? "saving…" : "save new password"}
            </button>
            {message && <Note>{message}</Note>}
          </form>
        )}
    </AuthCard>
  );
}
