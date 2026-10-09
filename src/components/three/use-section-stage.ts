"use client";
import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import { allowsStages, useMotionPreference } from "@/lib/motion-preference";
import { probeWebGL } from "@/lib/quality";
import { onScrollPause } from "@/lib/scroll-pause";
import { stageRegistry } from "@/lib/stage-registry";

export type StageState = "static" | "idle" | "loading" | "live" | "failed";

/** QA can force section scenes on a software renderer (e.g. headless tests). */
export const force3dKey = "portfolio:force-3d";
const softwareRenderer = /swiftshader|llvmpipe|softpipe|software/i;

let webgl2: boolean | null = null;
/**
 * Reads the visit's one WebGL probe (src/lib/quality.ts). Section scenes are
 * decorative, so a software renderer (no GPU acceleration) gets the static
 * poster instead of a main thread spent on shading.
 */
export function supportsWebGL2() {
  if (webgl2 !== null) return webgl2;
  const probe = probeWebGL();
  let forced = false;
  try {
    forced = localStorage.getItem(force3dKey) === "1";
  } catch {
    // Storage can be blocked; the default stands.
  }
  webgl2 = probe.webgl2 && (forced || !softwareRenderer.test(probe.renderer));
  return webgl2;
}

/** A stage that failed stays static for the rest of the visit. */
const failedStages = new Set<string>();

type Options = {
  id: string;
  priority?: number;
  /** False until an opt-in scene (e.g. the activity skyline) is requested. */
  requested?: boolean;
  nearMargin?: string;
  farMargin?: string;
  /**
   * Set by stages whose element is projected (the MacBook's balls): an
   * intersection observer cannot tell where the camera is, so the story
   * says when the stage is visible and wanted instead.
   */
  visible?: boolean;
  wanted?: boolean;
  /**
   * Mount under reduced motion too (the tech stack balls, at Onur's request).
   * The visitor's pause still freezes the scene.
   */
  evenWhenReduced?: boolean;
};

/**
 * Gates a section's WebGL scene: it mounts once the section is near and the
 * visitor pauses scrolling,
 * only while the page-wide registry grants it a context, and never without
 * WebGL2 or (unless `evenWhenReduced`) under reduced motion. It unmounts again when far offscreen.
 */
export function useSectionStage(
  ref: RefObject<HTMLElement | null>,
  {
    id,
    priority = 1,
    requested = true,
    nearMargin = "60% 0px",
    farMargin = "160% 0px",
    visible: visibleOverride,
    wanted: wantedOverride,
    evenWhenReduced = false,
  }: Options,
) {
  const motion = useMotionPreference();
  const [supported, setSupported] = useState(false);
  const [visible, setVisible] = useState(false);
  const [wanted, setWanted] = useState(false);
  const [settled, setSettled] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setSupported(supportsWebGL2());
      setFailed(failedStages.has(id));
    });
    return () => cancelAnimationFrame(frame);
  }, [id]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let releaseTimer = 0;
    const near = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        window.clearTimeout(releaseTimer);
        setWanted(true);
      },
      { rootMargin: nearMargin },
    );
    // Hysteresis: only let go after staying beyond the far margin for a second.
    const far = new IntersectionObserver(
      ([entry]) => {
        window.clearTimeout(releaseTimer);
        if (!entry.isIntersecting)
          releaseTimer = window.setTimeout(() => setWanted(false), 1000);
      },
      { rootMargin: farMargin },
    );
    const view = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    );
    near.observe(node);
    far.observe(node);
    view.observe(node);
    const syncPage = () =>
      setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", syncPage);
    return () => {
      window.clearTimeout(releaseTimer);
      near.disconnect();
      far.disconnect();
      view.disconnect();
      document.removeEventListener("visibilitychange", syncPage);
    };
  }, [ref, nearMargin, farMargin]);

  const eligible =
    (evenWhenReduced ? motion.hydrated : allowsStages(motion)) &&
    supported &&
    !failed &&
    requested;

  useEffect(() => {
    if (!eligible) {
      stageRegistry.remove(id);
      return;
    }
    stageRegistry.update(id, {
      priority,
      visible: visibleOverride ?? visible,
      wanted: wantedOverride ?? wanted,
    });
  }, [
    id,
    eligible,
    priority,
    visible,
    wanted,
    visibleOverride,
    wantedOverride,
  ]);
  useEffect(() => () => stageRegistry.remove(id), [id]);

  const live = useSyncExternalStore(
    stageRegistry.subscribe,
    () => stageRegistry.isLive(id),
    () => false,
  );

  // Mount after the current frame and on a pause in scrolling: creating a
  // context and its scene costs a few long frames, which an idle callback
  // would still drop between the frames of the scroll that brought the
  // section into view. The poster stands in meanwhile.
  useEffect(() => {
    let settle = 0;
    let cancelPause = () => {};
    const frame = requestAnimationFrame(() => {
      if (!live) {
        setSettled(false);
        setReady(false);
        return;
      }
      // Only a slot held for a moment mounts, so jump-scrolling past a
      // section never creates and destroys its scene.
      settle = window.setTimeout(() => {
        cancelPause = onScrollPause(() => setSettled(true));
      }, 300);
    });
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      cancelPause();
    };
  }, [live]);

  const mount = eligible && live && settled;
  const active = mount && (visibleOverride ?? visible) && pageVisible;
  const state: StageState = failed
    ? "failed"
    : !eligible
      ? "static"
      : !mount
        ? "idle"
        : ready
          ? "live"
          : "loading";

  useEffect(() => {
    if (ref.current) ref.current.dataset.stageState = state;
  }, [ref, state]);

  const onReady = useCallback(() => setReady(true), []);
  const onFailure = useCallback(() => {
    failedStages.add(id);
    setFailed(true);
    setReady(false);
  }, [id]);

  return {
    state,
    mount,
    active,
    visible,
    ready,
    paused: motion.paused,
    onReady,
    onFailure,
  };
}
