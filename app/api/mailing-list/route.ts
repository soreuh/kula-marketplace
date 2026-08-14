import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mailchimpSubscribe } from "@/lib/mailchimp";
import { clientIp, rateLimitOk } from "@/lib/rate-limit";

/**
 * POST /api/mailing-list  { email, source: "waitlist" | "account" | "consent" }
 *
 * One door for every mailing-list signup. Stores the email in OUR
 * database first (source of truth), then mirrors it into the Mailchimp
 * Audience when the optional keys are configured (no-op otherwise).
 *
 *   waitlist — homepage email box (anonymous visitor)
 *   account  — every new account; the signup consent line discloses it
 *              (owner decision Aug 2026, migration 015). Tagged
 *              `kula-account` so account signups stay separable from
 *              cold waitlist emails in Mailchimp.
 *   consent  — legacy, from the removed post-login consent modal. Kept
 *              so historical rows/tags still mean something.
 */
export async function POST(request: Request) {
  // Rate limit (migration 018): this endpoint is deliberately captcha-free
  // (owner decision) and mirrors into the owner's Mailchimp audience, so an
  // unthrottled loop could poison her list — and the spam complaints would
  // land on the kula-marketplace.com sending reputation. 5/hour per IP is
  // far above any human (waitlist + account signup + consent combined) and
  // useless for bulk abuse. Fail-open: a limiter error never blocks signup.
  const ip = clientIp(request);
  if (!(await rateLimitOk(`mailing-list:${ip}`, 5, 3600)))
    return NextResponse.json(
      { error: "Too many signups from this connection — try again later." },
      { status: 429 }
    );

  const { email, source } = await request.json().catch(() => ({}));
  const clean = String(email ?? "")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) || clean.length > 320)
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  const src =
    source === "consent" || source === "account" ? source : "waitlist";

  const supabase = await createClient();
  const { error } = await supabase
    .from("mailing_list")
    .insert({ email: clean, source: src });
  const already = error?.code === "23505"; // unique violation = already on it
  if (error && !already)
    return NextResponse.json(
      { error: "That didn't work — try again?" },
      { status: 500 }
    );

  // Best-effort Mailchimp mirror — dark without keys, never blocks signup.
  await mailchimpSubscribe(clean, src);

  return NextResponse.json({ ok: true, already });
}
