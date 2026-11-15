"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { qa } from "@/lib/qa";
import type { Signal } from "@/lib/desk-story/signal";
import { roomDistance, storyAt } from "@/lib/desk-story/timeline";
import {
  calloutWorld,
  calloutsActive,
  deskCorners,
  layoutCallouts,
  type CalloutTarget,
  type Projected,
} from "@/lib/desk-story/callouts";
import revisions from "@/lib/hand-font-assets.json";
import { deskActions, type DeskInteractions } from "./interactions";
import type { StoryMeasure } from "./use-story-layout";
import { calloutStyles } from "./callout-styles";

/** Set once a desk object has been clicked this visit (sessionStorage). */
const doneKey = "portfolio:callouts-done";
/** Quiet time before another round of fake clicks, and how many rounds. */
const roundEvery = 7000;
const rounds = 3;
/** When the arrows have drawn (callout-styles.ts): the clicks follow. */
const drawn = 1050;
const titles = {
  en: ["Try clicking", "the objects"],
  tr: ["Objelere", "tıklamayı dene"],
};
/**
 * How far the paper curtain has closed (0–1) when nothing of the note is
 * left to see: it clips 4 + 46 × exit percent from each side (journey.tsx),
 * and every word and arrow lies outside the middle fifth of the stage.
 */
const covered = 0.8;
/** The headphones' own note: nothing else says the desk has music. */
const notes = { en: "plays music", tr: "müzik çalar" };

/** Where the targets land on screen, written by the frame, read outside. */
export type CalloutProbe = {
  wanted: boolean;
  at: Projected | null;
  size: { width: number; height: number };
  listeners: Set<() => void>;
};
export function createCalloutProbe(): CalloutProbe {
  return {
    wanted: false,
    at: null,
    size: { width: 0, height: 0 },
    listeners: new Set(),
  };
}

/** Outside the components: React's lint keeps props from being written. */
function publish(
  probe: CalloutProbe,
  at: Projected,
  size: { width: number; height: number },
) {
  probe.at = at;
  probe.size = size;
  for (const listener of probe.listeners) listener();
}
function want(probe: CalloutProbe, wanted: boolean) {
  probe.wanted = wanted;
}

const ids = Object.keys(calloutWorld) as CalloutTarget[];
const world = {
  targets: ids.map((id) => new Vector3(...calloutWorld[id])),
  corners: deskCorners.map((corner) => new Vector3(...corner)),
};
const scratch = new Vector3();

/**
 * Inside the canvas, after the camera has moved (the driver's frame runs
 * at -1): projects the targets while the callout shows. Frames are drawn
 * on demand, so this runs only when the view changes (the pointer's sway).
 */
export function CalloutTracker({ probe }: { probe: CalloutProbe }) {
  useFrame(({ camera, size }) => {
    if (!probe.wanted) return;
    const toScreen = (point: Vector3) => {
      scratch.copy(point).project(camera);
      return {
        x: ((scratch.x + 1) / 2) * size.width,
        y: ((1 - scratch.y) / 2) * size.height,
      };
    };
    const corners = world.corners.map(toScreen);
    const next = {
      deskLeft: Math.min(...corners.map((p) => p.x)),
      deskRight: Math.max(...corners.map((p) => p.x)),
    } as Projected;
    ids.forEach((id, i) => (next[id] = toScreen(world.targets[i])));
    const last = probe.at;
    const moved =
      !last ||
      probe.size.width !== size.width ||
      probe.size.height !== size.height ||
      ids.some(
        (id) =>
          Math.abs(last[id].x - next[id].x) > 0.5 ||
          Math.abs(last[id].y - next[id].y) > 0.5,
      );
    if (!moved) return;
    publish(probe, next, { width: size.width, height: size.height });
  }, 0);
  return null;
}

