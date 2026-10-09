/**
 * Tells when the visitor stops scrolling, so that work which costs a frame
 * (mounting a section's scene, preparing it) lands in a pause rather than
 * between the frames of a scroll.
 */

/** Quiet time that counts as a pause, in milliseconds. */
export const pauseAfter = 200;
/** Continuous scrolling never defers the work for longer than this. */
export const pauseCap = 3000;

const inputs = ["wheel", "touchstart", "touchmove", "scroll"] as const;

type Options = {
  /** Milliseconds without input that count as a pause. */
  quiet?: number;
  /** Milliseconds after which the callback runs anyway. */
  cap?: number;
};

export function createScrollPause(
  target: Pick<EventTarget, "addEventListener">,
  now: () => number = () => performance.now(),
) {
  let last = -Infinity;
  let listening = false;
  const listen = () => {
    if (listening) return;
    listening = true;
    // Input from before the first listener is unknown, so the first wait
    // watches a whole quiet period before it trusts the page to be still.
    last = now();
    const mark = () => {
      last = now();
    };
    // Captured, so scrolling inside any element counts too; passive, so the
    // listeners never hold the scroll up.
    for (const type of inputs)
      target.addEventListener(type, mark, { passive: true, capture: true });
  };
  return {
    /**
     * Calls `callback` once there has been no wheel, touch or scroll input
     * for `quiet` milliseconds, or after `cap` milliseconds whatever the
     * visitor does. Returns a function that cancels it.
     */
    when(
      callback: () => void,
      { quiet = pauseAfter, cap = pauseCap }: Options = {},
    ) {
      listen();
      const deadline = now() + cap;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const check = () => {
        const time = now();
        const still = last + quiet - time;
        if (still <= 0 || time >= deadline) {
          timer = undefined;
          callback();
          return;
        }
        timer = setTimeout(check, Math.min(still, deadline - time));
      };
      // A timer even when the page is already still: the callback never
      // runs inside the caller's own task.
      timer = setTimeout(check, 0);
      return () => {
        if (timer !== undefined) clearTimeout(timer);
        timer = undefined;
      };
    },
  };
}

let shared: ReturnType<typeof createScrollPause> | null = null;

/** Runs `callback` once the page's scrolling pauses; see createScrollPause. */
export function onScrollPause(callback: () => void, options?: Options) {
  shared ??= createScrollPause(window);
  return shared.when(callback, options);
}
