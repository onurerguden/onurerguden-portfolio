"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { closeupScale, panelHeight } from "@/lib/desk-story/camera";
import { buildTimeline, type Timeline } from "@/lib/desk-story/timeline";
import type { PanelRefs } from "./screen-panels";

export type RevealRow = {
  node: HTMLElement;
  top: number;
  height: number;
  value?: number;
};
export type StoryMeasure = {
  timeline: Timeline;
  stage: { width: number; height: number };
  /** The page's scroll-padding-top, so anchors land where links expect. */
  scrollPadding: number;
  portrait: {
    /** CSS px per panel px at the reading stop. */
    scale: number;
    /** Panel height and how far its content runs past it, in panel px. */
    height: number;
    overflow: number;
    experienceTop: number;
    rows: RevealRow[];
  };
};

export const initialMeasure = (): StoryMeasure => ({
  timeline: buildTimeline(),
  stage: { width: 0, height: 0 },
  scrollPadding: 0,
  portrait: {
    scale: 1,
    height: panelHeight(0),
    overflow: 0,
    experienceTop: 0,
    rows: [],
  },
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

/**
 * Measures the monitor's content and lays the story out so one scroll pixel
 * moves the content one visible pixel. Re-measures on resize and once the
 * fonts arrive; `measured` changes only when the timeline does.
 */
export function useStoryLayout(
  enabled: boolean,
  stage: RefObject<HTMLElement | null>,
  panels: PanelRefs,
) {
  const layout = useRef<StoryMeasure>(initialMeasure());
  // A render-safe copy for anchors and the journey height; the Driver reads
  // the ref every frame.
  const [measured, setMeasured] = useState<StoryMeasure>(initialMeasure);
  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const stageNode = stage.current;
      const panel = panels.current[0];
      const track = panel?.querySelector<HTMLElement>("[data-track]");
      if (!stageNode || !panel || !track) return;
      const width = stageNode.offsetWidth;
      const height = stageNode.offsetHeight;
      if (!width || !height) return;
      const scale = closeupScale(0, width, height);
      panel.style.setProperty("--screen-scale", scale.toFixed(4));
      const panelPx = panel.offsetHeight;
      const overflow = Math.max(0, track.offsetHeight - panelPx);
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
      const changed =
        Math.abs(overflow - previous.portrait.overflow) >= 1 ||
        width !== previous.stage.width ||
        height !== previous.stage.height;
      layout.current = {
        timeline: changed
          ? buildTimeline({ portrait: (overflow * scale) / height, macbook: 1 })
          : previous.timeline,
        stage: { width, height },
        scrollPadding:
          parseFloat(
            getComputedStyle(document.documentElement).scrollPaddingTop,
          ) || 0,
        portrait: {
          scale,
          height: panelPx,
          overflow,
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
    const track = panels.current[0]?.querySelector("[data-track]");
    if (track) observer.observe(track);
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
