"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin server actions. They run with the ADMIN'S OWN session (not the
 * service key), so RLS is the real enforcement — these checks are belt
 * and suspenders.
 */
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") throw new Error("Admins only");
  return supabase;
}

export async function updateFeeSettings(formData: FormData) {
  const supabase = await requireAdmin();
  const feePercent = Number(formData.get("fee_percent"));
  const feeFlat = Number(formData.get("fee_flat_cents"));
  if (!Number.isFinite(feePercent) || feePercent < 0 || feePercent > 100)
    throw new Error("Fee percent must be 0–100");
  if (!Number.isInteger(feeFlat) || feeFlat < 0)
    throw new Error("Flat fee must be a non-negative integer (cents)");

  await supabase
    .from("platform_settings")
    .update({
      fee_percent: feePercent,
      fee_flat_cents: feeFlat,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);
  revalidatePath("/dashboard/admin");
  revalidatePath("/");
}

export async function setProductStatus(formData: FormData) {
  const supabase = await requireAdmin();
  const productId = String(formData.get("product_id"));
  const status = String(formData.get("status"));
  if (!["active", "suspended", "draft"].includes(status))
    throw new Error("Bad status");

  await supabase.from("products").update({ status }).eq("id", productId);
  revalidatePath("/dashboard/admin");
  revalidatePath("/");
}

export async function changeUserRole(formData: FormData) {
  const supabase = await requireAdmin();
  const userId = String(formData.get("user_id"));
  const role = String(formData.get("role"));
  if (!["buyer", "seller", "admin"].includes(role)) throw new Error("Bad role");

  await supabase.from("profiles").update({ role }).eq("id", userId);
  revalidatePath("/dashboard/admin");
}
