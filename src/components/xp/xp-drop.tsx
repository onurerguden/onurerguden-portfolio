"use client";
import { useMotionPreference } from "@/lib/motion-preference";
import styles from "./xp.module.css";

export const dropEvent = "portfolio:drop-balls";

/** The dialog's close box: drops the balls again, scattering as they fall. */
export default function XpDrop({ label }: { label: string }) {
  const { paused } = useMotionPreference();
  return (
    <button
      type="button"
      className={`${styles.close} ${styles.drop}`}
      aria-label={label}
      title={label}
      aria-disabled={paused}
      data-no-physics
      onClick={() => {
        if (!paused) window.dispatchEvent(new Event(dropEvent));
      }}
    />
  );
}
