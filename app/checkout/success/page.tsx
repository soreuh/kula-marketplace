import Link from "next/link";
import { getStripe } from "@/lib/stripe";
import { LeafLogo, btnPrimary, btnOutline } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  let paid = false;
  let productId: string | undefined;
  if (session_id) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(session_id);
      paid = session.payment_status === "paid";
      productId = session.metadata?.product_id;
    } catch {
      paid = false;
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-20 text-center">
      <div className="flex justify-center">
        <LeafLogo size={64} />
      </div>
      {paid ? (
        <>
          <h1 className="mt-6 font-display text-3xl font-bold lowercase">
            payment received
          </h1>
          <p className="mt-2 text-fog">
            it&apos;s yours — one-time payment, lifetime access. find it in your
            library any time.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {productId && (
              <a href={`/api/download/${productId}`} className={btnPrimary}>
                download now
              </a>
            )}
            <Link href="/dashboard/buyer" className={btnOutline}>
              go to your library
            </Link>
          </div>
        </>
      ) : (
        <>
          <h1 className="mt-6 font-display text-3xl font-bold lowercase">
            almost there…
          </h1>
          <p className="mt-2 text-fog">
            we couldn&apos;t confirm the payment yet. if you completed checkout,
            it will appear in{" "}
            <Link href="/dashboard/buyer" className="underline">
              your library
            </Link>{" "}
            shortly.
          </p>
        </>
      )}
    </div>
  );
}
