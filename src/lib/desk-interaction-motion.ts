export type AnimatedObject = "headphones" | "mouse" | "tablet";
export const lampColors = [
  "#694b2f",
  "#603f4b",
  "#514366",
  "#35546b",
  "#405e4e",
] as const;
/** The lamp opens amber (warm yellow); the dial cycles from there. */
export const initialLampColor = 0;
export const animationDuration = { headphones: 650, mouse: 750, tablet: 1000 };
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Absolute offsets from the authored pose; never accumulate transform drift. */
export function accessoryPose(
  id: AnimatedObject,
  progress: number,
  variant = 0,
) {
  const t = Math.max(0, Math.min(1, progress));
  const pose = { x: 0, y: 0, z: 0, rotation: 0 };
  if (t === 0 || t === 1) return pose;
  const pulse = Math.sin(Math.PI * t) ** 2;
  if (id === "headphones") {
    const hop = hopPose(t);
    pose.y = hop.y;
    pose.rotation = hop.rotation;
  } else if (id === "mouse") {
    if (variant === 4) {
      pose.x = 0.01 * (1 - Math.cos(2 * Math.PI * smooth(t)));
      pose.z = 0.01 * Math.sin(2 * Math.PI * smooth(t));
    } else {
      const direction = [
        [1, 0],
        [-1, 0],
        [0, -1],
        [0, 1],
      ][variant % 4];
      pose.x = direction[0] * 0.018 * pulse;
      pose.z = direction[1] * 0.018 * pulse;
    }
    pose.rotation = 0.06 * Math.sin(t * Math.PI * 2) * pulse;
  } else {
    // Pencil starts beside the right tablet edge, away from the laptop rest.
    const excursion =
      t < 0.35 ? smooth(t / 0.35) : t < 0.6 ? 1 : 1 - smooth((t - 0.6) / 0.4);
    pose.x = 0.013 * excursion;
    pose.y = -0.004 * excursion; // 4 mm radius clears the 4 mm desk mat
    pose.rotation = 0.8 * excursion;
  }
  return pose;
}

/** One overlapping top-to-bottom wave. Each 60 cm drawer travels 15 cm out. */
export const drawerWave = {
  travel: 0.15,
  stagger: 180,
  stroke: 1000,
  duration: 1540,
};
export const drawerIds = ["drawer1", "drawer2", "drawer3", "drawer4"] as const;
export function drawerOffset(elapsed: number, index: number) {
  const t = (elapsed - index * drawerWave.stagger) / drawerWave.stroke;
  if (t <= 0 || t >= 1) return 0;
  return drawerWave.travel * Math.sin(Math.PI * t) ** 2;
}

/*
 * October 24 (desk delight): every object answers a press, a hover and the
 * occasional unprompted "tease" that shows it can be clicked. Like the poses
 * above, each is a pure function of time that is exactly at rest outside its
 * span, so nothing accumulates.
 */
export type PosedObject = "headphones" | "mouse" | "tablet" | "lamp" | "dial";
export const posedObjects = [
  "headphones",
  "mouse",
  "tablet",
  "lamp",
  "dial",
] as const satisfies readonly PosedObject[];
/**
 * The height (m) each object squashes towards: its base on the desk, or for
 * the headphones, which hang, the saddle of their stand.
 */
export const squashPivot: Record<PosedObject, number> = {
  headphones: 0.237,
  mouse: 0.006,
  tablet: 0.006,
  lamp: 0,
  dial: 0,
};
/** How deep each object's press squashes it. The lamp's lights stay put. */
export const pressDepth: Record<PosedObject, number> = {
  headphones: 0,
  mouse: 0.06,
  tablet: 0,
  lamp: 0.04,
  dial: 0.15,
};
export const pressDuration = 240;
/** The press has bottomed out: the click's own change shows from here. */
export const pressLead = 110;

/** Down to -1 by 40%, a small rebound, then exactly 0. */
function pressCurve(t: number) {
  if (t <= 0 || t >= 1) return 0;
  if (t < 0.4) return -smooth(t / 0.4);
  const u = (t - 0.4) / 0.6;
  return -Math.cos(1.5 * Math.PI * u) * (1 - u) ** 2;
}
/** Vertical scale of a press of `depth`; width keeps the volume. */
export function pressScale(t: number, depth: number) {
  return 1 + depth * pressCurve(t);
}
/** The lamp nods (radians about its base, under 3°) as it is pressed. */
export function lampNod(t: number) {
  if (t <= 0 || t >= 1) return 0;
  return 0.05 * Math.sin(Math.PI * t) * (1 - t);
}
/** The tablet dips into the mat (m); it rests 2 mm above it. */
export function tabletDip(t: number) {
  if (t <= 0 || t >= 1) return 0;
  return -0.0015 * Math.sin(Math.PI * t);
}

