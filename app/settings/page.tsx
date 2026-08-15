import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SettingsClient from "./settings-client";

export const metadata: Metadata = { title: "settings" };

/**
 * /settings — the one home for account maintenance (settings
 * consolidation S1, 2026-08-15). Server shell: auth-guard + profile
 * fetch; everything interactive lives in the client component. S2 moves
 * every email-preference toggle in here.
 */
export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // return-path rule: the doorway carries the destination
  if (!user) redirect("/login?next=/settings");

  // select * on purpose: tolerant of 031 not being applied yet — missing
  // pref columns read undefined and every toggle shows ON (the default).
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const prof = (profile ?? {}) as Record<string, unknown>;
  const on = (k: string) => prof[k] !== false;

  return (
    <SettingsClient
      userId={user.id}
      email={(prof.email as string) ?? user.email ?? ""}
      isSeller={(prof.role ?? "buyer") !== "buyer"}
      prefs={{
        content_update_emails: on("content_update_emails"),
        review_nudge_emails: on("review_nudge_emails"),
        free_claim_emails: on("free_claim_emails"),
        sale_notifications: on("sale_notifications"),
      }}
    />
  );
}
