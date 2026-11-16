import { paceFor } from "@/lib/frame-pacer";

/**
 * Decides how the desk draws on this display from what its moving frames
 * cost: its resolution (device pixels per CSS pixel) and, on a display faster
 * than it can draw for, its pace (a frame on every second refresh rather
 * than on each; src/lib/frame-pacer.ts).
 *
 * Where the browser times GPU work (EXT_disjoint_timer_query_webgl2), the
 * desk's own GPU time per frame decides, against the time a frame has: the
 * display's refresh interval times the pace. Where it does not (Safari), the
 * time between moving frames stands in, without the long frames that
 * main-thread work causes: a busy page is not a slow GPU, and a lower
 * resolution would not help it.
 *
 * The scene renders on demand, so only frames that follow one another closely
 * (a scroll or an object animation) count; a pause between them is idle time.
 * The first second after a mount or a change is ignored while caches warm and
 * the drawing buffer is reallocated. A step is proposed, not applied: the
 * scene switches while the desk is still, so the image never changes
 * sharpness or rhythm mid-move.
 */
export type Step = {
  /** Device pixels per CSS pixel. */
  level: number;
  /** A frame on every `every`th refresh of the display. */
  every: number;
};

export type ResolutionGovernor = {
  /** The display's refresh interval the governor judges against. */
  readonly frameMs: number;
  /** Records a moving frame drawn at `now`. */
  record(now: number): void;
  /** Records the GPU time of one drawn frame, in ms, measured by `now`. */
  recordGpu(ms: number, now: number): void;
  /** A step to switch to, or null to keep the current one. */
  proposal(): Step | null;
  /**
   * True once frames at the last step still miss their budget: neither
   * resolution nor pace can make this computer keep up.
   */
  strained(): boolean;
  /** The scene now draws at `step`; judge it on its own frames. */
  applied(step: Step, now: number): void;
};

const quantile = (list: number[], q: number) => {
  const sorted = [...list].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
};

const sameStep = (a: Step, b: Step) =>
  a.level === b.level && a.every === b.every;

export function createResolutionGovernor({
  steps,
  step,
  frameMs,
  now,
  samples = 45,
  settleMs = 1000,
  gapMs = 120,
  maxChanges = 4,
}: {
  /** The steps the desk may draw at, the most demanding first. */
  steps: Step[];
  /** The step it draws at now. */
  step: Step;
  frameMs: number;
  now: number;
  samples?: number;
  settleMs?: number;
  gapMs?: number;
  /** Changes per visit, so a borderline GPU never keeps switching. */
  maxChanges?: number;
}): ResolutionGovernor {
  let current = Math.max(
    0,
    steps.findIndex((candidate) => sameStep(candidate, step)),
  );
  let settledAt = now + settleMs;
  let last = -Infinity;
  let changes = 0;
  const intervals: number[] = [];
  const gpu: number[] = [];
  const keep = (list: number[], value: number) => {
    list.push(value);
    if (list.length > samples) list.shift();
  };
  /** The time a frame has at a step. */
  const budget = (at: Step) => frameMs * at.every;
  /**
   * Whether the display's refreshes are missed often at full rate, for
   * whatever reason: a frame drawn on every refresh that lands on the next
   * one instead is shown twice, the judder pacing removes. Only judged for
   * a step down to a slower pace: a lower resolution would not help a busy
   * main thread.
   */
  const missing = () => {
    if (steps[current].every !== 1 || intervals.length < samples) return false;
    const missed = intervals.filter(
      (interval) => interval >= 1.5 * frameMs && interval < 2.5 * frameMs,
    ).length;
    return missed / intervals.length > 0.15;
  };
  /** Whether the frames at the current step miss its budget, if known. */
  const slow = () => {
    const time = budget(steps[current]);
    if (gpu.length >= samples) return quantile(gpu, 0.9) > 0.75 * time;
    if (intervals.length < samples) return null;
    // Frames that waited on the main thread say nothing about the GPU.
    const drawn = intervals.filter((interval) => interval < 2.5 * time);
    if (drawn.length < samples / 2) return null;
    return quantile(drawn, 0.5) > 1.25 * time;
  };
  return {
    frameMs,
    record(now) {
      const interval = now - last;
      last = now;
      // A paced frame's gap is its pace long; twice that is still moving.
      if (now < settledAt || interval > gapMs * steps[current].every) return;
      keep(intervals, interval);
    },
    recordGpu(ms, now) {
      if (now >= settledAt) keep(gpu, ms);
    },
    proposal() {
      if (changes >= maxChanges) return null;
      const here = steps[current];
      const lower = steps[current + 1];
      const higher = steps[current - 1];
      // The steps at a slower pace, densest first.
      const paced = steps.filter((step) => step.every > here.every);
      /**
       * The densest paced step the GPU's frames would fit with room to
       * spare, from what they cost here; the one at this density without
       * GPU timings.
       */
      const pacedFit = () => {
        if (gpu.length < samples)
          return paced.find((step) => step.level === here.level) ?? paced[0];
        const cost = quantile(gpu, 0.9);
        return (
          paced.find(
            (step) =>
              cost * (step.level / here.level) ** 2 < 0.6 * budget(step),
          ) ?? paced[paced.length - 1]
        );
      };
      if (slow()) {
        // At one device pixel per CSS pixel or less, a slower pace before a
        // blurrier picture.
        if (paced.length && (here.level <= 1 || lower?.every !== here.every))
          return pacedFit();
        if (lower !== undefined) return lower;
      }
      // Refreshes missed for reasons a resolution cannot change: the same
      // picture at an even, slower pace.
      if (paced.length && missing())
        return paced.find((step) => step.level === here.level) ?? paced[0];
      // The step above costs its share of pixels more; climb only with room
      // to spare there, so it never bounces straight back. Only GPU timings
      // can tell there is room. A slower pace is kept for the visit: what
      // missed the faster one would miss it again.
      if (
        higher !== undefined &&
        higher.every === here.every &&
        gpu.length >= samples &&
        quantile(gpu, 0.9) * (higher.level / here.level) ** 2 <
          0.45 * budget(higher)
      )
        return higher;
      return null;
    },
    strained() {
      return current === steps.length - 1 && slow() === true;
    },
    applied(step, now) {
      const index = steps.findIndex((candidate) => sameStep(candidate, step));
      if (index < 0 || index === current) return;
      current = index;
      changes++;
      settledAt = now + settleMs;
      intervals.length = 0;
      gpu.length = 0;
    },
  };
}

