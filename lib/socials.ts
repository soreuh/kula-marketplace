/**
 * Curated social networks for instructor profiles — an allowlist, not a
 * free-form link list, so profiles stay clean and every href is built by
 * US from a bare handle (a stored value can never smuggle a scheme).
 *
 * Adding a network later = one entry here. Zero migrations: handles live
 * in profiles.socials (jsonb map, migration 027) keyed by `key`.
 *
 * Shared by the edit form (normalize on save) and the profile page
 * (chips on render) — no "server-only": nothing secret here.
 */
export const SOCIAL_NETWORKS = [
  { key: "instagram", label: "instagram", base: "https://instagram.com/" },
  { key: "tiktok", label: "tiktok", base: "https://tiktok.com/@" },
  { key: "youtube", label: "youtube", base: "https://youtube.com/@" },
  { key: "facebook", label: "facebook", base: "https://facebook.com/" },
  { key: "pinterest", label: "pinterest", base: "https://pinterest.com/" },
  { key: "x", label: "x", base: "https://x.com/" },
] as const;

export type SocialKey = (typeof SOCIAL_NETWORKS)[number]["key"];
export type Socials = Partial<Record<SocialKey, string>>;

/** "@handle", a pasted profile URL, or a bare handle → bare handle. */
export function normalizeHandle(v: string): string | null {
  const t = v
    .trim()
    .replace(
      /^https?:\/\/(www\.)?(instagram\.com|tiktok\.com|youtube\.com|facebook\.com|pinterest\.com|x\.com|twitter\.com)\//i,
      ""
    )
    .replace(/^@/, "")
    .replace(/\/+$/, "")
    .trim();
  return t || null;
}

/** Handle → the network's canonical profile URL (handle is URI-encoded,
 *  so whatever was stored can only ever be a path segment). */
export function socialUrl(base: string, handle: string): string {
  return `${base}${encodeURIComponent(handle)}`;
}

/** The subset of a stored socials map worth rendering, in display order. */
export function presentSocials(
  socials: Record<string, string> | null | undefined
): { key: SocialKey; label: string; handle: string; url: string }[] {
  if (!socials) return [];
  return SOCIAL_NETWORKS.filter((n) => socials[n.key]?.trim()).map((n) => ({
    key: n.key,
    label: n.label,
    handle: socials[n.key]!.trim(),
    url: socialUrl(n.base, socials[n.key]!.trim()),
  }));
}
