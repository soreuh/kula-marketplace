import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mailchimpSubscribe } from "@/lib/mailchimp";

/**
 * POST /api/mailing-list  { email, source: "waitlist" | "consent" }
 *
 * One door for every mailing-list signup (homepage waitlist + the
 * marketing-consent modal). Stores the email in OUR database first
 * (source of truth), then mirrors it into the Mailchimp Audience when
 * the optional keys are configured (no-op otherwise).
 */
export async function POST(request: Request) {
  const { email, source } = await request.json().catch(() => ({}));
  const clean = String(email ?? "")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) || clean.length > 320)
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  const src = source === "consent" ? "consent" : "waitlist";

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
