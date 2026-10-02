/**
 * Where the story stands for the MacBook's balls, published by the journey
 * as the visitor scrolls. Phases change a handful of times per journey, so
 * subscribers re-render only then, never per scroll frame.
 *
 * - away: far from the MacBook; no WebGL context is wanted.
 * - near: approaching; the scene mounts at idle with the balls parked above.
 * - desk: the XP desktop is on screen; the balls drop and settle.
 * - rise: the Explorer window rises and throws the balls out of the screen.
 * - gone: the list is open or the camera has left; the context is released.
 */
export type LaptopPhase = "away" | "near" | "desk" | "rise" | "gone";

let phase: LaptopPhase = "away";
const listeners = new Set<() => void>();

export const laptopPhase = {
  get: () => phase,
  set(next: LaptopPhase) {
    if (next === phase) return;
    phase = next;
    for (const listener of listeners) listener();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