/**
 * The levels a desk capped at `cap` may use on this screen, highest first,
 * down to `lowest`.
 */
export function resolutionLevels(
  cap: number,
  devicePixelRatio: number,
  lowest = 1,
) {
  const top = Math.max(1, Math.min(cap, devicePixelRatio));
  return [
    top,
    ...[1.25, 1, 0.85, 0.75].filter((level) => level < top && level >= lowest),
  ];
}

/**
 * The steps a desk with these levels may draw at on a display refreshing
 * every `frameMs`, the most demanding first.
 *
 * Up to about 100 Hz the pace is always one and the steps are the levels. On
 * a faster display the desk draws at the display's rate while it can, giving
 * up density no lower than one device pixel per CSS pixel; past that it
 * draws on every second refresh (the pace `paceFor` picks) at whichever
 * level then fits, down to the lowest. Half the rate, evenly, is smoother
 * than a full rate the GPU keeps missing, and sharper than a rate kept by
 * blurring the picture. `pace` fixes the pace instead (a visitor's or QA's
 * choice).
 */
export function resolutionSteps(
  levels: number[],
  frameMs: number,
  pace: number | null = null,
): Step[] {
  if (pace !== null) return levels.map((level) => ({ level, every: pace }));
  const every = paceFor(frameMs);
  if (every === 1) return levels.map((level) => ({ level, every: 1 }));
  return [
    ...levels
      .filter((level) => level >= 1)
      .map((level) => ({ level, every: 1 })),
    ...levels.map((level) => ({ level, every })),
  ];
}

/**
 * Where a first visit starts: at the top, except integrated graphics on a
 * fast display, which start at its paced rate (they have not held 120
 * frames a second at any resolution; one with room to spare climbs).
 */
export function firstStep(steps: Step[], low: boolean) {
  return (
    (low && steps.find((step) => step.every > 1 && step.level <= 1)) || steps[0]
  );
}

/** The display's refresh interval, from the median of a few idle frames. */
export function measureFrameInterval(frames = 20): Promise<number> {
  return new Promise((resolve) => {
    const times: number[] = [];
    const tick = (now: number) => {
      times.push(now);
      if (times.length <= frames) requestAnimationFrame(tick);
      else
        resolve(
          quantile(
            times.slice(1).map((t, i) => t - times[i]),
            0.5,
          ),
        );
    };
    requestAnimationFrame(tick);
  });
}

const rememberKey = "portfolio:desk-resolution";
const rememberMs = 7 * 24 * 60 * 60 * 1000;

type Remembered = { level: number; every?: number; at: number };
function remembered(): Remembered | null {
  try {
    const saved = JSON.parse(
      localStorage.getItem(rememberKey) ?? "null",
    ) as Remembered | null;
    return saved && Date.now() - saved.at < rememberMs ? saved : null;
  } catch {
    // Storage can be blocked or hold something else; learn again.
    return null;
  }
}

/**
 * The level this computer settled on in the last week, so a return visit
 * starts there instead of learning again mid-journey. Known before the
 * display's refresh rate is, which the pace needs.
 */
export function rememberedLevel(levels: number[]) {
  const saved = remembered();
  return saved && levels.includes(saved.level) ? saved.level : null;
}

/** The step it settled on, if it is one of this display's. */
export function rememberedStep(steps: Step[]) {
  const saved = remembered();
  if (!saved) return null;
  const step = { level: saved.level, every: saved.every ?? 1 };
  return steps.find((candidate) => sameStep(candidate, step)) ?? null;
}

export function rememberStep(step: Step) {
  try {
    localStorage.setItem(
      rememberKey,
      JSON.stringify({ ...step, at: Date.now() }),
    );
  } catch {
    // Storage can be blocked; the next visit learns again.
  }
}
