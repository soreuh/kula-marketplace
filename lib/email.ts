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
 * Sale-notification emails via Resend. Feature-flagged: if RESEND_API_KEY
 * is not set, this is a silent no-op. Always fail-soft — an email problem
 * must never break order processing.
 */
export async function sendSaleEmail(opts: {
  to: string;
  productTitle: string;
  netCents: number;
  grossCents: number;
  feeCents: number;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "kula <onboarding@resend.dev>",
        to: opts.to,
        subject: `you made a sale on kula — ${usd(opts.netCents)} net 🌿`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#4b6a52">someone just bought your content</h2>
            <p><strong>${esc(opts.productTitle)}</strong> sold for ${usd(opts.grossCents)}.</p>
            <p>Your net: <strong style="color:#4b6a52">${usd(opts.netCents)}</strong>
            <span style="color:#888">(kula fee ${usd(opts.feeCents)})</span></p>
            <p style="color:#888;font-size:13px">Payouts go to your bank monthly via
            Stripe.</p>
          </div>`,
      }),
    });
  } catch {
    // never let email failures affect the webhook
  }
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
  const key = process.env.RESEND_API_KEY;
  if (!key || opts.to.length === 0) return 0;

  let sent = 0;
  for (const to of opts.to) {
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
          subject: `updated: "${opts.productTitle}" has a new version 🌿`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
              <h2 style="color:#4b6a52">your content got better</h2>
              <p>The teacher behind <strong>${esc(opts.productTitle)}</strong> just
              updated the file. Your purchase includes every update — the
              latest version is waiting in your library.</p>
              <p><a href="${opts.siteUrl}/library"
                style="color:#4b6a52;font-weight:bold">open your library →</a></p>
              <p style="color:#888;font-size:13px">You're receiving this because
              you own this content on kula. Lifetime access means updates too.</p>
            </div>`,
        }),
      });
      if (res.ok) sent++;
    } catch {
      // keep going — one bad address must not block the rest
    }
  }
  return sent;
}
