"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import styles from "./stack.module.css";

/**
 * Drives the Bliss layers with one CSS variable: --s runs from -1 as the
 * section enters to 1 as it leaves. The layers translate in CSS, so without
 * JavaScript (or at rest) they recompose the original photograph exactly.
 */
export default function StackParallax({ children }: { children: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: track,
    offset: ["start end", "end start"],
  });
  const apply = (progress: number) =>
    track.current?.style.setProperty("--s", (progress * 2 - 1).toFixed(4));
  useMotionValueEvent(scrollYProgress, "change", apply);
  // A page restored mid-section gets its offsets before the first scroll.
  useEffect(() => {
    apply(scrollYProgress.get());
  });
  return (
    <div ref={track} className={styles.track}>
      {children}
    </div>
  );
}
