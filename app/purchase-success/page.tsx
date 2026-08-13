import Link from "next/link";
import { getStripe } from "@/lib/stripe";
import { LeafLogo, btnOutline } from "@/components/ui";
import AutoDownload from "./auto-download";

export const dynamic = "force-dynamic";

export default async function PurchaseSuccessPage({
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
        {paid ? (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-sage-100">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--color-sage-600)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
        ) : (
          <LeafLogo size={64} />
        )}
      </div>
      {paid && productId ? (
        <>
          <h1 className="mt-6 font-display text-3xl font-bold lowercase">
            purchase complete!
          </h1>
          <p className="mt-2 text-fog">
            it&apos;s yours — one-time payment, lifetime access.
          </p>
          <AutoDownload productId={productId} />
          <div className="mt-4">
            <Link href="/library" className={btnOutline}>
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
            <Link href="/library" className="underline">
              your library
            </Link>{" "}
            shortly.
          </p>
        </>
      )}
    </div>
  );
}
