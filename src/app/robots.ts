import type { MetadataRoute } from "next";
import { siteIndexable, siteOrigin } from "@/lib/site";
export default function robots(): MetadataRoute.Robots {
  // One group for every crawler, search and training alike: a named group
  // would replace these rules for that bot (tests/robots.test.ts).
  const indexable = siteIndexable();
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
