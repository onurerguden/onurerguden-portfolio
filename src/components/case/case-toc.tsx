"use client";
import { useEffect, useState } from "react";
import styles from "./case.module.css";

/** "On this page", marking the section being read. */
export default function CaseToc({
  label,
  sections,
}: {
  label: string;
  sections: { id: string; label: string }[];
}) {
  const [current, setCurrent] = useState<string | null>(null);
  useEffect(() => {
    const headings = sections
      .map((section) => document.getElementById(section.id))
      .filter((node): node is HTMLElement => Boolean(node));
    // The last heading above the upper third of the viewport is current.
    const update = () => {
      let active: string | null = null;
      for (const heading of headings)
        if (heading.getBoundingClientRect().top < innerHeight * 0.33)
          active = heading.id;
      setCurrent(active);
    };
    const observer = new IntersectionObserver(update, {
      rootMargin: "0px 0px -66% 0px",
    });
    for (const heading of headings) observer.observe(heading);
    update();
    return () => observer.disconnect();
  }, [sections]);
  return (
    <nav className={styles.toc} aria-label={label}>
      <h2>{label}</h2>
      <ol>
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={current === section.id ? "location" : undefined}
            >
              {section.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
