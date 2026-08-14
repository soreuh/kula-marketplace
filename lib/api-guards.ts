import "server-only";

import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Shared API-route preamble. LIGHT-TOUCH BY DESIGN: these helpers replace
 * only the copy-pasted auth/moderation boilerplate. The money routes
 * (checkout, claim-free) keep their own product fetches, own-listing and
 * already-owned checks — those two are the ring-fenced order writers
 * (see CLAUDE.md invariants) and are deliberately NOT merged further.
 *
 * /api/download is NOT converted: it answers a browser link click, so an
 * unauthenticated hit redirects to /login instead of returning JSON.
 */

type UserResult =
  | { supabase: SupabaseClient; user: User; error: null }
  | { supabase: null; user: null; error: NextResponse };

/** getUser() → 401 JSON dance, once. `if (r.error) return r.error;` */
export async function requireUser(): Promise<UserResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      supabase: null,
      user: null,
      error: NextResponse.json(
        { error: "Please log in first" },
        { status: 401 }
      ),
    };
  return { supabase, user, error: null };
}

/**
 * Moderation gate: paused/deleted accounts can't acquire content.
 * Returns a 403 response to send back, or null to proceed.
 *
 * TOLERANT READ — preserved on purpose from the original checkout code:
 * if migration 007 hasn't run, the account_status column is missing, the
 * select errors, status stays undefined, and the request PROCEEDS. The
 * gate must fail open on an un-migrated database, never lock everyone out.
 *
 * Error copy was unified 2026-08-14 (checkout's fuller wording won;
 * claim-free had drifted to a shorter variant of the same sentence).
 */
export async function requireActiveAccount(
  supabase: SupabaseClient,
  userId: string
): Promise<NextResponse | null> {
  const { data: me } = await supabase
    .from("profiles")
    .select("account_status")
    .eq("id", userId)
    .maybeSingle();
  const status = (me as { account_status?: string } | null)?.account_status;
  if (status != null && status !== "active")
    return NextResponse.json(
      {
        error:
          "Your account is paused — purchases are disabled. Contact kula if you think this is a mistake.",
      },
      { status: 403 }
    );
  return null;
}
