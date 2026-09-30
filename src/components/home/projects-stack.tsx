"use client";
import {
  createContext,
  useContext,
  useRef,
  type CSSProperties,
  type FocusEvent,
  type ReactNode,
} from "react";
import {
  motion,
  motionValue,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import styles from "./projects.module.css";

const StackProgress = createContext<{
  progress: MotionValue<number>;
  count: number;
}>({ progress: motionValue(0), count: 1 });

/**
 * Sticky stacked cards: each card pins a little lower than the previous
 * one, and cards that are covered shrink and dim. Keyboard focus never
 * stays hidden under a later card.
 */
export default function ProjectsStack({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  const list = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({
    target: list,
    offset: ["start start", "end end"],
  });
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
    <StackProgress.Provider value={{ progress: scrollYProgress, count }}>
      <ol ref={list} className={styles.stack} onFocus={revealFocus}>
        {children}
      </ol>
    </StackProgress.Provider>
  );
}

export function StackCard({
  index,
  children,
}: {
  index: number;
  children: ReactNode;
}) {
  const { progress, count } = useContext(StackProgress);
  const start = index / count;
  const depth = count - 1 - index;
  const scale = useTransform(progress, [start, 1], [1, 1 - 0.045 * depth]);
  const dim = useTransform(progress, [start, 1], [0, depth ? 0.45 : 0]);
  return (
    <>
      <li className={styles.marker} aria-hidden="true" />
      <li
        className={styles.slot}
        data-stack-card
        style={{ "--i": index } as CSSProperties}
      >
        {/* Server and client render the same tree; reduced motion, phones and
            short screens switch the transform and shade off in CSS. */}
        <motion.div className={styles.scaler} style={{ scale }}>
          {children}
          <motion.span
            className={styles.shade}
            aria-hidden="true"
            style={{ opacity: dim }}
          />
        </motion.div>
      </li>
    </>
  );
}
