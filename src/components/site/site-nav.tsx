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
import type { PageLink, SectionLink } from "@/lib/home-sections";
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
  current,
  base = "",
  pages = [],
  desk = true,
}: {
  locale: "en" | "tr";
  sections: SectionLink[];
  /** The desk chapter on screen, marked as the reader's place. */
  current?: string;
  /** Where the sections are: "" on the home page, `/en` elsewhere. */
  base?: string;
  /** Pages of their own (Writing), after the home sections. */
  pages?: PageLink[];
  /** The 3D switch, only where the desk is. */
  desk?: boolean;
}) {
  const en = locale === "en";
  const path = usePathname();
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
              <a
                href={`${base}#${section.id}`}
                aria-current={section.id === current ? "location" : undefined}
                onClick={() => setOpen(false)}
              >
                {section.label}
              </a>
            </li>
          ))}
          {pages.map((page) => (
            <li key={page.href}>
              <Link
                href={page.href}
                aria-current={path.startsWith(page.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {page.label}
              </Link>
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
          {desk ? <DeskToggle locale={locale} /> : null}
        </div>
      </div>
    </div>
  );
}

export type JourneyChapter = { id: string; href: string; label: string };

/**
 * Plays the bar's growth over the desk on the compositor (nav-morph.ts).
 * Loaded once the page is idle, on fine pointers with motion only, so it
 * adds nothing to the first load; until then the bar steps between sizes.
 */
function useNavMorph(navRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const nav = navRef.current;
    if (
      !nav ||
      !matchMedia("(hover: hover) and (pointer: fine)").matches ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    let live = true;
    let stop = () => {};
    const load = () =>
      import("./nav-morph").then(({ morphNav }) => {
        if (live) stop = morphNav(nav);
      });
    const idle =
      typeof requestIdleCallback === "function"
        ? requestIdleCallback(load, { timeout: 3000 })
        : window.setTimeout(load, 1000);
    return () => {
      live = false;
      if (typeof cancelIdleCallback === "function") cancelIdleCallback(idle);
      window.clearTimeout(idle);
      stop();
    };
  }, [navRef]);
}

/** Always in the bar: where visitors go next, whatever is on screen. */
const barSections = ["work", "contact"];

/**
 * The bar over the desk journey. The journey drives its `data-hidden`,
 * `data-revealed` and `data-docked` states through `navRef`. Projects and
 * Contact stay in the bar from the first screen; the desk's chapters live in
 * the Sections menu, which marks the one on screen.
 */
export function JourneyNav({
  locale,
  navRef,
  chapters,
  current,
  sections,
  pages,
  onSkip,
}: {
  locale: "en" | "tr";
  navRef: RefObject<HTMLElement | null>;
  chapters: JourneyChapter[];
  /** Index of the chapter on screen, or -1. */
  current: number;
  sections: SectionLink[];
  pages?: PageLink[];
  onSkip: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const en = locale === "en";
  useNavMorph(navRef);
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
        {sections
          .filter((section) => barSections.includes(section.id))
          .map((section) => (
            <a href={`#${section.id}`} key={section.id}>
              {section.label}
            </a>
          ))}
      </div>
      {sections.length ? (
        <SectionsMenu
          locale={locale}
          sections={sections}
          current={chapters[current]?.id}
          pages={pages}
        />
      ) : null}
      <LanguageLink locale={locale} className={styles.language} />
    </nav>
  );
}

/**
 * The bar on content pages: the same bar as the home page's, so it never
 * changes under the reader. Projects and Contact stay in it; every home
 * section and Writing live in the Sections menu.
 */
export function PageNav({
  locale,
  sections,
  pages,
}: {
  locale: "en" | "tr";
  /** The home sections, from the server so their labels stay out of the bundle. */
  sections: SectionLink[];
  pages: PageLink[];
}) {
  const path = usePathname();
  const en = locale === "en";
  if (
    path === `/${locale}` ||
    path === `/${locale}/` ||
    path === `/${locale}/lab/desk/journey`
  )
    return null;
  return (
    <header className="site-header">
      <nav
        className={`${styles.nav} ${styles.page}`}
        aria-label={en ? "Main navigation" : "Ana gezinme"}
      >
        <Brand locale={locale} />
        <div className={styles.links}>
          {sections
            .filter((section) => barSections.includes(section.id))
            .map((section) => (
              <Link href={`/${locale}#${section.id}`} key={section.id}>
                {section.label}
              </Link>
            ))}
        </div>
        <SectionsMenu
          locale={locale}
          sections={sections}
          base={`/${locale}`}
          pages={pages}
          desk={false}
        />
        <LanguageLink locale={locale} className={styles.language} />
      </nav>
    </header>
  );
}
