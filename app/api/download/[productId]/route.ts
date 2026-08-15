import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/download/[productId]
 * The only way buyers get files: verify a PAID order exists for this user +
 * product, then redirect to a short-lived signed URL. The bucket is private;
 * there is no direct path to the file.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Logged-out download click (stale tab, copied link): after login, land
  // in the LIBRARY — not back on this route, which would stream a file at
  // a fresh session with no page behind it (N1 decision).
  if (!user)
    return NextResponse.redirect(
      new URL(
        "/login?next=/library",
        process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
      )
    );

  const admin = createAdminClient();

  // Allowed if: you bought it (paid), you sold it, or you're the admin.
  const [{ data: order }, { data: me }, { data: product }] = await Promise.all([
    supabase
      .from("orders")
      .select("id")
      .eq("buyer_id", user.id)
      .eq("product_id", productId)
      .eq("status", "paid")
      .maybeSingle(),
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    admin.from("products").select("seller_id, file_path, title").eq("id", productId).single(),
  ]);

  if (!product?.file_path)
    return NextResponse.json({ error: "File not found" }, { status: 404 });

  const allowed =
    !!order || me?.role === "admin" || product.seller_id === user.id;
  if (!allowed)
    return NextResponse.json(
      { error: "You haven't purchased this item" },
      { status: 403 }
    );

  const { data: signed, error } = await admin.storage
    .from("product-files")
    .createSignedUrl(product.file_path, 300, { download: true });

  if (error || !signed?.signedUrl)
    return NextResponse.json({ error: "Could not create download link" }, { status: 500 });

  return NextResponse.redirect(signed.signedUrl);
}
