/**
 * Site-wide constants — single source of truth.
 *
 * CONTACT_EMAIL is THE public contact address. Every mailto link, the
 * footer, and the legal pages read it from here — change it in one place
 * (or set NEXT_PUBLIC_CONTACT_EMAIL in env to override without a code
 * edit, e.g. at handover).
 *
 * Aug 2026: the default moved from discoverkula@gmail.com to
 * hello@kula-marketplace.com — the domain address created in the cutover,
 * which FORWARDS to discoverkula@gmail.com via Porkbun. Same inbox, branded
 * on the outside, and it's already the From-address for Resend + Mailchimp.
 * That forward depends on keeping Porkbun's nameservers (see the cutover
 * runbook) — if DNS ever moves, this address dies silently.
 *
 * NOTE: the .md guides (SETUP/HANDOVER) mention the address in prose —
 * those need a manual find-replace if it ever changes. Third-party
 * dashboards (Stripe, Mailchimp, Resend) hold their own copies too.
 */
export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@kula-marketplace.com";

export const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}`;

/**
 * SITE_URL — the site's public origin for places that need an ABSOLUTE
 * url (emails, mailto bodies). Env-first like everything else; the
 * fallback is the production domain, never localhost — a link in an
 * email or a report should never point at a dev box. (lib/stripe's
 * siteUrl() keeps its own localhost-friendly fallback for checkout
 * redirects, which SHOULD hit the box you're testing on.)
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://kula-marketplace.com";

/**
 * safeNext — the ONLY way a ?next= return path may be honored (block N1).
 *
 * Return-path integrity: every doorway that interrupts a user (login wall,
 * signup wall) carries where they were going in ?next=, and login/signup
 * send them back there afterward. This validator is the security half:
 * only SAME-SITE relative paths survive. It must start with exactly one
 * "/" — "//evil.com" (protocol-relative) and "/\evil.com" (backslash
 * trick) are rejected — so a crafted login link can never bounce a fresh
 * session to another site. Anything invalid → null → the caller uses its
 * role-aware default landing.
 */
export function safeNext(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\"))
    return null;
  return raw;
}

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
