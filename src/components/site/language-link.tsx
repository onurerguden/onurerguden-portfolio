"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { currentSection } from "@/lib/current-section";

/**
 * Switches to the other language on the same page and section. It is a plain
 * link, so the new document is rendered with its own `<html lang>`; a
 * client-side navigation would keep the previous language's root layout.
 */
export default function LanguageLink({
  locale,
  className,
}: {
  locale: "en" | "tr";
  className?: string;
}) {
  const other = locale === "en" ? "tr" : "en";
  const path = usePathname();
  const [hash, setHash] = useState("");
  // The section in view on the home page; null elsewhere or before scrolling.
  const section = useSyncExternalStore(
    currentSection.subscribe,
    currentSection.get,
    () => null,
  );
  useEffect(() => {
    const sync = () => setHash(location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const target =
    path.replace(/^\/(en|tr)(?=\/|$)/, `/${other}`) +
    (section ? `#${section}` : hash);
  return (
    <a
      className={className}
      href={target}
      hrefLang={other}
      lang={other}
      aria-label={other === "tr" ? "Türkçeye geç" : "Switch to English"}
    >
      {other.toUpperCase()}
    </a>
  );
}
