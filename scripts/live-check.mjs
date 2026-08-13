/**
 * Live RLS/auth verification against the real Supabase project,
 * using ONLY the anon (publishable) key — i.e. nothing a browser
 * visitor couldn't do. Run: node scripts/live-check.mjs
 */
import { createClient } from "@supabase/supabase-js";

const URL = "https://tbpumeledmngimtwarnl.supabase.co";
const ANON = "sb_publishable_Sn-OFEmDhozXogMQqcXnHA_02OjGnel";

let passCount = 0;
let failCount = 0;
function report(name, pass, detail = "") {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
  if (pass) passCount++;
  else failCount++;
}

const anon = createClient(URL, ANON);

// ---------- 0. reachability + migration check ----------
let settings;
try {
  const { data, error } = await anon.from("platform_settings").select("*").single();
  if (error) {
    if (/could not find the table|does not exist|schema cache/i.test(error.message)) {
      console.log("MIGRATION_NOT_RUN — run supabase/migrations/001_init.sql in the SQL Editor first.");
      process.exit(2);
    }
    console.log("SETTINGS_ERROR " + JSON.stringify(error));
    process.exit(3);
  }
  settings = data;
} catch (e) {
  console.log("UNREACHABLE — " + (e?.message ?? e));
  process.exit(4);
}
report(
  "migration ran; anon can read platform_settings",
  Number(settings.fee_percent) > 0,
  `fee ${settings.fee_percent}% + ${settings.fee_flat_cents}¢`
);

// ---------- 1. signups (trigger + role assignment) ----------
const stamp = Date.now().toString().slice(-7);
const sellerEmail = `aleks.sorra+kulaseller${stamp}@gmail.com`;
const buyerEmail = `aleks.sorra+kulabuyer${stamp}@gmail.com`;
const PASSWORD = `KulaTest!${stamp}`;

const sellerClient = createClient(URL, ANON);
const buyerClient = createClient(URL, ANON);

const { data: sellerSign, error: sellerErr } = await sellerClient.auth.signUp({
  email: sellerEmail,
  password: PASSWORD,
  options: { data: { role: "seller", display_name: "Test Seller" } },
});
if (sellerErr) {
  console.log("SIGNUP_ERROR — " + sellerErr.message);
  process.exit(5);
}
if (!sellerSign.session) {
  console.log(
    "EMAIL_CONFIRMATION_ON — signup created but no session. Turn OFF 'Confirm email' (SETUP.md step 2) and re-run."
  );
  process.exit(6);
}
const sellerId = sellerSign.user.id;
report("seller signup returns a session (confirmation off)", true, sellerEmail);

const { data: buyerSign, error: buyerErr } = await buyerClient.auth.signUp({
  email: buyerEmail,
  password: PASSWORD,
  options: { data: { role: "buyer" } },
});
if (buyerErr || !buyerSign.session) {
  console.log("BUYER_SIGNUP_ERROR — " + (buyerErr?.message ?? "no session"));
  process.exit(7);
}
const buyerId = buyerSign.user.id;

const { data: sellerProfile } = await sellerClient
  .from("profiles").select("*").eq("id", sellerId).single();
report(
  "signup trigger created profile with correct role",
  sellerProfile?.role === "seller",
  `role=${sellerProfile?.role}, display_name=${sellerProfile?.display_name}`
);

// ---------- 2. seller powers ----------
const filePath = `${sellerId}/test-plan.txt`;
const { error: upErr } = await sellerClient.storage
  .from("product-files")
  .upload(filePath, Buffer.from("Namaste — RLS test file. Safe to delete."), {
    contentType: "text/plain",
  });
report("seller uploads into own storage folder", !upErr, upErr?.message ?? filePath);

const { data: product, error: insErr } = await sellerClient
  .from("products")
  .insert({
    seller_id: sellerId,
    title: "RLS Test Listing (safe to delete)",
    description: "Created by the live verification script.",
    category: "Class plan",
    price_cents: 2000,
    file_path: filePath,
    status: "active",
  })
  .select()
  .single();
report("seller creates an active listing", !insErr, insErr?.message ?? `$20.00 — ${product?.id}`);

// visible to the anonymous public?
const { data: publicView } = await anon
  .from("products").select("id,title").eq("id", product?.id ?? "");
report("anon (logged-out) sees the active listing", (publicView?.length ?? 0) === 1);

// ---------- 3. buyer attack attempts (all must be blocked) ----------
const { error: buyerInsErr } = await buyerClient.from("products").insert({
  seller_id: buyerId,
  title: "Buyer should not list",
  price_cents: 1000,
});
report("buyer role BLOCKED from creating listings", !!buyerInsErr, buyerInsErr?.message);

await buyerClient.from("products").update({ price_cents: 1 }).eq("id", product.id);
const { data: priceCheck } = await anon
  .from("products").select("price_cents").eq("id", product.id).single();
report(
  "buyer BLOCKED from editing someone else's listing",
  priceCheck?.price_cents === 2000,
  `price still ${priceCheck?.price_cents}¢`
);

const { error: orderErr } = await buyerClient.from("orders").insert({
  buyer_id: buyerId,
  product_id: product.id,
  amount_cents: 2500,
  fee_cents: 500,
  seller_amount_cents: 2000,
  status: "paid",
});
report("buyer BLOCKED from writing orders (webhook-only)", !!orderErr, orderErr?.message);

const { error: promoteErr } = await buyerClient
  .from("profiles").update({ role: "admin" }).eq("id", buyerId);
const { data: roleCheck } = await buyerClient
  .from("profiles").select("role").eq("id", buyerId).single();
report(
  "buyer BLOCKED from self-promoting to admin",
  roleCheck?.role === "buyer",
  promoteErr?.message ?? `role still ${roleCheck?.role}`
);

const { error: crossUpErr } = await buyerClient.storage
  .from("product-files")
  .upload(`${sellerId}/hijack.txt`, Buffer.from("nope"), { contentType: "text/plain" });
report("buyer BLOCKED from writing into seller's folder", !!crossUpErr, crossUpErr?.message);

const { data: buyerFileList } = await buyerClient.storage
  .from("product-files").list(sellerId);
report(
  "buyer cannot list seller's private files",
  (buyerFileList?.length ?? 0) === 0
);

const { data: profilesVisible } = await buyerClient.from("profiles").select("id");
report(
  "buyer sees only their own profile",
  profilesVisible?.length === 1
);

// ---------- 4. settings locked ----------
await buyerClient.from("platform_settings").update({ fee_percent: 0 }).eq("id", true);
const { data: feeCheck } = await anon.from("platform_settings").select("fee_percent").single();
report(
  "non-admin BLOCKED from changing the platform fee",
  Number(feeCheck?.fee_percent) === Number(settings.fee_percent),
  `fee still ${feeCheck?.fee_percent}%`
);

// ---------- summary ----------
console.log(`\n${passCount} passed, ${failCount} failed`);
console.log(`\nTest accounts left in place (password: ${PASSWORD}):`);
console.log(`  seller: ${sellerEmail} — has one $20 active listing`);
console.log(`  buyer:  ${buyerEmail}`);
process.exit(failCount ? 1 : 0);
