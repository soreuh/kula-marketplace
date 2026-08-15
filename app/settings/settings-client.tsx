"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Note, btnSmall, inputCls } from "@/components/ui";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/site";

/**
 * Settings client (S1): account section (password change while logged in —
 * before this, the only path was logging out and using forgot-password) +
 * shortcuts to the surfaces that keep their own editors. Deliberately NOT
 * here: self-serve account deletion (privacy §5 promises a handled
 * process — the contact line below is the feature) and change-email
 * (lands in S2 with the auth→profiles email mirror so notification mail
 * can't go stale). All styling reuses ui.tsx primitives.
 */
export default function SettingsClient({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="font-display text-3xl font-bold lowercase">settings</h1>
      <p className="mt-1 text-fog">account maintenance, in one place.</p>

      <Section title="account">
        <div className="text-sm text-fog">signed in as</div>
        <div className="font-semibold">{email}</div>
        <PasswordForm />
        <p className="mt-6 border-t border-ink/5 pt-4 text-sm text-fog">
          to close your account, email{" "}
          <a href={CONTACT_MAILTO} className="underline hover:text-ink">
            {CONTACT_EMAIL}
          </a>{" "}
          and we&apos;ll handle it per the privacy policy.
        </p>
      </Section>

      <Section title="shortcuts">
        <div className="-mx-2 flex flex-col gap-1">
          <Shortcut
            href={`/profile/${userId}`}
            label="edit your public profile"
            sub="name, photo, bio, banner, website & socials"
          />
          <Shortcut
            href="/dashboard"
            label="selling & payouts"
            sub="listings, earnings, stripe"
          />
          <Shortcut href="/library" label="your library" sub="everything you own" />
        </div>
        {/* S2 removes this pointer when the toggles move in */}
        <p className="mt-4 text-xs text-fog">
          email preferences are moving here soon — for now, content-update
          emails are in your library and sale notifications in the dashboard
          earnings tab.
        </p>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 rounded-2xl border border-ink/5 bg-white p-6 shadow-sm">
      <h2 className="font-display text-xl font-bold lowercase">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function PasswordForm() {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== confirm) {
      setMsg({ tone: "error", text: "passwords don't match." });
      return;
    }
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      setMsg({ tone: "error", text: error.message });
    } else {
      setMsg({ tone: "success", text: "password updated." });
      setPw("");
      setConfirm("");
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 border-t border-ink/5 pt-4">
      <h3 className="font-display font-semibold lowercase">change password</h3>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          type="password"
          required
          minLength={6}
          placeholder="new password (min 6 characters)"
          autoComplete="new-password"
          className={inputCls}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="repeat new password"
          autoComplete="new-password"
          className={inputCls}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      {msg && (
        <Note tone={msg.tone} className="mt-3">
          {msg.text}
        </Note>
      )}
      <button className={`${btnSmall} mt-3`} disabled={busy}>
        {busy ? "saving…" : "update password"}
      </button>
    </form>
  );
}

function Shortcut({
  href,
  label,
  sub,
}: {
  href: string;
  label: string;
  sub: string;
}) {
  return (
    <Link href={href} className="rounded-xl px-2 py-2 transition hover:bg-mist">
      <span className="block font-semibold lowercase">{label}</span>
      <span className="block text-sm text-fog">{sub}</span>
    </Link>
  );
}
