"use client";
import { useEffect } from "react";
import GiantTitle from "@/components/giant-title";
import styles from "@/app/not-found.module.css";

const copy = {
  en: {
    title: "Error",
    tab: "Error | Onur Ergüden",
    body: "Something went wrong while loading this page. Try again, or go back to the homepage.",
    retry: "Try again",
    home: "Homepage",
    reference: "Reference",
  },
  tr: {
    title: "Hata",
    tab: "Hata | Onur Ergüden",
    body: "Bu sayfa yüklenirken bir şeyler ters gitti. Tekrar dene ya da ana sayfaya dön.",
    retry: "Tekrar dene",
    home: "Ana sayfa",
    reference: "Hata kodu",
  },
};

/**
 * What a page shows when it fails to render, in one language or, when the
 * language is unknown (the root layout failed), in both. The digest matches
 * the server log entry; the message itself is never shown. Its links are
 * plain anchors: a full load clears the broken state, and global-error
 * would otherwise carry its own copy of next/link on every first load.
 */
export default function ErrorView({
  error,
  retry,
  locale,
}: {
  error: Error & { digest?: string };
  retry: () => void;
  locale?: "en" | "tr";
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const languages = locale ? [locale] : (["en", "tr"] as const);
  const text = copy[locale ?? "en"];
  return (
    <main
      id="main"
      tabIndex={-1}
      className={locale ? `${styles.page} ${styles.inline}` : styles.page}
    >
      <title>{text.tab}</title>
      <GiantTitle
        as="h1"
        text={text.title}
        locale={locale ?? "en"}
        fill={46}
        max={320}
        className={styles.title}
      />
      <div className={styles.copy}>
        {languages.map((language) => (
          <p key={language} lang={locale ? undefined : language}>
            {copy[language].body}
          </p>
        ))}
        {error.digest ? (
          <p className={styles.reference}>
            {text.reference}: <code>{error.digest}</code>
          </p>
        ) : null}
      </div>
      <ul className={styles.links}>
        <li>
          <button type="button" onClick={retry}>
            {languages.map((language, i) => (
              <span key={language} lang={locale ? undefined : language}>
                {i ? " · " : ""}
                {copy[language].retry}
              </span>
            ))}
          </button>
        </li>
        {languages.map((language) => (
          <li key={language}>
            <a
              href={`/${language}`}
              hrefLang={language}
              lang={locale ? undefined : language}
            >
              {copy[language].home} <span aria-hidden="true">→</span>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
