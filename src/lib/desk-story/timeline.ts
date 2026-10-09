import { screenStops, type CameraStop } from "./camera";

/**
 * The desk story as a pure function of scroll distance. Distances are in
 * stage heights (one scroll of the sticky stage), never elapsed time, so the
 * same distance always gives the same frame whichever way the visitor came.
 */
export type SegmentKind =
  | "hold"
  | "travel"
  | "read"
  /** The MacBook's Explorer window rising over the XP desktop. */
  | "rise"
  /** A screen growing to fill the view, or shrinking back onto the desk. */
  | "diveIn"
  | "diveOut"
  /** The desk drawn aside like paper, revealing the page beneath it. */
  | "exit";
export type Segment = {
  kind: SegmentKind;
  from: CameraStop;
  to: CameraStop;
  /** The screen whose content this segment shows, for holds and reads. */
  screen: number;
  start: number;
  end: number;
};
export type Timeline = { length: number; segments: readonly Segment[] };
export type StoryLayout = {
  /** Reading length of the portrait monitor, in stage heights. */
  portrait: number;
  /** Reading length of the MacBook's technology list, in stage heights. */
  macbook: number;
  /** Screens too small to read on the desk take over the view instead. */
  dive?: { portrait: boolean; macbook: boolean };
  /** The paper curtain: wide screens with motion end on an exit segment. */
  exit?: boolean;
};

export const holds = {
  opening: 0.15,
  // The desktop is a waypoint with nothing to read: the camera slows there
  // instead of stopping (see travelEasing).
  desktop: 0,
  read: 0.12,
  desktopXp: 0.5,
  room: 0.35,
};
export const lengths = { rise: 0.3, dive: 0.35, exit: 1 };
/**
 * The paper curtain, in stage heights: About's wrapper starts `lead` before
 * the journey's end (where the final hold begins) and its section has
 * arrived `landing` after that. Server-rendered CSS reads the same numbers.
 */
export const curtain = {
  lead: holds.room + lengths.exit + 1,
  landing: holds.room + lengths.exit,
};
/** Before anything is measured: about one screen of content each. */
export const defaultLayout: StoryLayout = {
  portrait: 1.6,
  macbook: 1,
  exit: true,
};
/** A read never collapses entirely, so its anchors stay distinct. */
const minimumRead = 0.05;

export const clamp = (n: number, low = 0, high = 1) =>
  Math.max(low, Math.min(high, n));
export const ease = (n: number) => {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
};

/** A CSS-style cubic-bezier timing function from (0, 0) to (1, 1). */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const at = (a: number, b: number, t: number) =>
    3 * a * (1 - t) * (1 - t) * t + 3 * b * (1 - t) * t * t + t * t * t;
  const slope = (a: number, b: number, t: number) =>
    3 * a * (1 - t) * (1 - t) + 6 * (b - a) * (1 - t) * t + 3 * (1 - b) * t * t;
  return (n: number) => {
    const x = clamp(n);
    if (x === 0 || x === 1) return x;
    // Newton's method, then bisection where the curve is too flat for it.
    let t = x;
    for (let i = 0; i < 6; i++) {
      const d = slope(x1, x2, t);
      if (Math.abs(d) < 1e-6) break;
      t -= (at(x1, x2, t) - x) / d;
    }
    if (Math.abs(at(x1, x2, t) - x) > 1e-5) {
      let low = 0;
      let high = 1;
      t = x;
      for (let i = 0; i < 30; i++) {
        if (at(x1, x2, t) < x) low = t;
        else high = t;
        t = (low + high) / 2;
      }
    }
    return at(y1, y2, t);
  };
}

/**
 * Each travel's pace, fitted so the picture moves evenly as the visitor
 * scrolls (October 9, butter series). Smoothstep paced the camera's path
 * instead: pull-backs lunged, then crawled, and every travel stopped dead at
 * both ends. The first two meet at the desktop moving, so the opening's
 * move reads as one; the others keep smoothstep's soft stops.
 */
export const travelEasing: Partial<Record<string, (t: number) => number>> = {
  "opening>desktop": cubicBezier(0.85, 0.1, 0.8, 0.95),
  "desktop>portrait": cubicBezier(0.25, 0.1, 0.35, 0.9),
  "macbook>room": cubicBezier(0.8, 0, 0.85, 0.85),
};

