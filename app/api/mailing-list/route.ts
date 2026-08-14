import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mailchimpSubscribe } from "@/lib/mailchimp";

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
