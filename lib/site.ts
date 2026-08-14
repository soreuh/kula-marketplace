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

/**
 * TERMS_VERSION — which revision of /terms + /privacy a user agreed to.
 *
 * The signup checkbox sends this string with the account; migration 014
 * records it on the profile alongside a server-stamped timestamp, so
 * "which document did they actually accept?" has an answer later.
 *
 * BUMP THIS (and the "last updated" line on both legal pages) whenever
 * the terms or privacy policy change in substance — e.g. after the
 * lawyer pass, or if an arbitration clause is ever added. Rows keep the
 * old value, which is how you'd find who needs to re-consent.
 */
export const TERMS_VERSION = "2026-08-14";