type Step = [SegmentKind, CameraStop, CameraStop, number, number];

export function buildTimeline(layout: StoryLayout = defaultLayout): Timeline {
  const portrait = screenStops.indexOf("portrait");
  const macbook = screenStops.indexOf("macbook");
  const read = (length: number) => Math.max(minimumRead, length);
  // A screen that dives grows into the view after the camera arrives and
  // shrinks back before it leaves.
  const dive = (screen: number, dives: boolean | undefined, steps: Step[]) => {
    const stop = screenStops[screen];
    return dives
      ? ([
          ["diveIn", stop, stop, lengths.dive, screen],
          ...steps,
          ["diveOut", stop, stop, lengths.dive, screen],
        ] satisfies Step[])
      : steps;
  };
  const plan: Step[] = [
    ["hold", "opening", "opening", holds.opening, -1],
    ["travel", "opening", "desktop", 1, -1],
    ["hold", "desktop", "desktop", holds.desktop, -1],
    ["travel", "desktop", "portrait", 0.75, -1],
    ...dive(portrait, layout.dive?.portrait, [
      ["hold", "portrait", "portrait", holds.read, portrait],
      ["read", "portrait", "portrait", read(layout.portrait), portrait],
      ["hold", "portrait", "portrait", holds.read, portrait],
    ]),
    ["travel", "portrait", "macbook", 1, -1],
    ...dive(macbook, layout.dive?.macbook, [
      ["hold", "macbook", "macbook", holds.desktopXp, macbook],
      ["rise", "macbook", "macbook", lengths.rise, macbook],
      ["read", "macbook", "macbook", read(layout.macbook), macbook],
    ]),
    ["travel", "macbook", "room", 1.5, -1],
    ["hold", "room", "room", holds.room, -1],
    ...(layout.exit
      ? ([["exit", "room", "room", lengths.exit, -1]] satisfies Step[])
      : []),
  ];
  let start = 0;
  const segments = plan
    .filter(([, , , length]) => length > 0)
    .map(([kind, from, to, length, screen]) => {
      const segment = { kind, from, to, screen, start, end: start + length };
      start = segment.end;
      return segment;
    });
  return { length: start, segments };
}

export type StoryState = {
  distance: number;
  from: CameraStop;
  to: CameraStop;
  /** Eased camera progress from `from` to `to`. */
  travel: number;
  /** Per screen: how far its reading segment has advanced (0–1). */
  reading: readonly number[];
  /** Per screen: how far the camera has arrived at its stop (0–1). */
  arrival: readonly number[];
  /** Per screen: how far the camera has left its stop again (0–1). */
  departure: readonly number[];
  /** Per screen: how far its window has risen (the MacBook's Explorer). */
  rise: readonly number[];
  /** Per screen: how far it fills the view instead of the desk (0–1). */
  dive: readonly number[];
  /** The screen the camera rests on, or -1 while travelling or elsewhere. */
  active: number;
  /** The kind of segment at this distance. */
  segment: SegmentKind;
  /** How far the paper curtain has drawn the desk aside (0–1, eased). */
  exit: number;
};

// The state storyAt computed last, and what for.
let lastTimeline: Timeline | null = null;
let lastDistance = NaN;
let lastState: StoryState | null = null;

/**
 * The story at `distance`. The journey, the desk's scroll listener and the
 * desk's frame all ask for the same distance within one scroll frame, so the
 * last state is handed out again rather than rebuilt: it is shared and must
 * never be changed by its readers.
 */
export function storyAt(timeline: Timeline, distance: number): StoryState {
  if (lastState && timeline === lastTimeline && distance === lastDistance)
    return lastState;
  lastTimeline = timeline;
  lastDistance = distance;
  lastState = computeStory(timeline, distance);
  return lastState;
}

