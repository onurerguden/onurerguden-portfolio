"use client";
import type { CSSProperties, FocusEvent, ReactNode } from "react";
import styles from "./projects.module.css";

/**
 * Sticky stacked cards: each card pins a little lower than the previous
 * one, and cards that are covered shrink and dim (a CSS scroll-driven
 * animation on the list's own view timeline). Keyboard focus never stays
 * hidden under a later card.
 */
export default function ProjectsStack({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  const revealFocus = (event: FocusEvent<HTMLOListElement>) => {
    const card = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-stack-card]",
    );
    if (!card) return;
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const topmost = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    if (topmost && card.contains(topmost)) return;
    // Scroll back to where this card sits before the next one covers it.
    const marker = card.previousElementSibling as HTMLElement | null;
    if (!marker) return;
    const top = marker.getBoundingClientRect().top + window.scrollY;
    const offset = parseFloat(getComputedStyle(card).top) || 0;
    window.scrollTo({ top: top - offset, behavior: "instant" });
  };
  return (
    <ol
      className={styles.stack}
      onFocus={revealFocus}
      style={{ "--n": count } as CSSProperties}
    >
      {children}
    </ol>
  );
}

export function StackCard({
  index,
  children,
}: {
  index: number;
  children: ReactNode;
}) {
  return (
    <>
      <li className={styles.marker} aria-hidden="true" />
      <li
        className={styles.slot}
        data-stack-card
        style={{ "--i": index } as CSSProperties}
      >
        <div className={styles.scaler}>
          {children}
          <span className={styles.shade} aria-hidden="true" />
        </div>
      </li>
    </>
  );
}
