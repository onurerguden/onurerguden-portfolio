import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site";
export default function sitemap(): MetadataRoute.Sitemap {const origin=siteOrigin();const paths=["","/projects","/research","/projects/kuyumcum","/projects/water-safety","/projects/course-intelligence"];return paths.flatMap(path=>["en","tr"].map(locale=>({url:`${origin}/${locale}${path}`,alternates:{languages:{en:`${origin}/en${path}`,tr:`${origin}/tr${path}`}}})));}
