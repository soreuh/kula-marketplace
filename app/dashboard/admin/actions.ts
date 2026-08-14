"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

/**
 * Featured curation (migration 013): admins star listings onto the
 * homepage. featured_at doubles as pick order (newest pick first);
 * unstarring returns the slot to the scored auto-fill.
 */
export async function toggleFeatured(formData: FormData) {
  const supabase = await requireAdmin();
  const productId = String(formData.get("product_id"));
  const makeFeatured = String(formData.get("make_featured")) === "true";

  await supabase
    .from("products")
    .update({ featured_at: makeFeatured ? new Date().toISOString() : null })
    .eq("id", productId);
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

/**
 * Partner rates: set a seller's negotiated commission percent.
 * Blank clears the override → the seller follows platform defaults again.
 * The flat per-transaction fee is unaffected.
 */
export async function setCommissionOverride(formData: FormData) {
  const supabase = await requireAdmin();
  const userId = String(formData.get("user_id"));
  const raw = String(formData.get("commission_override") ?? "").trim();

  let value: number | null = null;
  if (raw !== "") {
    value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > 100)
      throw new Error("Rate must be 0–100, or blank for the default");
  }

  // Setting a custom rate auto-marks the seller as a partner.
  // Clearing the rate leaves partner status alone (badge-only partners exist).
  const patch: { commission_override: number | null; partner?: boolean } = {
    commission_override: value,
  };
  if (value !== null) patch.partner = true;

  await supabase.from("profiles").update(patch).eq("id", userId);
  revalidatePath("/dashboard/admin");
}

/**
 * Listing options — the style / content-type / level lists sellers choose
 * from (product_options table, migration 009). Add and delete only; deleting
 * an option never touches existing listings, which keep their stored label.
 */
export async function addProductOption(formData: FormData) {
  const supabase = await requireAdmin();
  const kind = String(formData.get("kind"));
  const label = String(formData.get("label") ?? "").trim();
  if (!["style", "content_type", "level"].includes(kind))
    throw new Error("Bad kind");
  if (!label || label.length > 40)
    throw new Error("Label must be 1–40 characters");

  // duplicates (unique kind+label) just no-op — nothing to report
  await supabase.from("product_options").insert({ kind, label });
  revalidatePath("/dashboard/admin");
  revalidatePath("/explore");
  revalidatePath("/dashboard");
}

export async function deleteProductOption(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id"));
  await supabase.from("product_options").delete().eq("id", id);
  revalidatePath("/dashboard/admin");
  revalidatePath("/explore");
  revalidatePath("/dashboard");
}

/**
 * User moderation — pause / activate / soft-delete.
 * - paused:  buying blocked (checkout gate) + listings and public profile
 *            ghosted (RLS). The user can still sign in and see their own
 *            dashboard; prior buyers keep what they bought.
 * - active:  restores normal reads. Product rows were never modified, so
 *            listings come back exactly as they were — the Stripe publish
 *            gate (migration 005) still applies; nothing is force-published.
 * - deleted: same ghosting as paused, PLUS sign-in is banned at the auth
 *            layer. Every row (profile, listings, orders, reviews) STAYS
 *            in the database.
 */
export async function setAccountStatus(formData: FormData) {
  const supabase = await requireAdmin();
  const userId = String(formData.get("user_id"));
  const status = String(formData.get("status"));
  if (!["active", "paused", "deleted"].includes(status))
    throw new Error("Bad status");

  // Never moderate yourself — that's how the only admin gets locked out.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === userId) {
    revalidatePath("/dashboard/admin");
    return;
  }

  await supabase
    .from("profiles")
    .update({ account_status: status })
    .eq("id", userId);

  // 'deleted' also blocks sign-in; pause/activate lifts any ban. The auth
  // ban needs the service key — best-effort: the RLS ghosting and the
  // checkout gate hold even if this call fails.
  try {
    const admin = createAdminClient();
    await admin.auth.admin.updateUserById(userId, {
      ban_duration: status === "deleted" ? "876000h" : "none",
    });
  } catch {
    /* noted above */
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/");
}

/**
 * Partner toggle. Turning partner OFF also clears any negotiated rate —
 * the deal ends with the partnership, and they return to platform defaults.
 */
export async function togglePartner(formData: FormData) {
  const supabase = await requireAdmin();
  const userId = String(formData.get("user_id"));
  const makePartner = String(formData.get("make_partner")) === "true";

  await supabase
    .from("profiles")
    .update(
      makePartner
        ? { partner: true }
        : { partner: false, commission_override: null }
    )
    .eq("id", userId);
  revalidatePath("/dashboard/admin");
}

/**
 * Growth-model drivers + launch date (migration 020). "reset" wipes the
 * overrides back to the Mid defaults baked into lib/growth-model.ts.
 * Values are validated as finite non-negatives; anything else is dropped
 * rather than stored — resolveDrivers() ignores junk anyway (defense in
 * depth for hand-edited jsonb).
 */
export async function updateGrowthModel(formData: FormData) {
  const supabase = await requireAdmin();

  if (formData.get("reset") === "true") {
    await supabase
      .from("platform_settings")
      .update({ growth_model: null })
      .eq("id", true);
    revalidatePath("/dashboard/admin");
    return;
  }

  const KEYS = [
    "startingSellers", "growthEarly", "growthLate",
    "listingsPerSellerStart", "newListingsPerMonth",
    "salesPerListingStart", "demandGrowth", "demandCap",
    "avgPriceCents", "stripePct", "stripeFlatCents",
    "connectFeeCents", "payoutShare",
  ] as const;
  const model: Record<string, number> = {};
  for (const k of KEYS) {
    const v = Number(formData.get(k));
    if (Number.isFinite(v) && v >= 0) model[k] = v;
  }

  const launch = String(formData.get("launch_date") ?? "");
  const patch: Record<string, unknown> = { growth_model: model };
  if (/^\d{4}-\d{2}-\d{2}$/.test(launch)) patch.launch_date = launch;

  await supabase.from("platform_settings").update(patch).eq("id", true);
  revalidatePath("/dashboard/admin");
}

/** Platform-wide email switches (admin → notifications, migration 022). */
export async function updateNotificationSettings(formData: FormData) {
  const supabase = await requireAdmin();
  await supabase
    .from("platform_settings")
    .update({
      // unchecked boxes are absent from FormData — absence = off
      notify_content_updates: formData.get("notify_content_updates") === "on",
      notify_sale_emails: formData.get("notify_sale_emails") === "on",
    })
    .eq("id", true);
  revalidatePath("/dashboard/admin");
}
