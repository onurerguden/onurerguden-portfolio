import type { MetadataRoute } from "next";
import { getProjects } from "@/lib/content";
import { siteOrigin } from "@/lib/site";
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  // Every case study has a page; archive entries live on /projects.
  const cases = getProjects("en")
    .filter((project) => project.featured)
    .map((project) => `/projects/${project.slug}`);
  const paths = ["", "/projects", "/research", ...cases];
  return paths.flatMap((path) =>
    ["en", "tr"].map((locale) => ({
      url: `${origin}/${locale}${path}`,
      alternates: {
        languages: { en: `${origin}/en${path}`, tr: `${origin}/tr${path}` },
      },
    })),
  );
}
