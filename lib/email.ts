import "server-only";

import { formatUsd as usd } from "@/lib/fees";
import { CONTACT_EMAIL, SITE_URL as SITE } from "@/lib/site";

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

/** Brand tokens, mirrored from globals.css. Inlined on every element
 *  because email clients strip stylesheets; system font stack because
 *  web fonts (Poppins) don't load in mail. */
const T = {
  cream: "#f6f6f2",
  ink: "#26281f",
  fog: "#7d8078",
  sage: "#6b8f72", // sage-500, the site's primary button
  sageDark: "#4b6a52", // sage-700, headings
  border: "#e4e6de",
  font: "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif",
};

/** The branded frame every kula email shares: cream backdrop, white
 *  rounded card, lowercase wordmark, muted footer. No images — a text
 *  wordmark can't be blocked by image-shy clients; Outlook merely squares
 *  the corners. Content inside the card still esc()'s anything
 *  seller-typed. */
function shell(content: string): string {
  return `
  <div style="background:${T.cream};padding:32px 16px;font-family:${T.font}">
    <div style="max-width:480px;margin:0 auto">
      <p style="text-align:center;margin:0 0 14px;font-size:24px;font-weight:700;letter-spacing:.01em;color:${T.sageDark}">kula</p>
      <div style="background:#ffffff;border:1px solid ${T.border};border-radius:16px;padding:28px 26px;color:${T.ink};font-size:15px;line-height:1.55">
        ${content}
      </div>
      <p style="text-align:center;margin:14px 0 0;font-size:12px;color:${T.fog}">
        kula — buy and sell yoga teaching content ·
        <a href="${SITE}" style="color:${T.fog}">kula-marketplace.com</a>
      </p>
    </div>
  </div>`;
}

const h2 = (t: string) =>
  `<h2 style="margin:0 0 12px;font-size:20px;letter-spacing:-.01em;color:${T.sageDark}">${t}</h2>`;

/** Pill CTA, sage like the site's btnPrimary. Plain <a> + padding renders
 *  everywhere; worst case (old Outlook) it degrades to a bold link. */
const btn = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:${T.sage};color:#ffffff;font-weight:600;text-decoration:none;padding:12px 26px;border-radius:999px">${label}</a>`;

/** Muted small print at the bottom of the card. */
const fine = (text: string) =>
  `<p style="color:${T.fog};font-size:13px;margin:18px 0 0">${text}</p>`;

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
    shell(`
      ${h2("someone just bought your content")}
      <p style="margin:0 0 10px"><strong>${esc(opts.productTitle)}</strong> sold for ${usd(opts.grossCents)}.</p>
      <p style="margin:0 0 20px">your net: <strong style="color:${T.sageDark}">${usd(opts.netCents)}</strong>
      <span style="color:${T.fog}">(kula fee ${usd(opts.feeCents)})</span></p>
      ${btn(`${SITE}/dashboard`, "view your earnings →")}
      ${fine("payouts go to your bank monthly via Stripe.")}
    `)
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
    shell(`
      ${h2("it&#39;s in your library")}
      <p style="margin:0 0 20px"><strong>${esc(opts.productTitle)}</strong> is yours —
      ${free ? "a gift from the teacher" : `${usd(opts.paidCents)}, one-time payment`}.
      lifetime access: download any time, and the teacher&#39;s future
      updates are included.</p>
      ${btn(`${opts.siteUrl}/library`, "open your library →")}
      ${fine(
        `you're receiving this because you ${
          free ? "added a free listing to your kula library" : "made a purchase on kula"
        }.`
      )}
    `)
  );
}

/**
 * Listing report → the kula inbox (CONTACT_EMAIL). Sent by /api/report
 * (registered users only, rate-limited there). Unlike the other emails
 * this one IS the feature — the route surfaces a failed send instead of
 * swallowing it, hence the boolean. Reporter's address is included so
 * replying is one click.
 */
export async function sendReportEmail(opts: {
  productTitle: string;
  productId: string;
  category: string;
  details: string;
  reporterEmail: string;
  siteUrl: string;
}): Promise<boolean> {
  const detailsHtml = opts.details
    ? esc(opts.details).replace(/\n/g, "<br>")
    : "<em>none given</em>";
  return sendViaResend(
    CONTACT_EMAIL,
    `listing report: "${opts.productTitle}" (${opts.category})`,
    shell(`
      ${h2("a listing was reported")}
      <p style="margin:0 0 10px"><strong>${esc(opts.productTitle)}</strong><br>
      <a href="${opts.siteUrl}/products/${opts.productId}" style="color:${T.sageDark}">${opts.siteUrl}/products/${opts.productId}</a></p>
      <p style="margin:0 0 10px">category: <strong>${esc(opts.category)}</strong><br>
      reported by: ${esc(opts.reporterEmail)}</p>
      <p style="margin:0 0 20px">${detailsHtml}</p>
      ${btn(`${opts.siteUrl}/dashboard/admin`, "open admin →")}
      ${fine("act from admin if needed: suspend the listing, or pause the account.")}
    `)
  );
}

