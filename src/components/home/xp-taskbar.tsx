"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { SectionLink } from "@/lib/home-sections";
import styles from "./stack.module.css";

const clockFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});
function subscribeClock(onChange: () => void) {
  let timer = 0;
  const tick = () => {
    onChange();
    timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
  };
  timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
  return () => window.clearTimeout(timer);
}
/** İzmir time, rendered only after hydration so server and client match. */
function useIzmirClock() {
  return useSyncExternalStore(
    subscribeClock,
    () => clockFormat.format(Date.now()),
    () => "",
  );
}

export default function XpTaskbar({
  locale,
  sections,
  links,
}: {
  locale: "en" | "tr";
  sections: SectionLink[];
  links: { label: string; href: string }[];
}) {
  const en = locale === "en";
  const time = useIzmirClock();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const items = () => [
    ...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []),
  ];

  useEffect(() => {
    if (!open) return;
    items()[0]?.focus();
    const outside = (event: PointerEvent) => {
      if (
        !menu.current?.contains(event.target as Node) &&
        !button.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  const onMenuKey = (event: React.KeyboardEvent) => {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      list[(index + step + list.length) % list.length]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      list[event.key === "Home" ? 0 : list.length - 1]?.focus();
    } else if (event.key === "Escape") {
      setOpen(false);
      button.current?.focus();
    } else if (event.key === "Tab") setOpen(false);
  };

  return (
    <div className={styles.taskbar} data-no-physics>
      <button
        ref={button}
        type="button"
        className={styles.start}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="xp-start-menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.orb} aria-hidden="true" />
        start
      </button>
      <div
        ref={menu}
        id="xp-start-menu"
        className={styles.startMenu}
        role="menu"
        aria-label={en ? "Jump to a section" : "Bir bölüme git"}
        hidden={!open}
        onKeyDown={onMenuKey}
      >
        <p className={styles.startHeader} aria-hidden="true">
          Onur Ergüden
        </p>
        {sections.map((section) => (
          <a
            key={section.id}
            role="menuitem"
            tabIndex={-1}
            href={`#${section.id}`}
            onClick={() => setOpen(false)}
          >
            {section.label}
          </a>
        ))}
        <span className={styles.startDivider} role="separator" />
        {links.map((link) => (
          <a key={link.href} role="menuitem" tabIndex={-1} href={link.href}>
            {link.label}
          </a>
        ))}
      </div>
      <div className={styles.tray}>
        <span className={styles.credit}>
          Bliss © Microsoft ·{" "}
          {en ? "photo by Charles O’Rear" : "fotoğraf: Charles O’Rear"}
        </span>
        <time
          className={styles.clock}
          aria-label={en ? "İzmir time" : "İzmir saati"}
        >
          {time}
        </time>
      </div>
    </div>
  );
}
