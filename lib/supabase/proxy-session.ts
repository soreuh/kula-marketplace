import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/site";

/**
 * Runs on every request (see proxy.ts): refreshes the auth session cookie
 * and bounces visitors who are on the wrong side of an auth wall —
 * logged-OUT away from /dashboard, logged-IN away from /login + /signup.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do not run code between createServerClient and getUser() —
  // it can cause random logouts (per Supabase docs).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // The inverse guard: a logged-IN visitor has no business on the auth
  // forms — the homepage "start selling" buttons, old emails, and
  // bookmarks all land here. Send them where they were headed (?next=,
  // honored only via safeNext — N1) or to the dashboard, which is where
  // every "start selling" door means to end up anyway.
  if (user && ["/login", "/signup"].includes(request.nextUrl.pathname)) {
    const dest =
      safeNext(request.nextUrl.searchParams.get("next")) ?? "/dashboard";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // Stickiness signal (migration 021): stamp profiles.last_seen_at, at most
  // once per hour per user. The throttle is a COOKIE, not a DB read, so the
  // steady-state cost of this block is zero queries. Awaited (middleware
  // must not leak work past the response) but failure-blind: if 021 hasn't
  // run or the write hiccups, browsing is never affected.
  if (user && !request.cookies.get("kula_seen")) {
    await supabase
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", user.id)
      .then(() => null, () => null);
    response.cookies.set("kula_seen", "1", {
      maxAge: 60 * 60,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }

  return response;
}
