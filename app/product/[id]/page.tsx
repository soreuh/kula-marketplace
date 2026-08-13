import { redirect } from "next/navigation";

/** Old URL shape — listings moved to /products/:id (kept for old links). */
export default async function LegacyProductRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/products/${id}`);
}
