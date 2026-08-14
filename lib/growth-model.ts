/**
 * kula growth model — TypeScript replica of ../kula-growth-model.xlsx.
 *
 * The spreadsheet forecasts 24 months from ~9 scenario drivers plus shared
 * cost assumptions; everything else in it is arithmetic. This file
 * reproduces that arithmetic EXACTLY (verified cell-for-cell against the
 * Mid sheet, 2026-08-14) so the admin dashboard can compare live actuals
 * to the curve — and recompute the whole curve when the owner edits a
 * driver in admin (platform_settings.growth_model, migration 020).
 *
 * If the xlsx changes shape (new drivers, different formulas), update BOTH.
 * DEFAULT_MID_DRIVERS mirrors the xlsx "Mid" column as of 2026-08-14.
 */

export type GrowthDrivers = {
  /** early adopters at launch */
  startingSellers: number;
  /** net-of-churn monthly seller growth, months 1–12 (0.16 = +16%/mo) */
  growthEarly: number;
  /** growth tapers once the easy recruits are in, months 13–24 */
  growthLate: number;
  /** catalogue each seller arrives with */
  listingsPerSellerStart: number;
  /** how fast catalogues deepen (listings/seller added per month) */
  newListingsPerMonth: number;
  /** demand at start: how often one listing sells per month */
  salesPerListingStart: number;
  /** marketing/SEO/network compounding, added per month */
  demandGrowth: number;
  /** ceiling on per-listing velocity */
  demandCap: number;
  /** typical listing price, cents */
  avgPriceCents: number;
  // ---- shared cost assumptions ----
  /** stripe standard card rate */
  stripePct: number;
  /** stripe flat per charge, cents */
  stripeFlatCents: number;
  /** live-mode Express: $/active seller with a payout that month, cents */
  connectFeeCents: number;
  /** share of sellers actually paid out in a given month */
  payoutShare: number;
};

/** The xlsx "Mid" column, 2026-08-14. */
export const DEFAULT_MID_DRIVERS: GrowthDrivers = {
  startingSellers: 4,
  growthEarly: 0.16,
  growthLate: 0.08,
  listingsPerSellerStart: 3,
  newListingsPerMonth: 0.15,
  salesPerListingStart: 0.2,
  demandGrowth: 0.012,
  demandCap: 0.55,
  avgPriceCents: 1500,
  stripePct: 0.029,
  stripeFlatCents: 30,
  connectFeeCents: 200,
  payoutShare: 0.55,
};

/** Merge stored jsonb overrides over the defaults, ignoring junk keys. */
export function resolveDrivers(
  stored: Partial<GrowthDrivers> | null | undefined
): GrowthDrivers {
  const d = { ...DEFAULT_MID_DRIVERS };
  if (!stored) return d;
  for (const k of Object.keys(d) as (keyof GrowthDrivers)[]) {
    const v = stored[k];
    if (typeof v === "number" && Number.isFinite(v)) d[k] = v;
  }
  return d;
}

export type ModelMonth = {
  month: number;
  sellers: number;
  listingsPerSeller: number;
  listings: number;
  salesPerListing: number;
  sales: number;
  gmvCents: number;
  kulaFeeCents: number;
  stripeCostCents: number;
  connectCostCents: number;
  kulaNetCents: number;
  sellersEarnCents: number;
};

/**
 * One month of the model, 1-indexed, exactly per the xlsx:
 *   sellers(m)  = sellers(m-1) × (1 + [m≤12 ? early : late])
 *   lps(m)      = start + newPerMonth × m
 *   spl(m)      = min(start + demandGrowth × m, cap)
 *   fee/stripe are per-sale on the average price; connect is per-seller.
 * The fee comes from LIVE platform settings, not the drivers — the model
 * always reflects the commission actually configured.
 */
export function modelMonth(
  d: GrowthDrivers,
  month: number,
  feePercent: number,
  feeFlatCents: number
): ModelMonth {
  const m = Math.max(1, Math.floor(month));
  let sellers = d.startingSellers;
  for (let i = 2; i <= m; i++)
    sellers *= 1 + (i <= 12 ? d.growthEarly : d.growthLate);
  const listingsPerSeller = d.listingsPerSellerStart + d.newListingsPerMonth * m;
  const listings = sellers * listingsPerSeller;
  const salesPerListing = Math.min(
    d.salesPerListingStart + d.demandGrowth * m,
    d.demandCap
  );
  const sales = listings * salesPerListing;
  const gmvCents = sales * d.avgPriceCents;
  const kulaFeeCents =
    sales * ((feePercent / 100) * d.avgPriceCents + feeFlatCents);
  const stripeCostCents = sales * (d.stripePct * d.avgPriceCents + d.stripeFlatCents);
  const connectCostCents = sellers * d.payoutShare * d.connectFeeCents;
  const kulaNetCents = kulaFeeCents - stripeCostCents - connectCostCents;
  return {
    month: m,
    sellers,
    listingsPerSeller,
    listings,
    salesPerListing,
    sales,
    gmvCents,
    kulaFeeCents,
    stripeCostCents,
    connectCostCents,
    kulaNetCents,
    sellersEarnCents: gmvCents - kulaFeeCents,
  };
}

/**
 * Which model month "now" falls in, from the admin-set launch date.
 * Calendar months, 1-indexed: launch month itself is month 1.
 * Returns 0 when now is before launch (render a pre-launch state).
 */
export function modelMonthIndex(launchDate: string, now: Date): number {
  const l = new Date(launchDate + "T00:00:00Z");
  if (Number.isNaN(l.getTime())) return 0;
  const idx =
    (now.getUTCFullYear() - l.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - l.getUTCMonth()) +
    1;
  return idx < 1 ? 0 : idx;
}
