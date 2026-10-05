"use client";
import { useState } from "react";
import { setMotionPaused, useMotionPreference } from "@/lib/motion-preference";

const copy = {
  en: {
    pause: "Pause motion",
    resume: "Resume motion",
    paused: "Motion paused",
    resumed: "Motion resumed",
  },
  tr: {
    pause: "Hareketi duraklat",
    resume: "Hareketi sürdür",
    paused: "Hareket duraklatıldı",
    resumed: "Hareket sürüyor",
  },
};

/**
 * Pauses every self-moving decoration on the page (WCAG 2.2.2). The label
 * says what the button will do next, and a status message confirms the
 * change; `iconOnly` keeps the label for assistive technology alone.
 */
export default function MotionToggle({
  locale,
  className = "motion-toggle",
  iconOnly = false,
}: {
  locale: "en" | "tr";
  className?: string;
  iconOnly?: boolean;
}) {
  const { paused, reduced } = useMotionPreference();
  // Announced only after a press, never on load.
  const [announced, setAnnounced] = useState(false);
  // With reduced motion nothing moves on its own, so there is nothing to pause.
  if (reduced) return null;
  const t = copy[locale];
  const label = paused ? t.resume : t.pause;
  return (
    <>
      <button
        type="button"
        className={className}
        data-paused={paused}
        data-no-physics
        aria-label={iconOnly ? label : undefined}
        title={iconOnly ? label : undefined}
        onClick={() => {
          setAnnounced(true);
          setMotionPaused(!paused);
        }}
      >
        <span className="motion-toggle-icon" aria-hidden="true" />
        {iconOnly ? null : label}
      </button>
      <span className="visually-hidden" role="status">
        {announced ? (paused ? t.paused : t.resumed) : ""}
      </span>
    </>
  );
}
