"use client";

import { useState } from "react";
import { StatTile } from "@/components/ui";
import { formatUsd } from "@/lib/fees";

/**
 * Top-line tiles with a period toggle. Defaults to YTD (owner decision,
 * Aug 2026 — the old tiles were silently ALL-TIME). Refunded orders are
 * excluded from revenue and annotated instead, so the numbers reconcile
 * against Stripe. "free downloads" counts $0 claim-free orders — those
 * are paid-status rows written by /api/claim-free, never by Stripe.
 */
type OrderLite = {
  amount_cents: number;
  fee_cents: number;
  status: string;
  created_at: string;
};

const PERIODS = [
  ["mtd", "this month"],
  ["3m", "3 mo"],
  ["6m", "6 mo"],
  ["12m", "12 mo"],
  ["ytd", "ytd"],
  ["all", "all time"],
] as const;
type Period = (typeof PERIODS)[number][0];

function periodStart(p: Period, now: Date): Date | null {
  const y = now.getFullYear();
  switch (p) {
    case "mtd": return new Date(y, now.getMonth(), 1);
    case "3m": return new Date(y, now.getMonth() - 3, now.getDate());
    case "6m": return new Date(y, now.getMonth() - 6, now.getDate());
    case "12m": return new Date(y, now.getMonth() - 12, now.getDate());
    case "ytd": return new Date(y, 0, 1);
    case "all": return null;
  }
}

export default function PeriodTiles({ orders }: { orders: OrderLite[] }) {
  const [period, setPeriod] = useState<Period>("ytd");
  const start = periodStart(period, new Date());

  const inPeriod = orders.filter(
    (o) => !start || new Date(o.created_at) >= start
  );
  const paid = inPeriod.filter((o) => o.status === "paid");
  const paidMoney = paid.filter((o) => o.amount_cents > 0);
  const freeClaims = paid.filter((o) => o.amount_cents === 0);
  const refunded = inPeriod.filter((o) => o.status === "refunded");

  const feeRevenue = paidMoney.reduce((s, o) => s + o.fee_cents, 0);
  const grossVolume = paidMoney.reduce((s, o) => s + o.amount_cents, 0);

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {PERIODS.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setPeriod(value)}
            className={
              "rounded-full px-3.5 py-1.5 text-sm lowercase transition " +
              (period === value
                ? "bg-sage-500 font-semibold text-white"
                : "border border-ink/10 bg-white text-fog hover:border-ink/30")
            }
          >
            {label}
          </button>
        ))}
        {refunded.length > 0 && (
          <span className="ml-auto text-xs text-fog">
            {refunded.length} refunded order{refunded.length === 1 ? "" : "s"}{" "}
            excluded from revenue
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="your fee revenue" value={formatUsd(feeRevenue)} />
        <StatTile label="gross volume" value={formatUsd(grossVolume)} />
        <StatTile label="paid orders" value={String(paidMoney.length)} />
        <StatTile label="free downloads" value={String(freeClaims.length)} />
      </div>
    </section>
  );
}
