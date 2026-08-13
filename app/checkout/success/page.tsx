import { redirect } from "next/navigation";

/** Old URL — success now lives at /purchase-success. */
export default async function LegacySuccessRedirect({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  redirect(
    `/purchase-success${session_id ? `?session_id=${encodeURIComponent(session_id)}` : ""}`
  );
}
