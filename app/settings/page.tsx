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

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .single();

  return (
    <SettingsClient userId={user.id} email={profile?.email ?? user.email ?? ""} />
  );
}
