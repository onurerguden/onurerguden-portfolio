/**
 * Holds the page at the opening while the desk gets ready (November 15,
 * final revisions): visitors who scrolled straight away scrolled past a
 * poster that could not answer yet, and the warm-up stuttered under them.
 * The wheel, touch drags and the page's scrolling keys wait, for at most
 * `cap` milliseconds; links, the scrollbar and the page's own scrolling
 * (a hash, the skip link) never do. Pure, so it is tested without a page.
 */

/** The longest the page is ever held, in milliseconds (Onur's choice). */
export const holdCap = 5000;

/** Keys that scroll the page down from the top. */
export const scrollKeys = new Set([
  " ",
  "Spacebar",
  "PageDown",
  "ArrowDown",
  "End",
]);

type Target = Pick<EventTarget, "addEventListener" | "removeEventListener">;
type Timers = {
  set: (callback: () => void, ms: number) => unknown;
  clear: (handle: unknown) => void;
};
const browserTimers: Timers = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/** Where scrolling stays the visitor's own: menus, dialogs, form fields. */
const free = "nav, dialog, [role='dialog'], [data-scroll-free]";
function inFreeArea(target: EventTarget | null) {
  const element =
    target && typeof (target as Element).closest === "function"
      ? (target as Element)
      : null;
  return Boolean(element?.closest(free));
}
/** A key pressed on a control belongs to it (Space presses a button). */
function onControl(target: EventTarget | null) {
  const element =
    target && typeof (target as Element).closest === "function"
      ? (target as Element)
      : null;
  return Boolean(
    element?.closest(
      "a, button, input, select, textarea, summary, [contenteditable], [tabindex]",
    ),
  );
}

/** Whether this event would scroll the page and should wait. */
export function holds(event: Event) {
  if (inFreeArea(event.target)) return false;
  if (event.type === "wheel") {
    const wheel = event as WheelEvent;
    // Ctrl or ⌘ with the wheel zooms; sideways scrolling moves nothing here.
    return !wheel.ctrlKey && !wheel.metaKey && wheel.deltaY > 0;
  }
  if (event.type === "touchmove") return true;
  if (event.type === "keydown") {
    const key = event as KeyboardEvent;
    if (key.altKey || key.ctrlKey || key.metaKey) return false;
    if (key.key === " " && key.shiftKey) return false;
    return scrollKeys.has(key.key) && !onControl(event.target);
  }
  return false;
}

/**
 * Starts holding. `onHeld` runs for each input that waited (the ring
 * nudges), `onRelease` once when the hold ends, by `release()` or the cap.
 */
export function createScrollHold(
  target: Target,
  {
    cap = holdCap,
    onHeld,
    onRelease,
  }: { cap?: number; onHeld?: () => void; onRelease?: () => void } = {},
  timers: Timers = browserTimers,
) {
  let held = true;
  const stop = (event: Event) => {
    if (!holds(event)) return;
    event.preventDefault();
    onHeld?.();
  };
  // Not passive: only a listener that can cancel holds the scroll. It lives
  // for a few seconds at most, before any scrolling the page can do.
  const options = { passive: false, capture: true } as const;
  const types = ["wheel", "touchmove", "keydown"] as const;
  for (const type of types) target.addEventListener(type, stop, options);
  const timer = timers.set(() => release(), cap);
  function release() {
    if (!held) return;
    held = false;
    timers.clear(timer);
    for (const type of types) target.removeEventListener(type, stop, options);
    onRelease?.();
  }
  return {
    release,
    get held() {
      return held;
    },
  };
}