function computeStory(timeline: Timeline, distance: number): StoryState {
  const d = clamp(distance, 0, timeline.length);
  const { segments } = timeline;
  let index = segments.findIndex((segment) => d < segment.end);
  if (index < 0) index = segments.length - 1;
  const current = segments[index];
  const local = clamp((d - current.start) / (current.end - current.start || 1));
  const zero = () => screenStops.map(() => 0);
  const reading = zero();
  const departure = zero();
  const rise = zero();
  const dive = zero();
  const arrival: number[] = screenStops.map((stop) =>
    stop === "opening" ? 1 : 0,
  );
  segments.forEach((segment, i) => {
    const progress = i < index ? 1 : i === index ? local : 0;
    const { screen } = segment;
    if (segment.kind === "read") reading[screen] = progress;
    if (segment.kind === "rise") rise[screen] = progress;
    if (segment.kind === "diveIn") dive[screen] += progress;
    if (segment.kind === "diveOut") dive[screen] -= progress;
    if (segment.kind === "travel") {
      const to = screenStops.indexOf(segment.to);
      const from = screenStops.indexOf(segment.from);
      if (to >= 0) arrival[to] = Math.max(arrival[to], progress);
      if (from >= 0) departure[from] = Math.max(departure[from], progress);
    }
  });
  const travel =
    current.kind === "travel"
      ? (travelEasing[`${current.from}>${current.to}`] ?? ease)(local)
      : 0;
  const exit = current.kind === "exit" ? ease(local) : 0;
  for (let i = 0; i < screenStops.length; i++) {
    rise[i] = ease(rise[i]);
    dive[i] = ease(dive[i]);
  }
  return {
    distance: d,
    from: current.from,
    to: current.to,
    travel,
    reading,
    arrival,
    departure,
    rise,
    dive,
    active: current.kind === "travel" ? -1 : current.screen,
    segment: current.kind,
    exit,
  };
}

const segmentOf = (timeline: Timeline, kind: SegmentKind, screen: number) => {
  const segment = timeline.segments.find(
    (s) => s.kind === kind && s.screen === screen,
  );
  if (!segment) throw new Error(`No ${kind} segment for screen ${screen}`);
  return segment;
};

/** Start and end of a screen's Explorer rise. */
export function riseRange(timeline: Timeline, screen: number) {
  const { start, end } = segmentOf(timeline, "rise", screen);
  return [start, end] as const;
}

/** Start and end of a screen's reading segment. */
export function readRange(timeline: Timeline, screen: number) {
  const { start, end } = segmentOf(timeline, "read", screen);
  return [start, end] as const;
}

/**
 * Where a screen has just become readable: the camera has arrived and, if
 * the screen dives, it already fills the view.
 */
export function arrivalDistance(timeline: Timeline, screen: number) {
  return (
    timeline.segments.find((s) => s.screen === screen && s.kind !== "diveIn")
      ?.start ?? 0
  );
}

/** The distance at which a reading segment has advanced by `fraction`. */
export function readDistance(
  timeline: Timeline,
  screen: number,
  fraction: number,
) {
  const [start, end] = readRange(timeline, screen);
  return start + (end - start) * clamp(fraction);
}

/** The final, full view of the desk: where its hold begins. */
export const roomDistance = (timeline: Timeline) =>
  timeline.segments.find((s) => s.kind === "hold" && s.from === "room")
    ?.start ?? timeline.length;

/** Start and end of the paper curtain, or null without one. */
export function exitRange(timeline: Timeline) {
  const segment = timeline.segments.find((s) => s.kind === "exit");
  return segment ? ([segment.start, segment.end] as const) : null;
}

/**
 * The same moment of the story in a re-measured timeline: the same segment
 * at the same fraction, so a reader stays on the line they were reading.
 * Segments are matched by kind, screen and order, since a resize can add or
 * remove a screen's dive.
 */
export function remapDistance(from: Timeline, to: Timeline, distance: number) {
  if (distance <= 0) return 0;
  if (distance >= from.length) return to.length + (distance - from.length);
  const key = (timeline: Timeline, index: number) => {
    const segment = timeline.segments[index];
    const same = timeline.segments
      .slice(0, index)
      .filter((s) => s.kind === segment.kind && s.screen === segment.screen);
    return `${segment.kind}:${segment.screen}:${same.length}`;
  };
  const index = from.segments.findIndex((segment) => distance < segment.end);
  const a = from.segments[index];
  const wanted = key(from, index);
  const match = to.segments.findIndex((_, i) => key(to, i) === wanted);
  if (match < 0) return (distance / from.length) * to.length;
  const b = to.segments[match];
  return (
    b.start + ((distance - a.start) / (a.end - a.start)) * (b.end - b.start)
  );
}
