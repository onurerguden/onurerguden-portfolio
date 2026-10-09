/**
 * Decides the desk's resolution (device pixels per CSS pixel) from what its
 * moving frames cost on this display.
 *
 * Where the browser times GPU work (EXT_disjoint_timer_query_webgl2), the
 * desk's own GPU time per frame decides, against the display's refresh
 * interval: a 120 Hz screen leaves half the time of a 60 Hz one. Where it
 * does not (Safari), the time between moving frames stands in, without the
 * long frames that main-thread work causes: a busy page is not a slow GPU,
 * and a lower resolution would not help it.
 *
 * The scene renders on demand, so only frames that follow one another closely
 * (a scroll or an object animation) count; a pause between them is idle time.
 * The first second after a mount or a change is ignored while caches warm and
 * the drawing buffer is reallocated. A level is proposed, not applied: the
 * scene switches while the desk is still, so the image never changes
 * sharpness mid-move.
 */
export type ResolutionGovernor = {
  /** The display's refresh interval the governor judges against. */
  readonly frameMs: number;
  /** Records a moving frame drawn at `now`. */
  record(now: number): void;
  /** Records the GPU time of one drawn frame, in ms, measured by `now`. */
  recordGpu(ms: number, now: number): void;
  /** A level to switch to, or null to keep the current one. */
  proposal(): number | null;
  /** The scene now draws at `level`; judge it on its own frames. */
  applied(level: number, now: number): void;
};

const quantile = (list: number[], q: number) => {
  const sorted = [...list].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
};

export function createResolutionGovernor({
  levels,
  level,
  frameMs,
  now,
  samples = 45,
  settleMs = 1000,
  gapMs = 120,
  maxChanges = 3,
}: {
  /** The levels the desk may draw at, highest first. */
  levels: number[];
  /** The level it draws at now. */
  level: number;
  frameMs: number;
  now: number;
  samples?: number;
  settleMs?: number;
  gapMs?: number;
  /** Changes per visit, so a borderline GPU never keeps switching. */
  maxChanges?: number;
}): ResolutionGovernor {
  let current = Math.max(0, levels.indexOf(level));
  let settledAt = now + settleMs;
  let last = -Infinity;
  let changes = 0;
  const intervals: number[] = [];
  const gpu: number[] = [];
  const keep = (list: number[], value: number) => {
    list.push(value);
    if (list.length > samples) list.shift();
  };
  return {
    frameMs,
    record(now) {
      const interval = now - last;
      last = now;
      if (now < settledAt || interval > gapMs) return;
      keep(intervals, interval);
    },
    recordGpu(ms, now) {
      if (now >= settledAt) keep(gpu, ms);
    },
    proposal() {
      if (changes >= maxChanges) return null;
      const lower = levels[current + 1];
      const higher = levels[current - 1];
      if (gpu.length >= samples) {
        const cost = quantile(gpu, 0.9);
        if (lower !== undefined && cost > 0.75 * frameMs) return lower;
        // A higher level costs about its share of pixels more; climb only
        // with room to spare, so it never bounces straight back.
        if (
          higher !== undefined &&
          cost * (higher / levels[current]) ** 2 < 0.45 * frameMs
        )
          return higher;
        return null;
      }
      if (intervals.length < samples || lower === undefined) return null;
      // Frames that waited on the main thread say nothing about the GPU.
      const drawn = intervals.filter((interval) => interval < 2.5 * frameMs);
      if (drawn.length < samples / 2) return null;
      return quantile(drawn, 0.5) > 1.25 * frameMs ? lower : null;
    },
    applied(level, now) {
      const index = levels.indexOf(level);
      if (index < 0 || index === current) return;
      current = index;
      changes++;
      settledAt = now + settleMs;
      intervals.length = 0;
      gpu.length = 0;
    },
  };
}

/** The levels a desk capped at `cap` may use on this screen, highest first. */
export function resolutionLevels(cap: number, devicePixelRatio: number) {
  const top = Math.max(1, Math.min(cap, devicePixelRatio));
  return [top, ...[1.25, 1].filter((level) => level < top)];
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

/**
 * The level this computer settled on in the last week, so a return visit
 * starts there instead of learning again mid-journey.
 */
export function rememberedLevel(levels: number[]) {
  try {
    const saved = JSON.parse(localStorage.getItem(rememberKey) ?? "null") as {
      level: number;
      at: number;
    } | null;
    return saved &&
      levels.includes(saved.level) &&
      Date.now() - saved.at < rememberMs
      ? saved.level
      : null;
  } catch {
    // Storage can be blocked or hold something else; learn again.
    return null;
  }
}

export function rememberLevel(level: number) {
  try {
    localStorage.setItem(
      rememberKey,
      JSON.stringify({ level, at: Date.now() }),
    );
  } catch {
    // Storage can be blocked; the next visit learns again.
  }
}
