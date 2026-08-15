import { NextResponse } from "next/server";
import { requireUser, requireActiveAccount } from "@/lib/api-guards";
import { rateLimitOk } from "@/lib/rate-limit";
import { sendReportEmail } from "@/lib/email";
import { siteUrl } from "@/lib/stripe";

const CATEGORIES = [
  "copyright",
  "inappropriate content",
  "misleading listing",
  "something else",
];

/**
 * POST /api/report  { productId, category, details? }
 *
 * "Report this listing" — REGISTERED USERS ONLY (owner decision: no
 * drive-by spam). The page hides the control from anon visitors; this
 * route is the real gate: auth, moderation status, and a 5/day/user
 * ceiling via the 018 counters (fail-open, like all of them — a limiter
 * hiccup must never eat a real copyright report).
 *
 * The report is delivered as MAIL to the kula inbox — deliberately no
 * reports table: at this scale the inbox is the queue, replying to the
 * reporter is one click, and admin already has the tools to act
 * (suspend listing / pause account). Unlike kula's other emails, the
 * mail here IS the feature, so a failed send returns an error instead
 * of quietly succeeding.
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;

  const paused = await requireActiveAccount(
    supabase,
    user.id,
    "Your account is paused — reporting is disabled. Contact kula if you think this is a mistake."
  );
  if (paused) return paused;

  const { productId, category, details } = await request
    .json()
    .catch(() => ({}));
  if (!productId || !CATEGORIES.includes(category))
    return NextResponse.json(
      { error: "Missing or invalid fields" },
      { status: 400 }
    );
  const text = typeof details === "string" ? details.slice(0, 2000) : "";

  // The listing must be visible to THIS user (RLS scope) — you can't
  // probe or report ids you can't see.
  const { data: product } = await supabase
    .from("products")
    .select("id, title")
    .eq("id", productId)
    .single();
  if (!product)
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  if (!(await rateLimitOk(`report:${user.id}`, 5, 86400)))
    return NextResponse.json(
      {
        error:
          "You've sent a few reports today already — thank you. If it's urgent, email us directly (address in the footer).",
      },
      { status: 429 }
    );

  const sent = await sendReportEmail({
    productTitle: product.title,
    productId: product.id,
    category,
    details: text,
    reporterEmail: user.email ?? "unknown",
    siteUrl: siteUrl(),
  });
  if (!sent)
    return NextResponse.json(
      {
        error:
          "Could not submit the report — please email us directly (address in the footer).",
      },
      { status: 500 }
    );

  return NextResponse.json({ ok: true });
}
