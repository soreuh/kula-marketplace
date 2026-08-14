import type { PlatformSettings } from "./types";

/**
 * COMMISSION MODEL (v2): the buyer pays the listed price; Kula's commission
 * (fee_percent of the price + fee_flat_cents) comes OUT of it; the seller
 * nets the rest. Example at 30% + 25¢: $10.00 listing → $3.25 to Kula,
 * $6.75 to the seller.
 */

/**
 * Kula's commission in cents for a given listing price.
 * `overridePercent` is a per-seller negotiated rate (partner deals) that
 * replaces the platform percent; the flat fee always applies. NULL/undefined
 * = platform default. Example at 15% + 25¢: $10.00 → $1.75 fee, $8.25 net.
 */
export function feeCents(
  priceCents: number,
  settings: PlatformSettings,
  overridePercent?: number | null
): number {
  const percent =
    overridePercent === null || overridePercent === undefined
      ? Number(settings.fee_percent)
      : Number(overridePercent);
  const pct = Math.round((priceCents * percent) / 100);
  return Math.min(priceCents, pct + settings.fee_flat_cents);
}

/** What the seller actually receives. */
export function sellerNetCents(
  priceCents: number,
  settings: PlatformSettings,
  overridePercent?: number | null
): number {
  return priceCents - feeCents(priceCents, settings, overridePercent);
}

/** Card/price label: free listings say "free", everything else is dollars. */
export function priceLabel(cents: number): string {
  return cents === 0 ? "free" : formatUsd(cents);
}

export function formatUsd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

/** "3m ago" / "2h ago" / "5d ago" for transaction lists. */
export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months}mo ago` : `${Math.floor(months / 12)}y ago`;
}
