"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export default function Navigation({ locale }: { locale: "en" | "tr" }) {
  const path = usePathname();
  const other = locale === "en" ? "tr" : "en";
  const target = path.replace(/^\/(en|tr)(?=\/|$)/, `/${other}`);
  return (
    <header className="site-header">
      <Link className="wordmark" href={`/${locale}`} aria-label="Onur Ergüden">
        <span className="monogram" aria-hidden="true">
          oe
        </span>
        <span>Onur Ergüden</span>
      </Link>
      <nav aria-label={locale === "en" ? "Main navigation" : "Ana gezinme"}>
        <Link href={`/${locale}#work`}>
          {locale === "en" ? "Work" : "Projeler"}
        </Link>
        <Link href={`/${locale}/research`}>
          {locale === "en" ? "Research" : "Araştırma"}
        </Link>
        <Link href={`/${locale}#about`}>
          {locale === "en" ? "About" : "Hakkımda"}
        </Link>
        <Link
          className="language-switch"
          href={target}
          hrefLang={other}
          lang={other}
          aria-label={other === "tr" ? "Türkçeye geç" : "Switch to English"}
        >
          {other === "tr" ? "TR" : "EN"}
        </Link>
      </nav>
    </header>
  );
}
