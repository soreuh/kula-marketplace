import "server-only";

/**
 * Mailchimp Audience sync — OPTIONAL, completely dark without env keys.
 *
 *   MAILCHIMP_API_KEY      Mailchimp → profile icon → Account & billing →
 *                          Extras → API keys. Looks like `abc123...-us21`
 *                          (the suffix after the dash is the datacenter).
 *   MAILCHIMP_AUDIENCE_ID  Mailchimp → Audience → Settings → "Audience name
 *                          and defaults" → Audience ID.
 *
 * Emails ALWAYS land in our own `mailing_list` table first — that's the
 * source of truth and it belongs to the owner regardless of Mailchimp.
 * This mirrors each signup into the Mailchimp Audience (tagged with where
 * it came from) so newsletters/campaigns can be sent from Mailchimp's UI.
 *
 * Failures are swallowed on purpose: a Mailchimp hiccup must never break
 * a signup. (Sale-notification emails are a different, transactional job —
 * they stay on the optional RESEND_API_KEY path in lib/email.ts.)
 */
export function mailchimpEnabled(): boolean {
  return !!(
    process.env.MAILCHIMP_API_KEY && process.env.MAILCHIMP_AUDIENCE_ID
  );
}

export async function mailchimpSubscribe(
  email: string,
  source: string
): Promise<void> {
  if (!mailchimpEnabled()) return;
  const key = process.env.MAILCHIMP_API_KEY!;
  const audience = process.env.MAILCHIMP_AUDIENCE_ID!;
  const dc = key.split("-").pop(); // e.g. "us21"
  if (!dc || dc === key) return; // malformed key — stay dark

  try {
    const res = await fetch(
      `https://${dc}.api.mailchimp.com/3.0/lists/${audience}/members`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`anystring:${key}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_address: email,
          status: "subscribed",
          tags: [`kula-${source}`],
        }),
      }
    );
    // 400 usually means "Member Exists" — already subscribed, all good.
    if (!res.ok && res.status !== 400) {
      console.error("mailchimp: subscribe failed", res.status);
    }
  } catch (err) {
    console.error("mailchimp: subscribe error", err);
  }
}
