"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Buyer preference (migration 022): "email me when content I own gets a
 * new version." Lives on the library page because that's where those
 * emails point. Own-row profile write; mirrors the seller's
 * sale-notifications toggle in the earnings tab.
 */
export default function UpdateEmailsToggle({
  userId,
  initial,
}: {
  userId: string;
  initial: boolean;
}) {
  const [on, setOn] = useState(initial);

  async function toggle() {
    const next = !on;
    setOn(next); // optimistic; revert on failure
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ content_update_emails: next })
      .eq("id", userId);
    if (error) setOn(!next);
  }

  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-fog">
      <input
        type="checkbox"
        checked={on}
        onChange={toggle}
        className="h-4 w-4 accent-[var(--color-sage-500)]"
      />
      email me when content i own gets updated
    </label>
  );
}
