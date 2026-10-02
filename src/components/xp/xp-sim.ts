import { createBallWorld, type BallWorld } from "@/lib/physics/ball-world";
import { floorInStage } from "@/lib/bliss-geometry";
import type { LaptopPhase } from "@/lib/desk-story/store";

export const GRAVITY = 2600;
const SEED = 0x7ec5;

/**
 * - idle: parked above the screen, waiting for the desktop to appear.
 * - dropping: falling, scattered, onto the hill.
 * - resting: settled; nothing renders until something changes.
 * - launched: thrown up and out by the rising Explorer window.
 */
export type Mode = "idle" | "dropping" | "resting" | "launched";

/**
 * The balls' simulation lives here, outside the canvas, so releasing the
 * WebGL context and taking it back redraws the same frame instead of
 * restarting. The scene and the DOM controls share it.
 */
export const sim: {
  world: BallWorld | null;
  radii: number[];
  width: number;
  height: number;
  mode: Mode;
  /** The ball under the pointer or tapped, or -1. */
  selected: number;
  invalidate: () => void;
} = {
  world: null,
  radii: [],
  width: 0,
  height: 0,
  mode: "idle",
  selected: -1,
  invalidate: () => {},
};

/**
 * A fresh world for `radii` in a desktop of `width` × `height` px, parked
 * above the screen. The same seed gives the same start every time, so a
 * visitor who scrolls back before the MacBook sees the same drop again.
 */
export function resetWorld(radii: number[], width: number, height: number) {
  const world = createBallWorld({
    width,
    height,
    radii,
    seed: SEED,
    gravity: GRAVITY,
  });
  world.setFloor(floorInStage(width, height));
  world.spawnAbove();
  Object.assign(sim, { world, radii, width, height, mode: "idle" as Mode });
  sim.selected = -1;
  return world;
}

/** Follows the story: drop on the desktop, launch on the rise, reset before. */
export function applyPhase(phase: LaptopPhase) {
  const world = sim.world;
  if (!world) return;
  if (phase === "away" || phase === "near") {
    if (sim.mode !== "idle") resetWorld(sim.radii, sim.width, sim.height);
  } else if (phase === "desk") {
    if (sim.mode === "idle") drop(true);
    else if (sim.mode === "launched") drop(false);
  } else if (sim.mode !== "launched") {
    // The Explorer's top edge sweeps up through the pile: up and out.
    world.setWalls({ top: false });
    world.setGravity(-0.6 * GRAVITY);
    world.impulse(0, -1300 * (world.height / 800), 520, 10);
    sim.mode = "launched";
    sim.selected = -1;
  }
  sim.invalidate();
}

/** Drops the balls from above, scattering sideways as they fall. */
export function drop(scatter: boolean) {
  const world = sim.world;
  if (!world) return;
  world.setWalls({ top: false });
  world.setGravity(GRAVITY);
  world.spawnAbove(scatter ? 1.6 : 1);
  if (scatter) world.impulse(0, 0, 900, 8);
  sim.mode = "dropping";
  sim.selected = -1;
  sim.invalidate();
}

/** The settled ball at a desktop point, or -1. */
export function ballAt(x: number, y: number) {
  const world = sim.world;
  if (!world || sim.mode === "idle" || sim.mode === "launched") return -1;
  let best = -1;
  let bestDistance = Infinity;
  for (let i = 0; i < world.count; i++) {
    if (world.awake[i]) continue;
    const distance = Math.hypot(world.px[i] - x, world.py[i] - y);
    if (distance <= world.radii[i] * 1.1 && distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  }
  return best;
}
