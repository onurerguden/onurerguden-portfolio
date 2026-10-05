import { useSyncExternalStore } from "react";

/**
 * Whether the visitor turned the desk's 3D off ("static view") for this visit.
 * The nav menu and the journey share it; sessionStorage keeps it across
 * reloads in the same tab but never into a later visit.
 */
export const deskModeKey = "portfolio:desk-static";

let staticView = false;
let started = false;
const listeners = new Set<() => void>();

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  try {
    staticView = sessionStorage.getItem(deskModeKey) === "true";
  } catch {
    // Storage may be refused; the choice then lasts until the next load.
  }
}

export const deskMode = {
  get() {
    start();
    return staticView;
  },
  set(value: boolean) {
    start();
    if (value === staticView) return;
    staticView = value;
    try {
      sessionStorage.setItem(deskModeKey, String(value));
    } catch {
      // See start().
    }
    for (const listener of listeners) listener();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** True when the visitor chose the static view; false while rendering on the server. */
export function useStaticDesk() {
  return useSyncExternalStore(deskMode.subscribe, deskMode.get, () => false);
}
