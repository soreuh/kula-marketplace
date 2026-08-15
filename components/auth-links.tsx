"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The logged-out nav trio (sign up · log in pill · mobile log in icon),
 * as a client component so it knows the CURRENT path and can carry it
 * through the auth doorway as ?next= (block N1). A logged-out buyer who
 * clicks a review-nudge email, lands on the listing, and logs in via the
 * nav now returns to that listing — the last leg of every email loop.
 * On /login and /signup themselves the links stay bare (nothing to
 * return to).
 */
export default function AuthLinks() {
  const pathname = usePathname();
  const carry =
    pathname && pathname !== "/login" && pathname !== "/signup"
      ? `?next=${encodeURIComponent(pathname)}`
      : "";

  return (
    <>
      <Link
        href={`/signup${carry}`}
        className="hidden font-display text-sm lowercase text-fog hover:text-ink sm:block"
      >
        sign up
      </Link>
      <Link
        href={`/login${carry}`}
        className="hidden items-center gap-2 rounded-full bg-sage-500 px-5 py-2 font-display text-sm font-semibold lowercase text-white hover:bg-sage-600 sm:inline-flex"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M15 3h4v18h-4" />
          <path d="M10 17l5-5-5-5" />
          <path d="M15 12H3" />
        </svg>
        log in
      </Link>
      <Link
        href={`/login${carry}`}
        aria-label="Log in"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-mist text-ink sm:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
        </svg>
      </Link>
    </>
  );
}
