import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource-variable/nunito-sans";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { Wordmark, KulaMark } from "@/components/ui";
import UserMenu from "@/components/user-menu";
import Analytics from "@/components/analytics";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/site";
import type { Profile } from "@/lib/types";

export const metadata: Metadata = {
  title: "kula — buy and sell yoga sequences, class plans, and more",
  description:
    "A marketplace for yoga teachers. Buy what you need to support your teaching. Sell what you've already created.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  const displayName =
    profile?.display_name || profile?.email?.split("@")[0] || "you";

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        {/* GA4 — renders nothing without NEXT_PUBLIC_GA_MEASUREMENT_ID */}
        <Analytics />
        <nav className="sticky top-0 z-20 border-b border-ink/5 bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-7 px-5">
            <Link href="/">
              <Wordmark />
            </Link>
            <div className="hidden items-center gap-6 font-display text-[15px] font-medium lowercase sm:flex">
              <Link href="/explore" className="hover:text-sage-600">
                explore
              </Link>
              <Link
                href={profile ? "/dashboard" : "/signup"}
                className="hover:text-sage-600"
              >
                sell
              </Link>
              <Link href="/faq" className="hover:text-sage-600">
                faq
              </Link>
              {profile && (
                <Link href="/library" className="hover:text-sage-600">
                  library
                </Link>
              )}
            </div>

            {/* Mobile mini-nav: the full text nav is sm+ only, and this
                audience is heavily mobile - explore and faq are the two
                links a first-time phone visitor actually needs. */}
            <div className="flex items-center gap-5 font-display text-[15px] font-medium lowercase sm:hidden">
              <Link href="/explore" className="hover:text-sage-600">
                explore
              </Link>
              <Link href="/faq" className="hover:text-sage-600">
                faq
              </Link>
            </div>

            <div className="ml-auto flex items-center gap-3">
              {user && profile ? (
                <>
                  <Link
                    href="/dashboard"
                    className="hidden items-center gap-2 rounded-full bg-sage-500 px-5 py-2 font-display text-sm font-semibold lowercase text-white hover:bg-sage-600 sm:inline-flex"
                  >
                    dashboard
                  </Link>
                  <UserMenu
                    userId={user.id}
                    name={displayName}
                    email={profile.email}
                    isAdmin={profile.role === "admin"}
                    avatarPath={profile.avatar_path}
                  />
                </>
              ) : (
                <>
                  <Link
                    href="/signup"
                    className="hidden font-display text-sm lowercase text-fog hover:text-ink sm:block"
                  >
                    sign up
                  </Link>
                  <Link
                    href="/login"
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
                    href="/login"
                    aria-label="Log in"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-mist text-ink sm:hidden"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                      <circle cx="12" cy="8" r="3.5" />
                      <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
                    </svg>
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>

        <main className="flex-1">{children}</main>

        <footer className="mt-16 border-t border-ink/5 bg-cream">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 py-10 text-sm text-fog sm:flex-row">
            <span className="flex items-center gap-2">
              <KulaMark size={28} />
              <span className="font-display font-bold lowercase text-ink">kula</span>
            </span>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:mx-auto">
              <Link href="/explore" className="lowercase hover:text-ink">
                explore
              </Link>
              <Link href="/about" className="lowercase hover:text-ink">
                about
              </Link>
              <Link href="/faq" className="lowercase hover:text-ink">
                faq
              </Link>
              <Link href="/privacy" className="lowercase hover:text-ink">
                privacy policy
              </Link>
              <Link href="/terms" className="lowercase hover:text-ink">
                terms &amp; conditions
              </Link>
              <a href={CONTACT_MAILTO} className="hover:text-ink">
                {CONTACT_EMAIL}
              </a>
            </div>
            <span className="sm:ml-auto">© 2026 kula</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
