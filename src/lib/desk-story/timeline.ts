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
  | "diveOut";
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
};

export const holds = {
  opening: 0.15,
  desktop: 0.1,
  read: 0.2,
  desktopXp: 0.5,
  room: 0.35,
};
export const lengths = { rise: 0.3, dive: 0.35 };
/** Before anything is measured: about one screen of content each. */
export const defaultLayout: StoryLayout = { portrait: 1.6, macbook: 1 };
/** A read never collapses entirely, so its anchors stay distinct. */
const minimumRead = 0.05;

export const clamp = (n: number, low = 0, high = 1) =>
  Math.max(low, Math.min(high, n));
export const ease = (n: number) => {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
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
  ];
  let start = 0;
  const segments = plan.map(([kind, from, to, length, screen]) => {
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
  reading: number[];
  /** Per screen: how far the camera has arrived at its stop (0–1). */
  arrival: number[];
  /** Per screen: how far the camera has left its stop again (0–1). */
  departure: number[];
  /** Per screen: how far its window has risen (the MacBook's Explorer). */
  rise: number[];
  /** Per screen: how far it fills the view instead of the desk (0–1). */
  dive: number[];
  /** The screen the camera rests on, or -1 while travelling or elsewhere. */
  active: number;
};

export function storyAt(timeline: Timeline, distance: number): StoryState {
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
  const travel = current.kind === "travel" ? ease(local) : 0;
  return {
    distance: d,
    from: current.from,
    to: current.to,
    travel,
    reading,
    arrival,
    departure,
    rise: rise.map(ease),
    dive: dive.map(ease),
    active: current.kind === "travel" ? -1 : current.screen,
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

/** The final, full view of the desk. */
export const roomDistance = (timeline: Timeline) =>
  timeline.segments[timeline.segments.length - 1].start;

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

/** Hold each page still before moving to the next page. */
export function pageOffset(progress: number, count: number) {
  const steps = count * 2 - 1;
  const value = clamp(progress) * steps;
  const segment = Math.min(steps - 1, Math.floor(value));
  return Math.min(
    count - 1,
    Math.floor(segment / 2) + (segment % 2 ? ease(value - segment) : 0),
  );
}

/** The still portion of page `page` within a paged reading segment. */
export function pageFraction(page: number, count: number) {
  return (page * 2 + 0.5) / (count * 2 - 1);
}
