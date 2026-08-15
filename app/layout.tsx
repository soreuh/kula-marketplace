import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource-variable/nunito-sans";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { Wordmark, KulaMark } from "@/components/ui";
import AuthLinks from "@/components/auth-links";
import BellMenu from "@/components/bell-menu";
import UserMenu from "@/components/user-menu";
import Analytics from "@/components/analytics";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/site";
import type { Profile } from "@/lib/types";

/**
 * SEO baseline (Aug 2026). House rule: every word search engines see is a
 * word a human already wrote for the site — no generated keywords, ever.
 * metadataBase makes OG image urls absolute; pages override title via the
 * template and listings/profiles supply their own generateMetadata.
 */
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://kula-marketplace.com"
  ),
  title: {
    default: "kula — buy and sell yoga sequences, class plans, and more",
    template: "%s — kula",
  },
  description:
    "A marketplace for yoga teachers. Buy what you need to support your teaching. Sell what you've already created.",
  openGraph: {
    siteName: "kula",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
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
              {profile && (
                <Link href="/library" className="hover:text-sage-600">
                  my library
                </Link>
              )}
            </div>

            {/* No mobile mini-nav (M6, Aleks 2026-08-15): the lone explore
                link next to the wordmark read as clutter with no real
                function — homepage CTAs, the footer, and the sm+ nav all
                still carry explore. */}

            <div className="ml-auto flex items-center gap-3">
              {user && profile ? (
                <>
                  {/* No dashboard pill (M2, Aleks 2026-08-15): "sell" in the
                      nav and the avatar menu both already lead there, and a
                      loud dashboard CTA reads seller-centric to buyers.
                      Etsy/TpT pattern: account surfaces live behind the
                      avatar. */}
                  {/* derived to-do bell (reviews to leave / replies owed) —
                      renders nothing while there's nothing to do */}
                  <BellMenu />
                  <UserMenu
                    userId={user.id}
                    name={displayName}
                    email={profile.email}
                    isAdmin={profile.role === "admin"}
                    avatarPath={profile.avatar_path}
                  />
                </>
              ) : (
                // client component: carries the current path as ?next= so
                // logging in via the nav returns you to where you were (N1)
                <AuthLinks />
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