/**
 * The headphones hop off their stand: a crouch, about 30 mm up with a slight
 * tilt, and a landing squash on the saddle.
 */
export function hopPose(t: number) {
  const pose = { y: 0, rotation: 0, scale: 1 };
  if (t <= 0 || t >= 1) return pose;
  if (t < 0.15) {
    pose.scale = 1 - 0.06 * Math.sin((Math.PI / 2) * (t / 0.15));
  } else if (t < 0.6) {
    const u = (t - 0.15) / 0.45;
    pose.y = 0.03 * Math.sin(Math.PI * u);
    pose.scale =
      1 -
      0.06 * Math.cos((Math.PI / 2) * Math.min(1, u / 0.25)) +
      0.03 * Math.sin(Math.PI * u);
    pose.rotation = 0.04 * Math.sin(2 * Math.PI * u);
  } else {
    const v = (t - 0.6) / 0.4;
    pose.scale = 1 - 0.07 * Math.sin(Math.PI * v) * (1 - 0.6 * v);
    pose.rotation = 0.02 * Math.sin(2 * Math.PI * v) * (1 - v);
  }
  return pose;
}

/** A drawer clicks in (m, negative) before the wave pulls them all out. */
export const drawerPress = { depth: 0.008, duration: 180, lead: 110 };
export function drawerPressOffset(elapsed: number) {
  const t = elapsed / drawerPress.duration;
  if (t <= 0 || t >= 1) return 0;
  return -drawerPress.depth * Math.sin(Math.PI * t);
}

/** Hovering lifts an object a few millimetres; a drawer peeks out instead. */
export const hoverLift: Record<PosedObject, number> = {
  headphones: 0.004,
  mouse: 0.003,
  tablet: 0.002,
  lamp: 0.003,
  dial: 0.002,
};
export const drawerPeek = 0.006;
export const hoverDuration = 140;
/** A hover level eased from `from` to `to` over `hoverDuration`. */
export function hoverLevel(
  from: number,
  to: number,
  elapsed: number,
  duration = hoverDuration,
) {
  const t = Math.max(0, Math.min(1, elapsed / duration));
  return from + (to - from) * smooth(t);
}

/** A tease: a small hop, or for a drawer a peek, and back. */
export const teaseDuration = 650;
export function teaseLift(t: number) {
  if (t <= 0 || t >= 1) return 0;
  return 0.008 * Math.sin(Math.PI * t) ** 2;
}
export const teasePeek = 0.012;
/** The lights dim briefly when the dial is teased; they never go out. */
export function teaseDim(t: number) {
  if (t <= 0 || t >= 1) return 1;
  return 1 - 0.35 * Math.sin(Math.PI * t);
}

/** A water-like ripple: two rings that spread and fade. */
export const rippleDuration = 700;
export const rippleDelay = 0.13;
/** Ring `i`'s radius (fraction of the largest) and opacity at progress `p`. */
export function rippleRing(p: number, i: 0 | 1) {
  const t = Math.max(0, Math.min(1, (p - i * rippleDelay) / (1 - rippleDelay)));
  if (t <= 0 || t >= 1) return { radius: 0, opacity: 0 };
  const eased = 1 - (1 - t) ** 3;
  return { radius: 0.3 + 0.7 * eased, opacity: 0.55 * (1 - t) };
}

/**
 * Teases (October 24): only in the final view, after a quiet spell, spaced
 * apart and a few per visit, so the desk hints rather than fidgets.
 */
export const teaseRules = { quiet: 4000, gap: 8000, perVisit: 3 };
export function teaseDue(
  {
    now,
    lastInput,
    lastTease,
    shown,
  }: { now: number; lastInput: number; lastTease: number; shown: number },
  rules: { quiet: number; gap: number; perVisit: number } = teaseRules,
) {
  return (
    shown < rules.perVisit &&
    now - lastInput >= rules.quiet &&
    now - lastTease >= rules.gap
  );
}
/** One of the objects not clicked yet, or none. */
export function pickTease<T>(untouched: readonly T[], random = Math.random) {
  if (!untouched.length) return undefined;
  return untouched[
    Math.min(untouched.length - 1, Math.floor(random() * untouched.length))
  ];
}
