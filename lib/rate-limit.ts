import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fixed-window rate limiter backed by Postgres (migration 018).
 *
 * Serverless functions can't rate-limit in memory — counters vanish on
 * cold start and aren't shared between instances — so the count lives in
 * the `rate_limits` table, incremented atomically by the
 * `rate_limit_hit` RPC (service-role only; the table has RLS with no
 * policies).
 *
 * FAIL-OPEN by design: if the RPC errors (migration 018 not applied yet,
 * transient DB hiccup), the request is ALLOWED. The limiter guards
 * against bulk abuse; it must never be the reason a real person's signup
 * fails. That also means it's a soft ceiling, not a security boundary —
 * see the deliberate `.catch` below.
 */
export async function rateLimitOk(
  bucket: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("rate_limit_hit", {
      p_bucket: bucket,
      p_window_seconds: windowSeconds,
    });
    if (error || typeof data !== "number") return true; // fail open
    return data <= limit;
  } catch {
    return true; // fail open
  }
}

/**
 * Best-effort client IP. On Netlify, `x-nf-client-connection-ip` is set
 * by the platform and is the trustworthy one; `x-forwarded-for`'s FIRST
 * hop is fine as a fallback. "unknown" bucketises all un-attributable
 * traffic together, which is the safe direction (shared limit, not none).
 */
export function clientIp(request: Request): string {
  const nf = request.headers.get("x-nf-client-connection-ip");
  if (nf) return nf.trim();
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return "unknown";
}
