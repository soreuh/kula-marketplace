import { redirect } from "next/navigation";

/** Old URL — the instructor dashboard now lives at /dashboard. */
export default function LegacySellerRedirect() {
  redirect("/dashboard");
}
