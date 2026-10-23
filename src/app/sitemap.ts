import type { MetadataRoute } from "next";
import { getProjects } from "@/lib/content";
import { getCertificates } from "@/lib/home-content";
import { siteOrigin } from "@/lib/site";
import { editorialModified } from "@/lib/editorial";
import { getPosts } from "@/lib/writing";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  const studies = getProjects("en").filter((project) => project.caseStudy);
  // Every case study has a page; archive entries live on /projects.
  const cases = studies.map((project) => `/projects/${project.slug}`);
  const posts = getPosts("en");
  const articles = posts.map((post) => `/writing/${post.slug}`);
  const paths = [
    "",
    "/projects",
    "/research",
    "/writing",
    ...cases,
    ...articles,
  ];
  // Images each page shows, so image search can find and credit them.
  const images: Record<string, string[]> = {
    "": [
      "/images/avatar/onur-head-v4-1254.webp",
      "/images/about/onur-photo.webp",
      ...getCertificates("en").map((certificate) => certificate.image.src),
    ],
    ...Object.fromEntries(
      studies.map((project) => [
        `/projects/${project.slug}`,
        (project.media ?? []).map((item) => item.src),
      ]),
    ),
  };
  return paths.flatMap((path) =>
    ["en", "tr"].map((locale) => ({
      url: `${origin}/${locale}${path}`,
      ...(editorialModified(path)
        ? { lastModified: editorialModified(path) }
        : {}),
      ...(images[path]?.length
        ? { images: images[path].map((src) => `${origin}${src}`) }
        : {}),
      alternates: {
        languages: {
          en: `${origin}/en${path}`,
          tr: `${origin}/tr${path}`,
          "x-default": `${origin}/en${path}`,
        },
      },
    })),
  );
}
