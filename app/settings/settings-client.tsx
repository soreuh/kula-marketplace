"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Note, Switch, btnSmall, inputCls } from "@/components/ui";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/site";

/**
 * Settings client (S1 + S2 of the settings consolidation, 2026-08-15).
 * Account: change email (auth change → migration 031's trigger mirrors the
 * confirmed address into profiles.email so notification mail never goes
 * stale) + change password (before this, the only path was logging out and
 * using forgot-password). Email preferences: EVERY per-user toggle in one
 * place — the library and earnings-tab toggles moved here (one home per
 * behavior). Deliberately NOT here: self-serve deletion (privacy §5
 * promises a handled process — the contact line is the feature) and a
 * mailing-list toggle (bundled signup consent by owner decision; Mailchimp
 * campaigns carry their own unsubscribe). Paid receipts have no toggle on
 * purpose: they're proof of purchase.
 */
export default function SettingsClient({
  userId,
  email,
  isSeller,
  prefs,
}: {
  userId: string;
  email: string;
  isSeller: boolean;
  prefs: {
    content_update_emails: boolean;
    review_nudge_emails: boolean;
    free_claim_emails: boolean;
    sale_notifications: boolean;
  };
}) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="font-display text-3xl font-bold lowercase">settings</h1>
      <p className="mt-1 text-fog">account maintenance, in one place.</p>

      <Section title="account">
        <div className="text-sm text-fog">signed in as</div>
        <div className="font-semibold">{email}</div>
        <EmailForm />
        <PasswordForm />
        <p className="mt-6 border-t border-ink/5 pt-4 text-sm text-fog">
          to close your account, email{" "}
          <a href={CONTACT_MAILTO} className="underline hover:text-ink">
            {CONTACT_EMAIL}
          </a>{" "}
          and we&apos;ll handle it per the privacy policy.
        </p>
      </Section>

      <Section title="email preferences">
        <div className="flex flex-col gap-5">
          <PrefToggle
            userId={userId}
            column="content_update_emails"
            initial={prefs.content_update_emails}
            label="content updates"
            sub="when a file you own gets a new version"
          />
          <PrefToggle
            userId={userId}
            column="review_nudge_emails"
            initial={prefs.review_nudge_emails}
            label="review reminders"
            sub="a one-time nudge to rate something you picked up"
          />
          <PrefToggle
            userId={userId}
            column="free_claim_emails"
            initial={prefs.free_claim_emails}
            label="free download confirmations"
            sub="when a freebie lands in your library"
          />
          {isSeller && (
            <PrefToggle
              userId={userId}
              column="sale_notifications"
              initial={prefs.sale_notifications}
              label="sales &amp; reviews"
              sub="when you make a sale, someone grabs a freebie, or a review comes in"
            />
          )}
        </div>
        <p className="mt-5 border-t border-ink/5 pt-4 text-xs text-fog">
          receipts for paid purchases always send — that&apos;s your proof of
          purchase. occasional kula news rides the mailing list from signup;
          every one carries its own unsubscribe link.
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

/** One per-user email pref: optimistic own-row write, revert on failure.
 *  Visual = the shared ui.tsx Switch (S2b — same pill as admin's). */
function PrefToggle({
  userId,
  column,
  initial,
  label,
  sub,
}: {
  userId: string;
  column: string;
  initial: boolean;
  label: string;
  sub: string;
}) {
  const [on, setOn] = useState(initial);

  async function flip() {
    const next = !on;
    setOn(next);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ [column]: next })
      .eq("id", userId);
    if (error) setOn(!next);
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm">
        <span className="block font-semibold lowercase">{label}</span>
        <span className="block text-fog">{sub}</span>
      </span>
      <Switch on={on} onClick={flip} label={label} />
    </div>
  );
}

function EmailForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser(
      { email },
      // return-path rule: the confirm link lands on LOGIN (the clicker is
      // usually logged out in that browser) and login returns to settings
      {
        emailRedirectTo: `${window.location.origin}/login?next=${encodeURIComponent("/settings")}`,
      }
    );
    setBusy(false);
    if (error) {
      setMsg({ tone: "error", text: error.message });
    } else {
      setMsg({
        tone: "success",
        text: "confirmation sent — check your new inbox (and your current one), click the link(s), then log in with your new email.",
      });
      setEmail("");
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 border-t border-ink/5 pt-4">
      <h3 className="font-display font-semibold lowercase">change email</h3>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          placeholder="new email address"
          autoComplete="email"
          className={inputCls}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className={`${btnSmall} shrink-0 self-start sm:self-auto`} disabled={busy}>
          {busy ? "sending…" : "change email"}
        </button>
      </div>
      {msg && (
        <Note tone={msg.tone} className="mt-3">
          {msg.text}
        </Note>
      )}
    </form>
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
