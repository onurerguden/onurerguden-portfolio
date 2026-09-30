"use client";
import styles from "./stack.module.css";

/** The dialog's close box: tosses the balls into the air. */
export default function XpToss({ label }: { label: string }) {
  return (
    <button
      type="button"
      className={`${styles.close} ${styles.toss}`}
      aria-label={label}
      title={label}
      data-no-physics
      onClick={() => window.dispatchEvent(new Event("portfolio:toss-balls"))}
    />
  );
}
