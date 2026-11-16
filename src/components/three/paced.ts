"use client";
import { useRef } from "react";
import {
  addEffect,
  useFrame,
  useThree,
  type RenderCallback,
} from "@react-three/fiber";
import { measureFrameInterval } from "@/lib/desk-story/frame-budget";
import { paceStory } from "@/lib/desk-story/clock";
import { chosenPace, paceFor, pacer } from "@/lib/frame-pacer";
import { quality } from "@/lib/quality";

/**
 * The scenes' side of frame pacing (src/lib/frame-pacer.ts).
 *
 * React Three Fiber runs one loop for every canvas on the page and calls
 * each scene's frame callbacks on every refresh a frame was asked for. Before
 * each turn of that loop the pacer says whether this refresh is one to draw.
 * On the others every callback here sits out and keeps the time that passed
 * for its next turn, so a scene's motion advances by real time whatever the
 * pace. Nothing is drawn, moved or written on a refresh sat out: the camera,
 * the screens' HTML placed from it and the picture stay in step.
 */
let drawing = true;
addEffect((stamp) => {
  drawing = pacer.beat(stamp);
});
paceStory(pacer);

let settled: Promise<void> | null = null;
/**
 * The pace before the desk has judged its own frames, decided once: a pace
 * the visitor (or QA) chose, or for integrated graphics the display's own
 * (every second refresh of a 120 Hz screen). The desk then sets it from what
 * its frames cost (src/lib/desk-story/frame-budget.ts); section scenes that
 * mount without the desk keep this one.
 */
export function settlePace() {
  return (settled ??= measureFrameInterval().then((refreshMs) => {
    const chosen = chosenPace();
    if (chosen !== null) pacer.set(chosen, refreshMs);
    else if (quality() === "low") pacer.set(paceFor(refreshMs), refreshMs);
    else pacer.set(pacer.every, refreshMs);
  }));
}

/**
 * `useFrame` for a paced scene: called on the refreshes the pacer draws,
 * with the time since its last call.
 */
export function usePacedFrame(callback: RenderCallback, priority = 0) {
  const held = useRef(0);
  useFrame((state, delta, frame) => {
    if (!drawing) {
      held.current += delta;
      return;
    }
    const passed = delta + held.current;
    held.current = 0;
    callback(state, passed, frame);
  }, priority);
}

/**
 * One per canvas. A frame asked for on a refresh the pacer sits out is still
 * owed: this asks for the next refresh, so the loop keeps turning until the
 * frame is drawn.
 */
export function PaceGate() {
  const invalidate = useThree((state) => state.invalidate);
  useFrame(() => {
    if (!drawing) invalidate();
  }, -1000);
  return null;
}

/**
 * Draws one frame now, whatever the pace: a scene's hidden warm-up frame or
 * the still a paused scene stops on.
 */
export function drawNow(advance: (stamp: number) => void) {
  pacer.force();
  advance(performance.now());
}