/**
 * One-time "how was it?" nudge to a BUYER, ~3 days after purchase — sent
 * by the daily review sweep (/api/cron/review-sweep), stamped on the
 * order so it can never repeat. Reviews are the flywheel: featured score,
 * instructor rating, and the search stars all run on them.
 */
export async function sendReviewNudgeEmail(opts: {
  to: string;
  productTitle: string;
  productId: string;
  siteUrl: string;
}): Promise<boolean> {
  return sendViaResend(
    opts.to,
    `how was "${opts.productTitle}"? 🌿`,
    shell(`
      ${h2("how was it?")}
      <p style="margin:0 0 20px">you picked up <strong>${esc(opts.productTitle)}</strong> a few
      days ago. if you&#39;ve had a chance to teach with it, a quick rating
      helps other teachers find the good stuff — and tells the teacher who
      made it that it landed.</p>
      ${btn(`${opts.siteUrl}/products/${opts.productId}`, "leave a review →")}
      ${fine("this is a one-time note — you own the content forever either way.")}
    `)
  );
}

/**
 * "You got a new review" to a SELLER — batched by the daily sweep into
 * one email per seller per run, stamped per review. Respects the platform
 * review switch AND the seller's own sale_notifications toggle.
 */
export async function sendNewReviewEmail(opts: {
  to: string;
  items: { productTitle: string; productId: string; rating: number }[];
  siteUrl: string;
}): Promise<boolean> {
  const stars = (r: number) => "★".repeat(r) + "☆".repeat(Math.max(0, 5 - r));
  const lines = opts.items
    .map(
      (i) => `
      <p style="margin:0 0 10px"><span style="color:#b58900;letter-spacing:2px">${stars(i.rating)}</span>
      &nbsp;on <a href="${opts.siteUrl}/products/${i.productId}"
      style="color:${T.sageDark};font-weight:600">${esc(i.productTitle)}</a></p>`
    )
    .join("");
  const n = opts.items.length;
  return sendViaResend(
    opts.to,
    n === 1 ? `you got a new review 🌿` : `you got ${n} new reviews 🌿`,
    shell(`
      ${h2(n === 1 ? "someone reviewed your content" : "new reviews on your content")}
      ${lines}
      <p style="margin:8px 0 20px">a short reply goes a long way — buyers read
      how teachers respond.</p>
      ${btn(
        n === 1
          ? `${opts.siteUrl}/products/${opts.items[0].productId}`
          : `${opts.siteUrl}/dashboard`,
        n === 1 ? "read + reply →" : "open your dashboard →"
      )}
      ${fine("you're receiving this because sale notifications are on in your earnings tab.")}
    `)
  );
}

/**
 * Seller ping when a FREE listing is claimed. Free claims never touch the
 * Stripe webhook, so without this the seller heard nothing. Rides the
 * SALE-email controls (platform notify_sale_emails switch + the seller's
 * own sale_notifications toggle) — no new knob; a seller who finds it
 * noisy flips the toggle they already have.
 */
export async function sendFreeClaimEmail(opts: {
  to: string;
  productTitle: string;
  siteUrl: string;
}): Promise<void> {
  await sendViaResend(
    opts.to,
    `your free listing found a student 🌿`,
    shell(`
      ${h2("someone grabbed your freebie")}
      <p style="margin:0 0 20px"><strong>${esc(opts.productTitle)}</strong> was just
      added to another teacher&#39;s library. free listings are how new
      buyers meet your work — they can review it now, and it puts your
      paid content in front of them.</p>
      ${btn(`${opts.siteUrl}/dashboard`, "view your listings →")}
      ${fine("you're receiving this because sale notifications are on in your earnings tab.")}
    `)
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
      shell(`
        ${h2("your content got better")}
        <p style="margin:0 0 20px">the teacher behind <strong>${esc(opts.productTitle)}</strong> just
        updated the file. your purchase includes every update — the
        latest version is waiting in your library.</p>
        ${btn(`${opts.siteUrl}/library`, "open your library →")}
        ${fine("you're receiving this because you own this content on kula. lifetime access means updates too.")}
      `)
    );
    if (ok) sent++;
  }
  return sent;
}
