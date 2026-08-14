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
    const [{ data: products }, { data: instructors }] = await Promise.all([
      supabase
        .from("products")
        .select("id, updated_at")
        .eq("status", "active"),
      supabase.from("instructors").select("id, created_at"),
    ]);
    return [
      ...staticPages,
      ...(products ?? []).map((p) => ({
        url: `${base}/products/${p.id}`,
        lastModified: new Date(p.updated_at),
        priority: 0.8,
      })),
      ...(instructors ?? []).map((i) => ({
        url: `${base}/profile/${i.id}`,
        lastModified: now,
        priority: 0.5,
      })),
    ];
  } catch {
    return staticPages; // sitemap must never 500 over a DB hiccup
  }
}
