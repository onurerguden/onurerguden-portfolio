/**
 * Frame pacing: on a display faster than the scenes can draw for, they draw
 * on every second (or third, or fourth) refresh instead of whenever a frame
 * happens to finish.
 *
 * A GPU that needs 11 ms for a frame cannot fill a 120 Hz display's 8.3 ms
 * slots. Left alone it shows some frames for one refresh and some for two,
 * about 80 a second on average and visibly uneven; held to every second
 * refresh it shows 60 a second, each for exactly as long as the last. Even
 * frames at a lower rate read as smooth, uneven ones at a higher rate as
 * stutter (the flow series, November 16).
 *
 * The desk's story clock and every canvas ask the same pacer whether the
 * frame under way is one to draw, so what they show moves together: the
 * camera, the screens' HTML over it, the balls and About. At a pace of one
 * every frame is drawn and nothing here does anything.
 */
export type Pacer = {
  /** Frames are drawn on every `every`th refresh of the display. */
  readonly every: number;
  /** The time a paced frame has, in ms. */
  readonly budget: number;
  set(every: number, refreshMs?: number): void;
  /**
   * Whether the frame stamped `stamp` (its animation-frame time) is one to
   * draw. Every caller in one frame gets the same answer.
   */
  beat(stamp: number): boolean;
  /** The next frame is drawn wherever it falls (a warm-up, a paused still). */
  force(): void;
  /** Whether any refreshes are sat out. */
  readonly paced: boolean;
  /**
   * Whether the frame stamped `stamp` is sat out; if so, says so `ahead`,
   * since the next one will be drawn. For the story clock.
   */
  skip(stamp: number): boolean;
  /**
   * Says, on a refresh sat out, that the next one will be drawn: a scene
   * asked now starts its loop in time for it rather than a refresh late.
   */
  ahead(): void;
  /** Calls `listener` on each `ahead`; returns the unsubscribe. */
  onAhead(listener: () => void): () => void;
};

export function createPacer(): Pacer {
  let every = 1;
  let refreshMs = 1000 / 60;
  let lastBeat = -Infinity;
  let lastStamp = NaN;
  let answer = true;
  let forced = false;
  const listeners = new Set<() => void>();
  const pacer: Pacer = {
    get every() {
      return every;
    },
    get paced() {
      return every > 1;
    },
    skip(stamp) {
      if (every === 1 || pacer.beat(stamp)) return false;
      pacer.ahead();
      return true;
    },
    get budget() {
      return every * refreshMs;
    },
    set(next, refresh) {
      every = Math.max(1, Math.round(next));
      if (refresh && refresh > 0) refreshMs = refresh;
    },
    beat(stamp) {
      if (stamp === lastStamp) return answer;
      lastStamp = stamp;
      // By time, not by counting: after a pause or a dropped frame the next
      // one is drawn at once, and the beat carries on from there.
      answer =
        forced || every === 1 || stamp - lastBeat >= (every - 0.5) * refreshMs;
      forced = false;
      if (answer) lastBeat = stamp;
      return answer;
    },
    force() {
      forced = true;
      lastStamp = NaN;
    },
    ahead() {
      for (const listener of listeners) listener();
    },
    onAhead(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  return pacer;
}

/** The page's one pacer. */
export const pacer = createPacer();

/**
 * How many refreshes a paced frame lasts on a display refreshing every
 * `refreshMs`: the pace nearest 60 frames a second, and never under 55.
 * One (no pacing) up to about 100 Hz: 120 Hz gives 2 (60 a second), 144 Hz 2
 * (72), 165 Hz 3 (55), 240 Hz 4 (60).
 */
export function paceFor(refreshMs: number) {
  const hz = 1000 / refreshMs;
  const every = Math.round(hz / 60);
  return every > 1 && hz / every >= 54.5 ? every : 1;
}

/** `?pace=off` (or `portfolio:pace` set to "off") never paces; a number forces that pace. */
export const paceKey = "portfolio:pace";
export function paceChoice(stored: string | null, search: string) {
  const asked = new URLSearchParams(search).get("pace") ?? stored;
  if (asked === "off") return 1;
  const every = Number(asked);
  return Number.isInteger(every) && every >= 1 && every <= 4 ? every : null;
}

let choice: number | null | undefined;
/** The pace the visitor (or QA) asked for, read once; null to let frames decide. */
export function chosenPace() {
  if (choice !== undefined) return choice;
  if (typeof window === "undefined") return null;
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(paceKey);
  } catch {
    // Storage can be blocked; the address can still ask.
  }
  return (choice = paceChoice(stored, location.search));
}
