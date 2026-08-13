import "server-only";

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

  const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
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
            <p><strong>${opts.productTitle}</strong> sold for ${usd(opts.grossCents)}.</p>
            <p>Your net: <strong style="color:#4b6a52">${usd(opts.netCents)}</strong>
            <span style="color:#888">(kula fee ${usd(opts.feeCents)})</span></p>
            <p style="color:#888;font-size:13px">Payouts go to your bank monthly via
            Stripe once your balance reaches $5.00. You can turn these emails off in
            your dashboard.</p>
          </div>`,
      }),
    });
  } catch {
    // never let email failures affect the webhook
  }
}
