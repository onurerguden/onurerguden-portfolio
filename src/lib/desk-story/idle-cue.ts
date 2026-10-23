/**
 * The desk story's scroll hint comes back when the visitor stops: after a
 * quiet spell with no scrolling, the opening's hint (beside the portrait)
 * or a bottom cue plays its few strokes again, once per spell (October 24,
 * desk delight). Pure, so the timing is tested without a page.
 */
import type { StoryState } from "./timeline";

/** Quiet time before the hint plays again, in milliseconds. */
export const idleCueAfter = 6000;

/** Where the hint plays at this point of the story, if anywhere. */
export type CuePlace = "opening" | "bottom";

/** The opening's hint while the opening is in view; elsewhere at the foot. */
export function cueFor(state: StoryState, length: number): CuePlace | null {
  // Past the desk (the curtain, or the page below it): nothing to scroll to
  // that the page itself does not show.
  if (state.exit > 0 || state.segment === "exit") return null;
  if (state.distance >= length - 1e-3) return null;
  return state.distance < 0.15 ? "opening" : "bottom";
}

/** Input that means the visitor is moving through the story. */
const moves = ["wheel", "scroll", "touchmove", "keydown"] as const;
/** Input that only shows the visitor is there (a click on the desk). */
const presence = ["pointerdown", "touchstart"] as const;

type Timers = {
  set: (callback: () => void, ms: number) => unknown;
  clear: (handle: unknown) => void;
};
const browserTimers: Timers = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/**
 * Calls `onIdle` after `quiet` milliseconds without input, at most once per
 * spell: after it has played, only moving through the story (not a click)
 * arms it again. Any input calls `onActive`, so a playing cue can leave.
 */
export function createIdleCue(
  target: Pick<EventTarget, "addEventListener" | "removeEventListener">,
  {
    quiet = idleCueAfter,
    onIdle,
    onActive,
  }: {
    quiet?: number;
    /** Returns false when the cue cannot play yet: the wait starts again. */
    onIdle: () => boolean | void;
    onActive: () => void;
  },
  timers: Timers = browserTimers,
) {
  let armed = true;
  let timer: unknown;
  const restart = () => {
    if (timer !== undefined) timers.clear(timer);
    timer = armed ? timers.set(fire, quiet) : undefined;
  };
  const fire = () => {
    timer = undefined;
    armed = onIdle() === false;
    if (armed) restart();
  };
  const moved = () => {
    armed = true;
    onActive();
    restart();
  };
  const present = () => {
    onActive();
    restart();
  };
  const options = { passive: true, capture: true } as const;
  for (const type of moves) target.addEventListener(type, moved, options);
  for (const type of presence) target.addEventListener(type, present, options);
  restart();
  return () => {
    if (timer !== undefined) timers.clear(timer);
    timer = undefined;
    for (const type of moves) target.removeEventListener(type, moved, options);
    for (const type of presence)
      target.removeEventListener(type, present, options);
  };
}
