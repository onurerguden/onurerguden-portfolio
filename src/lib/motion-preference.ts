import { useSyncExternalStore } from "react";

/**
 * Page-wide motion preference: the OS reduced-motion setting plus the visitor's
 * own "pause motion" toggle (WCAG 2.2.2). Reduced motion removes WebGL; pausing
 * only freezes it on its current frame.
 */
export type MotionState = {
  reduced: boolean;
  paused: boolean;
  /** False during server rendering and hydration, so 3D never renders there. */
  hydrated: boolean;
};

export type MotionEvent =
  | { type: "hydrate"; reduced: boolean; paused: boolean }
  | { type: "reduced"; value: boolean }
  | { type: "paused"; value: boolean };

export const serverMotionState: MotionState = Object.freeze({
  reduced: false,
  paused: false,
  hydrated: false,
});

export const motionStorageKey = "portfolio:motion-paused";

export function nextMotionState(
  state: MotionState,
  event: MotionEvent,
): MotionState {
  switch (event.type) {
    case "hydrate":
      return { reduced: event.reduced, paused: event.paused, hydrated: true };
    case "reduced":
      return state.reduced === event.value
        ? state
        : { ...state, reduced: event.value };
    case "paused":
      return state.paused === event.value
        ? state
        : { ...state, paused: event.value };
  }
}

/** WebGL stages may exist (possibly frozen). */
export const allowsStages = (state: MotionState) =>
  state.hydrated && !state.reduced;
/** Decorative animation may advance. */
export const allowsAnimation = (state: MotionState) =>
  allowsStages(state) && !state.paused;

let state = serverMotionState;
let started = false;
const listeners = new Set<() => void>();

function emit(event: MotionEvent) {
  const next = nextMotionState(state, event);
  if (next === state) return;
  state = next;
  document.documentElement.dataset.motionPaused = String(state.paused);
  for (const listener of listeners) listener();
}

function readPaused() {
  try {
    return localStorage.getItem(motionStorageKey) === "true";
  } catch {
    return false;
  }
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  emit({ type: "hydrate", reduced: media.matches, paused: readPaused() });
  media.addEventListener("change", (event) =>
    emit({ type: "reduced", value: event.matches }),
  );
  window.addEventListener("storage", (event) => {
    if (event.key === motionStorageKey)
      emit({ type: "paused", value: event.newValue === "true" });
  });
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setMotionPaused(value: boolean) {
  try {
    localStorage.setItem(motionStorageKey, String(value));
  } catch {
    // Private windows may refuse storage; the toggle still applies to this visit.
  }
  emit({ type: "paused", value });
}

export function useMotionPreference() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => serverMotionState,
  );
}
