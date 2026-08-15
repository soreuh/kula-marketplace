"use client";

import { useState } from "react";
import { Switch } from "@/components/ui";
import { setNotifySwitch, type NotifySwitchKey } from "./actions";

/**
 * The four platform-wide email kill-switches as instant Switch pills
 * (S2b) — same control, same feel as the /settings user toggles, replacing
 * the old checkbox-plus-save form (Aleks: one toggle schema project-wide).
 * Optimistic; reverts if the server action fails.
 */
const ROWS: { key: NotifySwitchKey; label: string; sub: string }[] = [
  {
    key: "notify_sale_emails",
    label: "sale emails to sellers",
    sub: '"you made a sale" + freebie-claim pings',
  },
  {
    key: "notify_content_updates",
    label: "file-update emails to buyers",
    sub: '"your content got better" — max one per listing per day',
  },
  {
    key: "notify_purchase_emails",
    label: "purchase confirmations to buyers",
    sub: '"it\'s in your library" — paid receipts and free claims',
  },
  {
    key: "notify_review_emails",
    label: "review emails, both directions",
    sub: '"how was it?" nudges to buyers · "new review" notices to sellers — daily sweep',
  },
];

export default function NotificationSwitches({
  initial,
}: {
  initial: Record<NotifySwitchKey, boolean>;
}) {
  const [on, setOn] = useState(initial);

  async function flip(key: NotifySwitchKey) {
    const next = !on[key];
    setOn((v) => ({ ...v, [key]: next }));
    try {
      const res = await setNotifySwitch(key, next);
      if (!res.ok) throw new Error();
    } catch {
      setOn((v) => ({ ...v, [key]: !next }));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {ROWS.map((r) => (
        <div
          key={r.key}
          className="flex items-start justify-between gap-4 text-sm"
        >
          <span>
            <span className="block font-semibold lowercase">{r.label}</span>
            <span className="block text-fog">{r.sub}</span>
          </span>
          <Switch on={on[r.key]} onClick={() => flip(r.key)} label={r.label} />
        </div>
      ))}
    </div>
  );
}
