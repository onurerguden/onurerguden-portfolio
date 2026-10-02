"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type RefObject,
} from "react";
import type { SectionLink } from "@/lib/home-sections";
import MotionToggle from "@/components/motion-toggle";
import LanguageLink from "./language-link";
import styles from "./site-nav.module.css";

/** True for a plain click that the page may handle itself. */
export const plainClick = (event: MouseEvent) =>
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey;

function Brand({ locale }: { locale: "en" | "tr" }) {
  return (
    <Link className={styles.brand} href={`/${locale}`}>
      <span aria-hidden="true" />
      Onur Ergüden
    </Link>
  );
}

/** Every home section plus the page-wide motion toggle. */
function SectionsMenu({
  locale,
  sections,
}: {
  locale: "en" | "tr";
  sections: SectionLink[];
}) {
  const en = locale === "en";
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === "Escape"
          : !menu.current?.contains(event.target as Node)
      ) {
        setOpen(false);
        if (event instanceof KeyboardEvent) button.current?.focus();
      }
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", close);
    };
  }, [open]);
  return (
    <div className={styles.menu} ref={menu}>
      <button
        type="button"
        ref={button}
        className={styles.menuButton}
        aria-expanded={open}
        aria-controls="journey-sections-menu"
        onClick={() => setOpen((value) => !value)}
      >
        {en ? "Sections" : "Bölümler"}
        <span aria-hidden="true" />
      </button>
      <div
        id="journey-sections-menu"
        className={styles.menuPanel}
        hidden={!open}
      >
        <ul>
          {sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} onClick={() => setOpen(false)}>
                {section.label}
              </a>
            </li>
          ))}
        </ul>
        <MotionToggle locale={locale} className={styles.motionToggle} />
      </div>
    </div>
  );
}

export type JourneyChapter = { id: string; href: string; label: string };

/**
 * The bar over the desk journey. The journey drives its `data-hidden`,
 * `data-revealed` and `data-docked` states through `navRef`.
 */
export function JourneyNav({
  locale,
  navRef,
  chapters,
  current,
  onChapter,
  sections,
  onSkip,
}: {
  locale: "en" | "tr";
  navRef: RefObject<HTMLElement | null>;
  chapters: JourneyChapter[];
  /** Index of the chapter on screen, or -1. */
  current: number;
  onChapter?: (event: MouseEvent<HTMLAnchorElement>, index: number) => void;
  sections: SectionLink[];
  onSkip: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const en = locale === "en";
  return (
    <nav
      ref={navRef}
      className={styles.nav}
      data-hidden="false"
      data-revealed="false"
      aria-label={en ? "Journey sections" : "Yolculuk bölümleri"}
    >
      <a className={styles.skip} href="#about" onClick={onSkip}>
        {en ? "Skip the desk tour" : "Masa turunu geç"}
      </a>
      <Brand locale={locale} />
      <div className={styles.links}>
        {chapters.map((chapter, index) => (
          <a
            href={chapter.href}
            key={chapter.id}
            aria-current={current === index ? "location" : undefined}
            onClick={onChapter && ((event) => onChapter(event, index))}
          >
            {chapter.label}
          </a>
        ))}
      </div>
      {sections.length ? (
        <SectionsMenu locale={locale} sections={sections} />
      ) : null}
      <LanguageLink locale={locale} className={styles.language} />
    </nav>
  );
}

/** The bar on content pages; the home page and its lab twin use JourneyNav. */
export function PageNav({ locale }: { locale: "en" | "tr" }) {
  const path = usePathname();
  const en = locale === "en";
  if (
    path === `/${locale}` ||
    path === `/${locale}/` ||
    path === `/${locale}/lab/desk/journey`
  )
    return null;
  const links = [
    { href: `/${locale}#work`, label: en ? "Work" : "Projeler" },
    {
      href: `/${locale}#services`,
      label: en ? "What I do" : "Ne yapıyorum",
      secondary: true,
    },
    {
      href: `/${locale}/research`,
      label: en ? "Research" : "Araştırma",
      page: true,
    },
    {
      href: `/${locale}#about`,
      label: en ? "About" : "Hakkımda",
      secondary: true,
    },
  ];
  return (
    <header className="site-header">
      <nav
        className={`${styles.nav} ${styles.page}`}
        aria-label={en ? "Main navigation" : "Ana gezinme"}
      >
        <Brand locale={locale} />
        <div className={styles.links}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={link.secondary ? styles.secondary : undefined}
              aria-current={
                link.page && path.startsWith(link.href) ? "page" : undefined
              }
            >
              {link.label}
            </Link>
          ))}
        </div>
        <LanguageLink locale={locale} className={styles.language} />
      </nav>
    </header>
  );
}
