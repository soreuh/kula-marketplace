import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

/**
 * Sitemap straight from the live catalog: static pages, active listings,
 * teacher profiles. Uses a bare anon client (no cookies at build/request
 * time) — RLS shows exactly what an anonymous visitor may see, so nothing
 * private can leak into the sitemap by construction.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kula-marketplace.com";
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, priority: 1 },
    { url: `${base}/explore`, lastModified: now, priority: 0.9 },
    { url: `${base}/faq`, lastModified: now, priority: 0.6 },
    { url: `${base}/about`, lastModified: now, priority: 0.5 },
    { url: `${base}/terms`, lastModified: now, priority: 0.2 },
    { url: `${base}/privacy`, lastModified: now, priority: 0.2 },
  ];

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
    const { data: products } = await supabase
      .from("products")
      .select("id, updated_at, seller_id")
      .eq("status", "active");
    // Profiles in the sitemap = sellers with at least one ACTIVE listing,
    // derived from the same catalog query (029: EVERY account has a
    // profile page now, but empty ones stay unlisted + noindexed — no
    // googleable pages for accounts that only buy). RLS already excludes
    // ghosted sellers' listings, so the derivation inherits moderation.
    const sellerIds = [...new Set((products ?? []).map((p) => p.seller_id))];
    return [
      ...staticPages,
      ...(products ?? []).map((p) => ({
        url: `${base}/products/${p.id}`,
        lastModified: new Date(p.updated_at),
        priority: 0.8,
      })),
      ...sellerIds.map((id) => ({
        url: `${base}/profile/${id}`,
        lastModified: now,
        priority: 0.5,
      })),
    ];
  } catch {
    return staticPages; // sitemap must never 500 over a DB hiccup
  }
}
