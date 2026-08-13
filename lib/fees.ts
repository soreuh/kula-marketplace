import type { PlatformSettings } from "./types";

/** Platform fee in cents for a given listing price. */
export function feeCents(priceCents: number, settings: PlatformSettings): number {
  const pct = Math.round((priceCents * Number(settings.fee_percent)) / 100);
  return pct + settings.fee_flat_cents;
}

/** What the buyer actually pays: listing price + platform fee. */
export function buyerTotalCents(priceCents: number, settings: PlatformSettings): number {
  return priceCents + feeCents(priceCents, settings);
}

export function formatUsd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
