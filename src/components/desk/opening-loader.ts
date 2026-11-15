"use client";

import { useEffect, useRef, type RefObject } from "react";
import { qa } from "@/lib/qa";
import { quality } from "@/lib/quality";
import { staticQuery } from "@/lib/motion-preference";
import { creep, loadProgress, resetLoad } from "@/lib/desk-story/load-progress";
import { createScrollHold, holdCap } from "@/lib/desk-story/scroll-hold";

/** Tests set the hold's cap (in milliseconds); QA visits otherwise skip it. */
const qaHoldKey = "portfolio:scroll-hold";

function holdFor() {
  if (!qa()) return holdCap;
  try {
    const stored = Number(localStorage.getItem(qaHoldKey));
    return stored > 0 ? stored : null;
  } catch {
    return null;
  }
}

/** Sets or removes a data attribute (outside the hook, for React's lint). */
function flag(
  element: HTMLElement | null | undefined,
  name: string,
  value?: string,
) {
  if (!element) return;
  if (value === undefined) delete element.dataset[name];
  else element.dataset[name] = value;
}

/**
 * The opening's hint while the desk gets ready (November 15): a ring that
 * fills as the desk really prepares (load-progress.ts), then turns into the
 * scroll hint; meanwhile the page waits at the opening for at most five
 * seconds (scroll-hold.ts). It writes a custom property and attributes on
 * the hint, never React state, so nothing re-renders while it fills.
 */
export function useOpeningLoader({
  section,
  stage,
  ready,
  still,
}: {
  section: RefObject<HTMLElement | null>;
  stage: RefObject<HTMLElement | null>;
  ready: boolean;
  still: boolean;
}) {
  const readyRef = useRef(ready);
  const hold = useRef<ReturnType<typeof createScrollHold> | null>(null);
  useEffect(() => {
    readyRef.current = ready;
    if (ready || still) hold.current?.release();
  }, [ready, still]);

  // The hold starts at hydration, before the desk even turns on, for a
  // visitor who arrives at the top of the page with the desk coming.
  useEffect(() => {
    resetLoad();
    const hint =
      stage.current?.querySelector<HTMLElement>("[data-scroll-hint]");
    const node = section.current;
    const cap = holdFor();
    if (
      cap === null ||
      window.scrollY > 4 ||
      location.hash ||
      matchMedia(staticQuery).matches ||
      quality() === "static"
    )
      return;
    let nudged = 0;
    let unnudge = 0;
    const nudge = () => {
      const now = performance.now();
      if (!hint || now - nudged < 600) return;
      nudged = now;
      // Restarted on the next frame: a running animation would not restart.
      flag(hint, "nudge");
      requestAnimationFrame(() => {
        flag(hint, "nudge", "");
        window.clearTimeout(unnudge);
        unnudge = window.setTimeout(() => flag(hint, "nudge"), 500);
      });
    };
    // A link to a section lets go at once.
    const linked = new AbortController();
    flag(node, "holding", "true");
    const current = createScrollHold(window, {
      cap,
      onHeld: nudge,
      onRelease() {
        flag(node, "holding");
        linked.abort();
      },
    });
    window.addEventListener("hashchange", () => current.release(), {
      signal: linked.signal,
    });
    hold.current = current;
    return () => {
      window.clearTimeout(unnudge);
      current.release();
      hold.current = null;
    };
  }, [section, stage]);

  // The ring: eased towards the stage the desk has reached, creeping on
  // towards the next one meanwhile, and closed once the desk shows.
  useEffect(() => {
    const hint =
      stage.current?.querySelector<HTMLElement>("[data-scroll-hint]");
    if (!hint || still || hint.dataset.load === "done") return;
    let frame = 0;
    let shown = 0;
    let written = -1;
    let last = 0;
    let reached = loadProgress.get();
    let reachedAt = performance.now();
    const off = loadProgress.on((value) => {
      reached = value;
      reachedAt = performance.now();
    });
    const tick = (now: number) => {
      const dt = last ? Math.min(now - last, 100) : 16;
      last = now;
      const done = readyRef.current;
      const goal = done ? 1 : creep(reached, now - reachedAt);
      shown += (goal - shown) * (1 - Math.exp(-dt / (done ? 110 : 240)));
      if (done && shown > 0.995) shown = 1;
      if (Math.abs(shown - written) >= 0.002 || shown === 1) {
        written = shown;
        hint.style.setProperty("--p", shown.toFixed(3));
      }
      if (shown === 1) {
        flag(hint, "load", "done");
        frame = 0;
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      off();
      cancelAnimationFrame(frame);
    };
  }, [stage, still]);

  return hold;
}
