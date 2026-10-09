import { follow } from "@/lib/cursor";

/**
 * The desk story's clock: the distance the scene, the screens and the
 * curtain show, following the page's scroll distance.
 *
 * A mouse wheel moves the page in notches of about 100 px, and the story
 * bound to it lurched a notch at a time: the camera jumped, then stood
 * still. Where the visitor scrolls with a wheel or the keyboard, the clock
 * eases towards the page's distance instead (frame-rate independent, see
 * `follow`), so notches merge into one glide. Every other scroll (touch,
 * the scrollbar, links, focus, the page's own corrections) is followed as it
 * comes, and a jump of several views cuts instead of flying through the
 * desk. Frames stay a pure function of the distance the clock shows.
 */
export type StoryClock = {
  /** The distance the story shows now. */
  readonly value: number;
  /** The page's distance the clock is heading for. */
  readonly target: number;
  /** Whether the shown distance has reached the page's. */
  readonly settled: boolean;
  /**
   * Heads for `target`, closing half the gap every `halfLife` ms; 0 goes
   * there at once.
   */
  to(target: number, halfLife: number): void;
  stop(): void;
};

type Frames = {
  request(callback: (now: number) => void): number;
  cancel(handle: number): void;
  now(): number;
};

const browserFrames: Frames = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (handle) => cancelAnimationFrame(handle),
  now: () => performance.now(),
};

export function createStoryClock({
  apply,
  start = 0,
  cut = 3,
  rest = 0.0005,
  frames = browserFrames,
}: {
  /** Shows a distance; `settled` once it is the page's. */
  apply: (distance: number, settled: boolean) => void;
  start?: number;
  /** Jumps longer than this (in stage heights) cut instead of easing. */
  cut?: number;
  /** Closer than this (in stage heights), the clock is at its target. */
  rest?: number;
  frames?: Frames;
}): StoryClock {
  let value = start;
  let target = start;
  let halfLife = 0;
  let handle = 0;
  let last = 0;
  const settle = () => {
    value = target;
    if (handle) frames.cancel(handle);
    handle = 0;
    apply(value, true);
  };
  const step = (now: number) => {
    // A frame is never judged longer than two at 60 Hz, so a tab that was
    // hidden mid-glide resumes smoothly instead of snapping.
    const dt = Math.min(now - last, 33);
    last = now;
    value = follow(value, target, dt, halfLife);
    if (Math.abs(target - value) < rest) {
      settle();
      return;
    }
    apply(value, false);
  };
  const tick = (now: number) => {
    // Asked for first, so the next frame runs this before the scene's own
    // loop, which then draws the distance set here in the same frame.
    handle = frames.request(tick);
    step(now);
  };
  return {
    get value() {
      return value;
    },
    get target() {
      return target;
    },
    get settled() {
      return handle === 0;
    },
    to(next, life) {
      target = next;
      halfLife = life;
      if (life <= 0 || Math.abs(target - value) > cut) {
        settle();
        return;
      }
      if (handle) return;
      // The first step happens now, inside the scroll event, so the frame
      // that follows already shows movement.
      last = frames.now() - 1000 / 60;
      handle = frames.request(tick);
      step(frames.now());
    },
    stop() {
      if (handle) frames.cancel(handle);
      handle = 0;
    },
  };
}

export type ScrollInput = "wheel" | "notch" | "keys" | "other";

/** How long after an input its scrolling still counts as that input's. */
const lingers: Record<Exclude<ScrollInput, "other">, number> = {
  // Chromium animates each wheel event for about 150 ms.
  wheel: 160,
  notch: 260,
  // Space, Page Down and the arrows scroll smoothly for up to half a second.
  keys: 600,
};
const scrollKeys = new Set([
  " ",
  "PageDown",
  "PageUp",
  "ArrowDown",
  "ArrowUp",
  "Home",
  "End",
]);

/**
 * Remembers what is scrolling the page: a trackpad's stream of small wheel
 * events, a mouse wheel's notches (a line or page mode, or 50 px or more
 * after a pause), the keyboard, or anything else.
 */
export function createScrollInput(now: () => number = () => performance.now()) {
  let kind: ScrollInput = "other";
  let at = -Infinity;
  let lastWheel = -Infinity;
  return {
    wheel(event: Pick<WheelEvent, "deltaMode" | "deltaY">) {
      const time = now();
      const notch =
        event.deltaMode !== 0 ||
        (Math.abs(event.deltaY) >= 50 && time - lastWheel >= 30);
      lastWheel = time;
      // A trackpad's events come every frame, so a big one mid-stream is
      // still a trackpad's.
      kind = notch ? "notch" : "wheel";
      at = time;
    },
    key(event: Pick<KeyboardEvent, "key" | "defaultPrevented">) {
      if (event.defaultPrevented || !scrollKeys.has(event.key)) return;
      kind = "keys";
      at = now();
    },
    /** Touch, the scrollbar or a click: scrolling the page follows them 1:1. */
    other() {
      kind = "other";
      at = now();
    },
    current(): ScrollInput {
      return kind !== "other" && now() - at <= lingers[kind] ? kind : "other";
    },
  };
}

/** The clock's half-life for each input, in ms. */
export const halfLives: Record<ScrollInput, number> = {
  notch: 80,
  keys: 80,
  wheel: 35,
  other: 0,
};

/** `?story=raw` (or `portfolio:story` set to "raw") follows the page 1:1. */
export function rawStory(stored: string | null, search: string) {
  return stored === "raw" || new URLSearchParams(search).get("story") === "raw";
}
