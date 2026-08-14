import Script from "next/script";

/**
 * Google Analytics 4 — OPTIONAL, dark without NEXT_PUBLIC_GA_MEASUREMENT_ID
 * (the `G-XXXXXXXXXX` id from GA → Admin → Data streams → your web stream).
 *
 * Page views on client-side route changes are captured by GA4's Enhanced
 * measurement ("Page changes based on browser history events") — leave that
 * toggle ON in the data stream settings (it's the default).
 *
 * Heads-up for the privacy policy: GA sets _ga cookies, so /privacy §7
 * ("we do not use advertising or tracking cookies") needs the owner's
 * updated wording before this goes live with a real id.
 */
export default function Analytics() {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!id) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}');`}
      </Script>
    </>
  );
}
