/**
 * Site-wide constants — single source of truth.
 *
 * CONTACT_EMAIL is THE public contact address. Every mailto link, the
 * footer, and the legal pages read it from here — change it in one place
 * (or set NEXT_PUBLIC_CONTACT_EMAIL in env to override without a code
 * edit, e.g. at handover).
 *
 * NOTE: the .md guides (SETUP/HANDOVER) mention the address in prose —
 * those need a manual find-replace if it ever changes. Third-party
 * dashboards (Stripe, Mailchimp, Resend) hold their own copies too.
 */
export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "discoverkula@gmail.com";

export const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}`;
