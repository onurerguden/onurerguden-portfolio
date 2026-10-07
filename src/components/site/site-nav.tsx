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
import { deskMode, useStaticDesk } from "@/lib/desk-mode";
import { useMotionPreference } from "@/lib/motion-preference";
import { currentSection } from "@/lib/current-section";
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

/**
 * Turns the desk's 3D off (static view) or back on for this visit. Turning it
 * on below the desk keeps the reader on their section while the journey grows
 * back above it.
 */
function DeskToggle({ locale }: { locale: "en" | "tr" }) {
  const en = locale === "en";
  const staticView = useStaticDesk();
  const { reduced } = useMotionPreference();
  const [announced, setAnnounced] = useState(false);
  // Reduced motion and touch devices never run the 3D: nothing to switch.
  if (reduced) return null;
  return (
    <>
      <button
        type="button"
        className={styles.motionToggle}
        data-desk-toggle
        onClick={() => {
          setAnnounced(true);
          const section = currentSection.get();
          deskMode.set(!staticView);
          if (staticView && section) {
            // The journey holds a hash target in place while it re-measures.
            history.replaceState(null, "", `#${section}`);
            window.dispatchEvent(new HashChangeEvent("hashchange"));
          }
        }}
      >
        {staticView
          ? en
            ? "Turn 3D on"
            : "3D’yi aç"
          : en
            ? "Turn 3D off"
            : "3D’yi kapat"}
      </button>
      <span className="visually-hidden" role="status">
        {announced
          ? staticView
            ? en
              ? "3D is off; the page is static"
              : "3D kapalı; sayfa sabit"
            : en
              ? "3D is on"
              : "3D açık"
          : ""}
      </span>
    </>
  );
}

/** Every home section plus the page-wide motion and 3D toggles. */
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
    const inside = (node: EventTarget | null) =>
      !!menu.current?.contains(node as Node);
    // Escape belongs to whichever menu has focus: this one takes focus back
    // only when focus is still inside it. Focus or a press anywhere else,
    // such as the Start menu, simply closes it.
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      if (inside(document.activeElement)) button.current?.focus();
    };
    const away = (event: Event) => {
      if (!inside(event.target)) setOpen(false);
    };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", away);
    document.addEventListener("focusin", away);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("focusin", away);
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
        <div
          className={styles.menuGroup}
          role="group"
          aria-labelledby="journey-motion-label"
        >
          <p id="journey-motion-label">{en ? "Motion" : "Hareket"}</p>
          <MotionToggle locale={locale} className={styles.motionToggle} />
          <DeskToggle locale={locale} />
        </div>
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
