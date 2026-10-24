"use client";

import { useEffect, type RefObject } from "react";
import { qa } from "@/lib/qa";
import type { Signal } from "@/lib/desk-story/signal";
import { teaseRange } from "@/lib/desk-story/timeline";
import {
  nextTeaseGap,
  pickTease,
  teaseDue,
  teaseRules,
} from "@/lib/desk-interaction-motion";
import type { DeskInteractions } from "./interactions";
import type { StoryMeasure } from "./use-story-layout";

/** How many teases this visit has shown (sessionStorage). */
const shownKey = "portfolio:teases-shown";
/** Tests set the quiet time (in milliseconds); QA visits otherwise skip. */
const qaKey = "portfolio:teases";
const inputs = [
  "wheel",
  "scroll",
  "keydown",
  "pointerdown",
  "touchstart",
] as const;

function rules() {
  if (!qa()) return teaseRules;
  try {
    const quiet = Number(localStorage.getItem(qaKey));
    return quiet > 0
      ? { ...teaseRules, quiet, gapMin: quiet, gapMax: quiet }
      : null;
  } catch {
    return null;
  }
}
function readShown() {
  try {
    return Number(sessionStorage.getItem(shownKey)) || 0;
  } catch {
    return teaseRules.perVisit;
  }
}

/**
 * Now and then, between leaving the MacBook and the curtain, an object the
 * visitor has not clicked yet hops or peeks with a ripple, as if tapped
 * (October 24): a hint that the desk's objects answer clicks. A few per
 * visit, never while the visitor is busy, under a motion pause or in a
 * hidden tab.
 */
export default function DeskTeases({
  controls,
  distance,
  layout,
}: {
  controls: DeskInteractions;
  distance: Signal<number>;
  layout: RefObject<StoryMeasure>;
}) {
  const { tease, untouched, active } = controls;
  useEffect(() => {
    const rule = rules();
    if (!rule || !active) return;
    let lastInput = performance.now();
    let lastTease = -Infinity;
    const teased = new Set<string>();
    let gap = 0;
    const mark = () => {
      lastInput = performance.now();
    };
    const options = { passive: true, capture: true } as const;
    for (const type of inputs) window.addEventListener(type, mark, options);
    const check = () => {
      const [start, end] = teaseRange(layout.current.timeline);
      const d = distance.get();
      const now = performance.now();
      if (
        d < start ||
        d >= end ||
        document.hidden ||
        document.documentElement.dataset.motionPaused === "true" ||
        !teaseDue({ now, lastInput, lastTease, gap, shown: readShown() }, rule)
      )
        return;
      // A different object each time while there is one.
      const left = untouched();
      const fresh = left.filter((action) => !teased.has(action));
      const pending = fresh.length ? fresh : left;
      const action = qa() ? pending[0] : pickTease(pending);
      if (!action) return;
      teased.add(action);
      lastTease = now;
      gap = nextTeaseGap(rule);
      try {
        sessionStorage.setItem(shownKey, String(readShown() + 1));
      } catch {
        // Without storage the visit's count cannot grow: no more teases.
      }
      tease(action);
    };
    const timer = setInterval(check, Math.min(500, rule.quiet / 2));
    return () => {
      clearInterval(timer);
      for (const type of inputs)
        window.removeEventListener(type, mark, options);
    };
  }, [tease, untouched, active, distance, layout]);
  return null;
}
