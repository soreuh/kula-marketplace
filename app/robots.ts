import type { MetadataRoute } from "next";

/** Private/account areas stay out of search; everything public is fair game. */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kula-marketplace.com";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/library",
        "/api/",
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
        "/purchase-success",
        "/checkout/",
        "/auth/",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
