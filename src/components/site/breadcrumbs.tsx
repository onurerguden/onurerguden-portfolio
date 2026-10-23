import Link from "next/link";
import type { Locale } from "@/lib/content";
import type { Crumb } from "@/lib/breadcrumbs";

/** Where this page sits, as the graph's BreadcrumbList says it. */
export default function Breadcrumbs({
  locale,
  trail,
}: {
  locale: Locale;
  trail: Crumb[];
}) {
  return (
    <nav
      className="breadcrumbs"
      aria-label={locale === "en" ? "Breadcrumb" : "Sayfa yolu"}
    >
      <ol>
        {trail.map((crumb, index) => (
          <li key={crumb.path}>
            {index === trail.length - 1 ? (
              <span aria-current="page">{crumb.name}</span>
            ) : (
              <Link href={`/${locale}${crumb.path}`}>{crumb.name}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
