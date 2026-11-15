/**
 * How far the desk has come in getting ready, from 0 to 1, for the opening's
 * loading ring (November 15, final revisions). Real stages, not a timer: a
 * fast computer fills the ring in about a second, a slow one takes longer.
 * Kept apart from three, so the first load can read it.
 */
import { signal } from "./signal";

/** Each stage and how much of the ring it fills once reached. */
export const loadStages = {
  /** The desk is turned on: its code and model start downloading. */
  enabled: 0.1,
  /** The scene's code has arrived. */
  code: 0.3,
  /** The model is downloaded and decoded. */
  model: 0.55,
  // The warm-up's steps (src/components/three/warm-up.ts).
  textures: 0.62,
  programs: 0.7,
  offscreen: 0.82,
  frame: 0.88,
  gpu: 0.94,
  /** The desk shows. */
  ready: 1,
} as const;
export type LoadStage = keyof typeof loadStages;

const ordered = [0, ...Object.values(loadStages)].sort((a, b) => a - b);

/** The stage after `value`'s: where the ring creeps towards meanwhile. */
export function nextStage(value: number) {
  return ordered.find((stage) => stage > value + 1e-6) ?? 1;
}

/** The share of the ring the desk has earned; it never goes back. */
export const loadProgress = signal(0);

export function reportLoad(stage: LoadStage) {
  loadProgress.set(Math.max(loadProgress.get(), loadStages[stage]));
}

/** A journey mounting anew starts its ring from the beginning. */
export function resetLoad() {
  loadProgress.set(0);
}

/**
 * The ring's drawn share at `elapsed` milliseconds since the desk last
 * reached a stage: most of the way to the next stage, slower and slower, so
 * it never stands still and never runs ahead of the real work.
 */
export function creep(reached: number, elapsed: number) {
  const next = nextStage(reached);
  return reached + (next - reached) * 0.85 * (1 - Math.exp(-elapsed / 1400));
}
