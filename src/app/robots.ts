import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site";
export default function robots(): MetadataRoute.Robots {
  const indexable =
    process.env.SITE_INDEXABLE === "true" &&
    process.env.VERCEL_ENV !== "preview";
  return {
    rules: {
      userAgent: "*",
      ...(indexable
        ? { allow: "/", disallow: ["/api/", "/en/lab/", "/tr/lab/"] }
        : { disallow: "/" }),
    },
    ...(indexable ? { sitemap: `${siteOrigin()}/sitemap.xml` } : {}),
  };
}
