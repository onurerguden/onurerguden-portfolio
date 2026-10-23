"use client";

import { useEffect, useRef, type CSSProperties, type RefObject } from "react";
import { qa } from "@/lib/qa";
import type { Signal } from "@/lib/desk-story/signal";
import { storyAt } from "@/lib/desk-story/timeline";
import { createIdleCue, cueFor, idleCueAfter } from "@/lib/desk-story/idle-cue";
import type { StoryMeasure } from "./use-story-layout";
import hintStyles from "./scroll-hint.module.css";

/** Tests shorten the wait (in milliseconds); QA visits otherwise skip it. */
const qaDelayKey = "portfolio:idle-cue";

// Inline, from the scene's chunk: a class here would ship with the first
// load. White with a difference blend reads dark on the paper screens and
// light over the desk, like the cursor ring.
const footStyle = {
  position: "absolute",
  zIndex: 5,
  bottom: 24,
  left: "50%",
  transform: "translateX(-50%)",
  pointerEvents: "none",
  visibility: "hidden",
  mixBlendMode: "difference",
  "--hint": "#ffffffb3",
} as CSSProperties;

function idleDelay() {
  if (!qa()) return idleCueAfter;
  try {
    const stored = Number(localStorage.getItem(qaDelayKey));
    return stored > 0 ? stored : null;
  } catch {
    return null;
  }
}

type CueState = "off" | "rest" | "run";
function set(cue: HTMLElement, state: CueState) {
  cue.dataset.cue = state;
  cue.style.visibility = state === "off" ? "hidden" : "";
}
/**
 * Plays the hint's strokes again. A frame at rest first drops the finished
 * animation (without forcing a layout), so the next state starts it anew.
 */
function play(cue: HTMLElement) {
  set(cue, "rest");
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      if (cue.dataset.cue === "rest") set(cue, "run");
    }),
  );
}

/**
 * The desk story's scroll hint, again (October 24): on arriving at the
 * final view, and wherever the visitor has not scrolled for a while; the
 * opening's own hint beside the portrait, or this one at the foot of the
 * view. It writes attributes only, never React state: the scene beside it
 * must not re-render.
 */
export default function IdleCue({
  distance,
  layout,
  wrapper,
}: {
  distance: Signal<number>;
  layout: RefObject<StoryMeasure>;
  wrapper: RefObject<HTMLDivElement | null>;
}) {
  const foot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const cue = foot.current;
    const stage = wrapper.current?.closest<HTMLElement>("[data-ready]");
    if (!cue || !stage) return;
    const state = () => {
      const { timeline } = layout.current;
      return { story: storyAt(timeline, distance.get()), timeline };
    };
    const finalView = () => {
      const { story } = state();
      return story.segment === "hold" && story.from === "room";
    };
    // Arriving at the final view shows the cue there, as it always has; it
    // leaves with the view.
    let atFinal = finalView();
    const off = distance.on(() => {
      const now = finalView();
      if (now === atFinal) return;
      atFinal = now;
      if (now && stage.dataset.ready === "true") play(cue);
      else set(cue, "off");
    });
    const delay = idleDelay();
    const stop =
      delay === null
        ? () => {}
        : createIdleCue(window, {
            quiet: delay,
            onIdle() {
              // Still preparing: wait another spell rather than lose this one.
              if (stage.dataset.ready !== "true") return false;
              const { story, timeline } = state();
              const place = cueFor(story, timeline.length);
              if (
                !place ||
                document.hidden ||
                document.documentElement.dataset.motionPaused === "true"
              )
                return;
              const target =
                place === "opening"
                  ? stage.querySelector<HTMLElement>("[data-scroll-hint]")
                  : cue;
              if (target) play(target);
            },
            onActive() {
              // A cue the quiet called leaves with the next input; the final
              // view's own stays until the view does.
              if (!atFinal && cue.dataset.cue !== "off") set(cue, "off");
            },
          });
    return () => {
      off();
      stop();
    };
  }, [distance, layout, wrapper]);
  return (
    <div
      ref={foot}
      data-idle-cue
      data-cue="off"
      aria-hidden="true"
      style={footStyle}
    >
      <span className={hintStyles.hint} />
    </div>
  );
}
