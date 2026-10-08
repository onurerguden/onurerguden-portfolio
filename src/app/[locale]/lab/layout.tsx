import { notFound } from "next/navigation";
import { labBlocked } from "@/lib/security";

/**
 * The QA pages exist only where the site is not public; there they are
 * never indexed (next.config.ts sends noindex).
 */
export default function LabLayout({ children }: { children: React.ReactNode }) {
  if (
    labBlocked("/en/lab", {
      VERCEL_ENV: process.env.VERCEL_ENV,
      SITE_INDEXABLE: process.env.SITE_INDEXABLE,
    })
  )
    notFound();
  return children;
}