const handFont = "fonts/hand/portfolio-hand.woff2";
let fontRequested = false;
/** The handwriting, once per visit, as the final view comes near. */
function loadHand() {
  if (fontRequested || typeof FontFace === "undefined") return;
  fontRequested = true;
  const font = new FontFace(
    "Portfolio Hand",
    `url("/${handFont}?v=${revisions[handFont]}")`,
    { weight: "600", display: "swap" },
  );
  document.fonts.add(font);
  void font.load().catch(() => {});
}

function readDone() {
  try {
    return sessionStorage.getItem(doneKey) === "1";
  } catch {
    return false;
  }
}

// DOM writes live outside the component: React's lint keeps a hook's own
// arguments and refs from being written in place.
function setData(
  element: HTMLElement | SVGElement,
  name: string,
  value?: string,
) {
  if (value === undefined) delete element.dataset[name];
  else element.dataset[name] = value;
}
function place(root: HTMLElement, probe: CalloutProbe) {
  const at = probe.at;
  if (!at) return;
  const { width, height } = probe.size;
  const layout = layoutCallouts(width, height, at);
  setData(root, "mode", layout.mode);
  const title = root.querySelector<HTMLElement>("[data-callout-title]");
  if (title && layout.title) {
    title.style.left = `${layout.title.x}px`;
    title.style.top = `${layout.title.y}px`;
    title.style.width = `${layout.title.width}px`;
    title.style.fontSize = `${layout.title.size}px`;
  }
  const note = root.querySelector<HTMLElement>("[data-callout-note]");
  if (note) {
    note.style.display = layout.note ? "" : "none";
    if (layout.note) {
      note.style.left = `${layout.note.x}px`;
      note.style.top = `${layout.note.y}px`;
      note.style.width = `${layout.note.width}px`;
      note.style.fontSize = `${layout.note.size}px`;
    }
  }
  for (const svg of root.querySelectorAll<SVGSVGElement>("svg[data-arrow]")) {
    const arrow = layout.arrows.find((a) => a.id === svg.dataset.arrow);
    svg.style.display = arrow ? "" : "none";
    if (!arrow) continue;
    const { box } = arrow;
    svg.style.left = `${box.x}px`;
    svg.style.top = `${box.y}px`;
    svg.setAttribute("width", String(box.width));
    svg.setAttribute("height", String(box.height));
    svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
    svg.style.transformOrigin = `${arrow.tail.x}px ${arrow.tail.y}px`;
    for (const path of svg.querySelectorAll("[data-shaft]"))
      path.setAttribute("d", arrow.path);
    const burst = svg.querySelector<SVGPathElement>("[data-burst]");
    if (burst) {
      burst.setAttribute("d", arrow.burst);
      burst.style.transformOrigin = `${arrow.tip.x}px ${arrow.tip.y}px`;
    }
  }
}

/**
 * The final view's hand-drawn note (November 15): "Try clicking the
 * objects" and arrows to four of them, the headphones' with a note of its
 * own ("plays music"), drawn in as the view arrives; then each pointed
 * object is tapped in turn (a tease: a hop and a ripple) with a small click
 * at the arrow's tip. Another round follows a quiet spell, a few per visit.
 * It stays through the paper curtain, which covers it from the sides, so a
 * visitor who scrolls straight on still sees it. Once an object is clicked
 * the note has done its job: its arrows run into their objects, the words
 * lift away, and it stays away for the visit. Under the motion pause it is
 * simply there, still. Decoration only: the desk's object list says the
 * same to assistive technology.
 */
