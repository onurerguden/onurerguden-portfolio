"use client";
import { setMotionPaused, useMotionPreference } from "@/lib/motion-preference";

/** Pauses every self-moving decoration on the page (WCAG 2.2.2). */
export default function MotionToggle({
  locale,
  className = "motion-toggle",
}: {
  locale: "en" | "tr";
  className?: string;
}) {
  const { paused, reduced } = useMotionPreference();
  // With reduced motion nothing moves on its own, so there is nothing to pause.
  if (reduced) return null;
  return (
    <button
      type="button"
      className={className}
      aria-pressed={paused}
      data-no-physics
      onClick={() => setMotionPaused(!paused)}
    >
      <span className="motion-toggle-icon" aria-hidden="true" />
      {locale === "en" ? "Pause motion" : "Hareketi duraklat"}
    </button>
  );
}
