"use client";
import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import { allowsStages, useMotionPreference } from "@/lib/motion-preference";
import { stageRegistry } from "@/lib/stage-registry";

export type StageState = "static" | "idle" | "loading" | "live" | "failed";

let webgl2: boolean | null = null;
/** Probes once with a detached canvas so page locators never see it. */
export function supportsWebGL2() {
  if (webgl2 !== null) return webgl2;
  try {
    const context = document.createElement("canvas").getContext("webgl2");
    webgl2 = Boolean(context);
    context?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webgl2 = false;
  }
  return webgl2;
}

const hasIdleCallback = () => typeof window.requestIdleCallback === "function";

/** A stage that failed stays static for the rest of the visit. */
const failedStages = new Set<string>();

type Options = {
  id: string;
  priority?: number;
  /** False until an opt-in scene (e.g. the activity skyline) is requested. */
  requested?: boolean;
  nearMargin?: string;
  farMargin?: string;
};

/**
 * Gates a section's WebGL scene: it mounts at idle once the section is near,
 * only while the page-wide registry grants it a context, and never under
 * reduced motion or without WebGL2. It unmounts again when far offscreen.
 */
export function useSectionStage(
  ref: RefObject<HTMLElement | null>,
  {
    id,
    priority = 1,
    requested = true,
    nearMargin = "60% 0px",
    farMargin = "160% 0px",
  }: Options,
) {
  const motion = useMotionPreference();
  const [supported, setSupported] = useState(false);
  const [visible, setVisible] = useState(false);
  const [wanted, setWanted] = useState(false);
  const [idleDone, setIdleDone] = useState(false);
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

  const eligible = allowsStages(motion) && supported && !failed && requested;

  useEffect(() => {
    if (!eligible) {
      stageRegistry.remove(id);
      return;
    }
    stageRegistry.update(id, { priority, visible, wanted });
  }, [id, eligible, priority, visible, wanted]);
  useEffect(() => () => stageRegistry.remove(id), [id]);

  const live = useSyncExternalStore(
    stageRegistry.subscribe,
    () => stageRegistry.isLive(id),
    () => false,
  );

  // Mount after the current frame and at idle so the chunk never competes
  // with the scroll that brought the section into view.
  useEffect(() => {
    let idle = 0;
    const frame = requestAnimationFrame(() => {
      if (!live) {
        setIdleDone(false);
        setReady(false);
        return;
      }
      const done = () => setIdleDone(true);
      // Safari has no requestIdleCallback; a short timeout plays the same role.
      idle = hasIdleCallback()
        ? window.requestIdleCallback(done, { timeout: 1800 })
        : window.setTimeout(done, 250);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (hasIdleCallback()) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, [live]);

  const mount = eligible && live && idleDone;
  const active = mount && visible && pageVisible;
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
