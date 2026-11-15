/**
 * The desk's final view leaves the space on either side of the desk empty,
 * and nothing said the objects answer clicks. A hand-drawn note fills it
 * (November 15, final revisions; Onur's sketch): "Try clicking the objects"
 * in the right margin and three unlabelled arrows to the tablet, the lamp
 * and the drawers. A smaller note above the headphones says what they do
 * ("plays music", November 16): nothing else told a visitor the desk has a
 * soundtrack. This module lays them out from where those objects land on
 * screen; it is pure (no three, no DOM), so the layout is tested without a
 * page.
 */
import { signal } from "./signal";

export type Point = { x: number; y: number };
export type CalloutTarget = "tablet" | "lamp" | "drawers" | "headphones";

/**
 * Points in the desk's world (metres, src/lib/desk-interactions.json) the
 * arrows aim at: the side of each object that faces the arrow's tail, so a
 * head never lands on the object itself.
 */
export const calloutWorld: Record<CalloutTarget, [number, number, number]> = {
  // The tablet's outer (left) edge, a little back from its front.
  tablet: [-0.53, 0.02, 0.13],
  // The lamp's shade, top right.
  lamp: [0.735, 0.17, -0.3725],
  // The drawers' outer (right) face, at the second drawer.
  drawers: [0.74, -0.3, 0.34],
  // The headphones' band, from above.
  headphones: [0.5, 0.27, -0.36],
};
/** The desk top's four corners: the desk's extent on screen. */
export const deskCorners: [number, number, number][] = [
  [-0.75, 0, 0.435],
  [0.75, 0, 0.435],
  [-0.75, 0, -0.435],
  [0.75, 0, -0.435],
];

/** Where the camera puts the targets and the desk, in stage pixels. */
export type Projected = Record<CalloutTarget, Point> & {
  deskLeft: number;
  deskRight: number;
};

export type CalloutMode = "side" | "compact" | "none";

export type Arrow = {
  id: CalloutTarget;
  /** The arrow's own box in stage pixels; the paths are inside it. */
  box: { x: number; y: number; width: number; height: number };
  /** Shaft and head, one path, so a dash draws them in order. */
  path: string;
  /** Three short strokes around the tip: the "click". */
  burst: string;
  /** Where the arrow starts and points, inside its box. */
  tail: Point;
  tip: Point;
};

/** A line of handwriting: centred on `x`, its top at `y`. */
export type Handwriting = { x: number; y: number; width: number; size: number };

export type CalloutLayout = {
  mode: CalloutMode;
  title: Handwriting | null;
  /** The headphones' own note ("plays music"), where there is room. */
  note: Handwriting | null;
  arrows: Arrow[];
};

/** Content keeps clear of the paper curtain's 4% (journey.tsx) and more. */
export const inset = 0.06;
/** The least room beside the desk for the side layout, in pixels. */
export const sideRoom = 170;

const clamp = (n: number, low: number, high: number) =>
  Math.min(high, Math.max(low, n));

/** A small deterministic random per arrow: the same wobble every visit. */
function seeded(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32 - 0.5;
  };
}
const seeds: Record<CalloutTarget, number> = {
  tablet: 7,
  lamp: 19,
  drawers: 31,
  headphones: 43,
};

const fmt = (n: number) => Math.round(n * 10) / 10;

/**
 * One hand-drawn arrow from `tail` to `tip`: a cubic that bows by `bow`
 * (a share of its length, signed), a slight wobble, a two-stroke head, and
 * a fan of three strokes ahead of the tip.
 */
