"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import {
  closeupScale,
  divesAt,
  panelHeight,
  screenPixelWidths,
} from "@/lib/desk-story/camera";
import { buildTimeline, type Timeline } from "@/lib/desk-story/timeline";
import { curtainQuery } from "@/lib/desk-story/curtain";
import type { PanelRefs } from "./screen-panels";

/** The monitor is laid out as a column at least this many visible px wide. */
const minimumColumn = 320;
const portraitIndex = 0;
const macbookIndex = 2;

export type RevealRow = {
  node: HTMLElement;
  top: number;
  height: number;
  value?: number;
};
export type ScreenLayout = {
  /** The screen takes over the view instead of being read on the desk. */
  dive: boolean;
  /** The panel's CSS size: its screen's resolution, or the stage when diving. */
  width: number;
  height: number;
  /** Visible CSS px per panel px while the screen is read. */
  scale: number;
  /** How far the content runs past its window, in panel px. */
  overflow: number;
  /** The height of the window the content scrolls in, in panel px. */
  window: number;
};
export type StoryMeasure = {
  timeline: Timeline;
  stage: { width: number; height: number };
  /** The page's scroll-padding-top, so anchors land where links expect. */
  scrollPadding: number;
  screens: Record<"portrait" | "macbook", ScreenLayout>;
  portrait: { experienceTop: number; rows: RevealRow[] };
};

const fixedScreen = (index: number): ScreenLayout => ({
  dive: false,
  width: screenPixelWidths[index],
  height: panelHeight(index),
  scale: 1,
  overflow: 0,
  window: panelHeight(index),
});
export const initialMeasure = (): StoryMeasure => ({
  timeline: buildTimeline(),
  stage: { width: 0, height: 0 },
  scrollPadding: 0,
  screens: {
    portrait: fixedScreen(portraitIndex),
    macbook: fixedScreen(macbookIndex),
  },
  portrait: { experienceTop: 0, rows: [] },
});

/** Top of `node` in `ancestor`'s coordinates, ignoring transforms. */
export function localTop(node: HTMLElement, ancestor: HTMLElement) {
  let top = 0;
  let current: HTMLElement | null = node;
  while (current && current !== ancestor) {
    top += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }
  return top;
}

/** Sizes a panel for reading on the desk or for taking over the view. */
function sizePanel(
  panel: HTMLElement,
  index: number,
  width: number,
  height: number,
) {
  const dive = divesAt(index, width, height);
  const scale = dive ? 1 : closeupScale(index, width, height);
  const size = dive
    ? { width, height }
    : { width: screenPixelWidths[index], height: panelHeight(index) };
  panel.style.width = `${size.width}px`;
  panel.style.height = `${size.height}px`;
  panel.dataset.dive = String(dive);
  // The monitor's column never narrows below a readable width.
  const layoutScale =
    index === portraitIndex && !dive
      ? Math.max(scale, minimumColumn / screenPixelWidths[index])
      : scale;
  panel.style.setProperty("--screen-scale", layoutScale.toFixed(4));
  return { dive, scale, ...size };
}

/** The content box a track scrolls in: the panel less any takeover padding. */
function windowHeight(track: HTMLElement) {
  const surface = track.parentElement!;
  const style = getComputedStyle(surface);
  return (
    surface.clientHeight -
    (parseFloat(style.paddingTop) || 0) -
    (parseFloat(style.paddingBottom) || 0)
  );
}

/**
 * Measures the screens' content and lays the story out so one scroll pixel
 * moves the content one visible pixel. Re-measures on resize and once the
 * fonts arrive; `measured` changes only when the timeline does.
 */
export function useStoryLayout(
  enabled: boolean,
  stage: RefObject<HTMLElement | null>,
  panels: PanelRefs,
) {
  const layout = useRef<StoryMeasure>(initialMeasure());
  // A render-safe copy for anchors and the journey height; the shell and
  // the Driver read the ref on every scroll and frame.
  const [measured, setMeasured] = useState<StoryMeasure>(initialMeasure);
  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const stageNode = stage.current;
      const portrait = panels.current[portraitIndex];
      const macbook = panels.current[macbookIndex];
      const track = portrait?.querySelector<HTMLElement>("[data-track]");
      if (!stageNode || !portrait || !macbook || !track) return;
      const width = stageNode.offsetWidth;
      const height = stageNode.offsetHeight;
      if (!width || !height) return;
      const monitor = sizePanel(portrait, portraitIndex, width, height);
      const laptop = sizePanel(macbook, macbookIndex, width, height);
      const monitorWindow = windowHeight(track);
      const monitorOverflow = Math.max(0, track.offsetHeight - monitorWindow);
      const body = macbook.querySelector<HTMLElement>("[data-explorer-body]");
      const list = macbook.querySelector<HTMLElement>("[data-explorer-list]");
      const listWindow = body?.clientHeight ?? 0;
      const listOverflow = Math.max(0, (list?.offsetHeight ?? 0) - listWindow);
      const experience = track.querySelector<HTMLElement>(
        '[data-story-section="experience"]',
      );
      const previous = layout.current;
      const rows = [
        ...track.querySelectorAll<HTMLElement>("[data-reveal-row]"),
      ].map((node) => ({
        node,
        top: localTop(node, track),
        height: node.offsetHeight,
      }));
      const screens = {
        portrait: {
          ...monitor,
          overflow: monitorOverflow,
          window: monitorWindow,
        },
        macbook: { ...laptop, overflow: listOverflow, window: listWindow },
      };
      const exit = matchMedia(curtainQuery).matches;
      const changed =
        exit !== previous.timeline.segments.some((s) => s.kind === "exit") ||
        width !== previous.stage.width ||
        height !== previous.stage.height ||
        (["portrait", "macbook"] as const).some(
          (key) =>
            screens[key].dive !== previous.screens[key].dive ||
            Math.abs(screens[key].overflow - previous.screens[key].overflow) >=
              1,
        );
      layout.current = {
        timeline: changed
          ? buildTimeline({
              portrait: (monitorOverflow * monitor.scale) / height,
              macbook: (listOverflow * laptop.scale) / height,
              dive: { portrait: monitor.dive, macbook: laptop.dive },
              exit,
            })
          : previous.timeline,
        stage: { width, height },
        scrollPadding:
          parseFloat(
            getComputedStyle(document.documentElement).scrollPaddingTop,
          ) || 0,
        screens,
        portrait: {
          experienceTop: experience ? localTop(experience, track) : 0,
          rows,
        },
      };
      if (changed) setMeasured(layout.current);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    schedule();
    const observer = new ResizeObserver(schedule);
    if (stage.current) observer.observe(stage.current);
    for (const panel of [
      panels.current[portraitIndex],
      panels.current[macbookIndex],
    ]) {
      const track = panel?.querySelector("[data-track]");
      if (track) observer.observe(track);
    }
    const list = panels.current[macbookIndex]?.querySelector(
      "[data-explorer-list]",
    );
    if (list) observer.observe(list);
    let live = true;
    document.fonts?.ready.then(() => {
      if (live) schedule();
    });
    return () => {
      live = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [enabled, stage, panels]);
  return { layout, measured };
}
