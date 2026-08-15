import "server-only";

import { formatUsd as usd } from "@/lib/fees";

/**
 * Listing titles are seller-typed free text that gets interpolated into
 * email HTML — escape it, or a title like `<a href=evil>` becomes a live
 * link in mail kula sends to buyers. Subjects are headers, not HTML, and
 * stay raw.
 */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * One Resend POST — the shared scaffold every email kula sends goes
 * through. Feature-flagged: no RESEND_API_KEY = silent no-op (false).
 * Never throws — an email problem must never break the caller
 * (order processing, claims, update notifications).
 */
async function sendViaResend(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "kula <onboarding@resend.dev>",
        to,
        subject,
        html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Sale notification to the SELLER ("you made a sale"). */
export async function sendSaleEmail(opts: {
  to: string;
  productTitle: string;
  netCents: number;
  grossCents: number;
  feeCents: number;
}): Promise<void> {
  await sendViaResend(
    opts.to,
    `you made a sale on kula — ${usd(opts.netCents)} net 🌿`,
    `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#4b6a52">someone just bought your content</h2>
        <p><strong>${esc(opts.productTitle)}</strong> sold for ${usd(opts.grossCents)}.</p>
        <p>Your net: <strong style="color:#4b6a52">${usd(opts.netCents)}</strong>
        <span style="color:#888">(kula fee ${usd(opts.feeCents)})</span></p>
        <p style="color:#888;font-size:13px">Payouts go to your bank monthly via
        Stripe.</p>
      </div>`
  );
}

/**
 * "It's in your library" — the BUYER's confirmation, sent by the webhook
 * (paid orders) and /api/claim-free ($0 claims). Transactional receipt:
 * no per-buyer toggle, just the platform switch (admin → notifications,
 * migration 025), checked by the callers. Stripe's own card receipt is a
 * separate dashboard setting, flipped at live activation.
 */
export async function sendPurchaseEmail(opts: {
  to: string;
  productTitle: string;
  paidCents: number; // 0 = free claim
  siteUrl: string;
}): Promise<void> {
  const free = opts.paidCents === 0;
  await sendViaResend(
    opts.to,
    free
      ? `added to your library: "${opts.productTitle}" 🌿`
      : `your kula purchase: "${opts.productTitle}" 🌿`,
    `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#4b6a52">it&#39;s in your library</h2>
        <p><strong>${esc(opts.productTitle)}</strong> is yours —
        ${free ? "a gift from the teacher" : `${usd(opts.paidCents)}, one-time payment`}.
        Lifetime access: download any time, and the teacher&#39;s future
        updates are included.</p>
        <p><a href="${opts.siteUrl}/library"
          style="color:#4b6a52;font-weight:bold">open your library →</a></p>
        <p style="color:#888;font-size:13px">You're receiving this because you
        ${free ? "added a free listing to your kula library" : "made a purchase on kula"}.</p>
      </div>`
  );
}

/**
 * "The file you own was updated" email to prior buyers — sent by
 * /api/notify-update after a REAL content change (different sha256),
 * behind the platform kill switch and a 1/product/24h rate limit.
 * Same posture as sale emails: no key = silent no-op, failures are
 * swallowed, and one bad address never blocks the rest.
 */
export async function sendContentUpdateEmails(opts: {
  to: string[];
  productTitle: string;
  siteUrl: string;
}): Promise<number> {
  let sent = 0;
  // sequential on purpose (matches the original) — and one bad address
  // never blocks the rest, since sendViaResend never throws.
  for (const to of opts.to) {
    const ok = await sendViaResend(
      to,
      `updated: "${opts.productTitle}" has a new version 🌿`,
      `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#4b6a52">your content got better</h2>
          <p>The teacher behind <strong>${esc(opts.productTitle)}</strong> just
          updated the file. Your purchase includes every update — the
          latest version is waiting in your library.</p>
          <p><a href="${opts.siteUrl}/library"
            style="color:#4b6a52;font-weight:bold">open your library →</a></p>
          <p style="color:#888;font-size:13px">You're receiving this because
          you own this content on kula. Lifetime access means updates too.</p>
        </div>`
    );
    if (ok) sent++;
  }
  return sent;
}
