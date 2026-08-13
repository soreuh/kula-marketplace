"use client";

import { useEffect, useState } from "react";

/** Spec: the file starts downloading one second after the page loads. */
export default function AutoDownload({ productId }: { productId: string }) {
  const [fired, setFired] = useState(false);
  const href = `/api/download/${productId}`;

  useEffect(() => {
    const t = setTimeout(() => {
      setFired(true);
      // API route that 302s to a signed file URL — a real navigation is correct
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = href;
    }, 1000);
    return () => clearTimeout(t);
  }, [href]);

  return (
    <div className="mt-6">
      <a
        href={href}
        className="inline-flex items-center gap-2 rounded-full bg-sage-500 px-6 py-3 font-display font-semibold lowercase text-white hover:bg-sage-600"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
        download file
      </a>
      <p className="mt-2 text-sm text-fog">
        {fired
          ? "didn't download automatically? click the button above."
          : "your download starts in a second…"}
      </p>
    </div>
  );
}
