import { jsonLd } from "@/lib/structured-data";

/** Structured data for the page, read by crawlers and never executed. */
export default function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLd(data) }}
    />
  );
}