export function drawArrow(
  id: CalloutTarget,
  tail: Point,
  target: Point,
  bow: number,
  gap = 12,
): Arrow {
  const random = seeded(seeds[id]);
  const dx = target.x - tail.x;
  const dy = target.y - tail.y;
  const length = Math.hypot(dx, dy) || 1;
  // Stop short of the object.
  const tip = {
    x: target.x - (dx / length) * gap,
    y: target.y - (dy / length) * gap,
  };
  const span = Math.max(1, length - gap);
  const ux = dx / length;
  const uy = dy / length;
  // The normal to the left of the direction of travel.
  const nx = -uy;
  const ny = ux;
  const wobble = () => random() * Math.min(10, span * 0.04);
  const c1 = {
    x: tail.x + ux * span * 0.3 + nx * span * bow + wobble(),
    y: tail.y + uy * span * 0.3 + ny * span * bow + wobble(),
  };
  const c2 = {
    x: tail.x + ux * span * 0.75 + nx * span * bow * 0.55 + wobble(),
    y: tail.y + uy * span * 0.75 + ny * span * bow * 0.55 + wobble(),
  };
  // The head follows the curve's last direction.
  const tx = tip.x - c2.x;
  const ty = tip.y - c2.y;
  const tl = Math.hypot(tx, ty) || 1;
  const angle = Math.atan2(ty, tx);
  const head = clamp(span * 0.1, 15, 24);
  const spread = (27 * Math.PI) / 180;
  const wing = (side: 1 | -1) => ({
    x: tip.x - Math.cos(angle + side * spread) * head,
    y: tip.y - Math.sin(angle + side * spread) * head,
  });
  const left = wing(1);
  const right = wing(-1);
  // The click: three strokes fanned out ahead of the tip.
  const centre = { x: tip.x + (tx / tl) * 6, y: tip.y + (ty / tl) * 6 };
  const rays = [-62, 0, 62].map((degrees) => {
    const a = angle + (degrees * Math.PI) / 180;
    return [
      { x: centre.x + Math.cos(a) * 9, y: centre.y + Math.sin(a) * 9 },
      { x: centre.x + Math.cos(a) * 17, y: centre.y + Math.sin(a) * 17 },
    ];
  });
  const points = [tail, c1, c2, tip, left, right, ...rays.flat()];
  const pad = 8;
  const x0 = Math.min(...points.map((p) => p.x)) - pad;
  const y0 = Math.min(...points.map((p) => p.y)) - pad;
  const x1 = Math.max(...points.map((p) => p.x)) + pad;
  const y1 = Math.max(...points.map((p) => p.y)) + pad;
  const at = (p: Point) => `${fmt(p.x - x0)} ${fmt(p.y - y0)}`;
  return {
    id,
    box: {
      x: fmt(x0),
      y: fmt(y0),
      width: fmt(x1 - x0),
      height: fmt(y1 - y0),
    },
    path: `M${at(tail)}C${at(c1)} ${at(c2)} ${at(tip)}M${at(left)}L${at(tip)}L${at(right)}`,
    burst: rays.map(([a, b]) => `M${at(a)}L${at(b)}`).join(""),
    tail: { x: fmt(tail.x - x0), y: fmt(tail.y - y0) },
    tip: { x: fmt(tip.x - x0), y: fmt(tip.y - y0) },
  };
}

/** The callout for a `width` × `height` stage and where the objects land. */
export function layoutCallouts(
  width: number,
  height: number,
  at: Projected,
): CalloutLayout {
  const left = inset * width;
  const right = (1 - inset) * width;
  const leftRoom = at.deskLeft - left;
  const rightRoom = right - at.deskRight;
  // The title's size follows the smaller of the window's sides.
  const size = clamp(Math.min(width * 0.03, height * 0.056), 28, 54);
  if (width < 560 || height < 420)
    return { mode: "none", title: null, note: null, arrows: [] };
  if (Math.min(leftRoom, rightRoom) >= sideRoom && height >= 480) {
    // In the right margin, near the top: two lines of handwriting.
    const titleWidth = Math.min(rightRoom - 16, size * 7.6);
    const title = {
      x: fmt(at.deskRight + rightRoom / 2),
      y: fmt(Math.max(height * 0.15, 72)),
      width: fmt(titleWidth),
      size: fmt(size),
    };
    const titleBottom = title.y + size * 2.15;
    const lamp = drawArrow(
      "lamp",
      { x: title.x - titleWidth * 0.18, y: titleBottom + 10 },
      at.lamp,
      0.22,
    );
    const tablet = drawArrow(
      "tablet",
      {
        x: left + leftRoom * 0.42,
        y: clamp(at.tablet.y - height * 0.2, height * 0.22, at.tablet.y - 40),
      },
      at.tablet,
      -0.28,
    );
    const drawers = drawArrow(
      "drawers",
      {
        x: at.deskRight + rightRoom * 0.62,
        y: clamp(at.drawers.y + height * 0.12, at.drawers.y + 30, height * 0.9),
      },
      at.drawers,
      -0.24,
    );
    // The headphones' note: in the sky above them, between the monitor and
    // the title, smaller than the title so the two read in that order.
    const noteSize = clamp(size * 0.64, 19, 34);
    const noteWidth = noteSize * 5;
    const sky = Math.max(height * 0.14, 76);
    const note = {
      x: fmt(
        Math.min(
          at.headphones.x + noteWidth * 0.62,
          title.x - titleWidth / 2 - 14 - noteWidth / 2,
        ),
      ),
      y: fmt(clamp(at.headphones.y - height * 0.13, sky, at.headphones.y - 70)),
      width: fmt(noteWidth),
      size: fmt(noteSize),
    };
    const headphones = drawArrow(
      "headphones",
      { x: note.x - noteWidth * 0.2, y: note.y + noteSize * 1.25 },
      at.headphones,
      -0.2,
      10,
    );
    return {
      mode: "side",
      title,
      note,
      arrows: [tablet, lamp, drawers, headphones],
    };
  }
  // Too little room beside the desk: the title above it, one arrow down to
  // the lamp.
  const titleWidth = Math.min(width * 0.7, size * 13);
  const title = {
    x: fmt(width / 2),
    y: fmt(Math.max(height * 0.1, 64)),
    width: fmt(titleWidth),
    size: fmt(size),
  };
  const lamp = drawArrow(
    "lamp",
    { x: title.x + titleWidth * 0.32, y: title.y + size * 1.3 },
    at.lamp,
    -0.3,
  );
  return { mode: "compact", title, note: null, arrows: [lamp] };
}

/** True while the callout shows: the random teases wait (desk-teases.tsx). */
export const calloutsActive = signal(false);