export default function DeskCallouts({
  probe,
  controls,
  distance,
  layout,
  locale,
}: {
  probe: CalloutProbe;
  controls: DeskInteractions;
  distance: Signal<number>;
  layout: RefObject<StoryMeasure>;
  locale: "en" | "tr";
}) {
  const root = useRef<HTMLDivElement>(null);
  const { tease, untouched } = controls;
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    let done = readDone();
    let shown = false;
    // The final view itself, not the curtain over it: only there do the
    // objects answer a tap (the desk draws no frames under the curtain).
    let holding = false;
    let played = 0;
    let lastRound = 0;
    let lastInput = performance.now();
    const timers = new Set<number>();
    const later = (callback: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        callback();
      }, ms);
      timers.add(id);
    };
    const clearTimers = () => {
      for (const id of timers) window.clearTimeout(id);
      timers.clear();
    };
    const still = () =>
      document.hidden ||
      document.documentElement.dataset.motionPaused === "true";
    const arrows = () =>
      [...node.querySelectorAll<SVGSVGElement>("svg[data-arrow]")].filter(
        (svg) => svg.style.display !== "none",
      );
    const round = () => {
      if (!shown || !holding || done || still() || played >= rounds) return;
      played++;
      lastRound = performance.now();
      arrows().forEach((svg, i) =>
        later(() => {
          if (!shown || !holding || done) return;
          setData(svg, "click", "");
          later(() => setData(svg, "click"), 450);
          tease(svg.dataset.arrow as CalloutTarget);
        }, i * 480),
      );
    };
    const relayout = () => place(node, probe);
    probe.listeners.add(relayout);
    const show = () => {
      shown = true;
      want(probe, true);
      calloutsActive.set(true);
      relayout();
      setData(node, "state", "rest");
      // Restarted on the next frame, so the drawing plays from its start.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (shown) setData(node, "state", "in");
        }),
      );
      later(round, drawn);
    };
    const hide = (state: "off" | "gone") => {
      shown = false;
      want(probe, false);
      calloutsActive.set(false);
      clearTimers();
      setData(node, "state", state);
    };
    const update = () => {
      const measure = layout.current;
      const d = distance.get();
      // The handwriting loads while the visitor reads the MacBook.
      if (d > roomDistance(measure.timeline) - 2) loadHand();
      const story = storyAt(measure.timeline, d);
      holding = story.segment === "hold" && story.from === "room";
      // Under the curtain too, until the paper has closed over all of it:
      // by `covered` only the middle of the desk still shows, and a note
      // left on beyond that would sway unseen for the rest of the page.
      const final =
        holding || (story.segment === "exit" && story.exit < covered);
      if (final && !shown && !done) show();
      else if (!final && shown) hide("off");
    };
    update();
    const off = distance.on(update);
    const mark = () => {
      lastInput = performance.now();
    };
    const inputs = ["wheel", "keydown", "pointerdown", "touchstart"] as const;
    const options = { passive: true, capture: true } as const;
    for (const type of inputs) window.addEventListener(type, mark, options);
    const check = window.setInterval(() => {
      // A desk object clicked (or chosen from the list): the note's job is
      // done for this visit.
      if (!done && untouched().length < deskActions.length) {
        done = true;
        try {
          sessionStorage.setItem(doneKey, "1");
        } catch {
          // Without storage it stays away for this page view only.
        }
        if (shown) hide("gone");
        return;
      }
      const now = performance.now();
      if (
        shown &&
        now - lastInput > roundEvery &&
        now - lastRound > roundEvery &&
        // QA visits play one round only, so tests stay deterministic.
        !(qa() && played > 0)
      )
        round();
      // Often enough that the note answers a click at once.
    }, 150);
    return () => {
      off();
      window.clearInterval(check);
      for (const type of inputs)
        window.removeEventListener(type, mark, options);
      probe.listeners.delete(relayout);
      want(probe, false);
      calloutsActive.set(false);
      clearTimers();
    };
  }, [probe, tease, untouched, distance, layout]);
  const [first, second] = titles[locale];
  return (
    <div ref={root} data-desk-callouts data-state="off" aria-hidden="true">
      <style>{calloutStyles}</style>
      <p data-callout-title lang={locale}>
        <span>{first}</span> <span>{second}</span>
      </p>
      <p data-callout-note lang={locale}>
        {notes[locale]}
      </p>
      {ids.map((id) => (
        <svg key={id} data-arrow={id}>
          <path data-shaft data-halo pathLength={1} />
          <path data-shaft data-stroke pathLength={1} />
          <path data-burst />
        </svg>
      ))}
    </div>
  );
}
