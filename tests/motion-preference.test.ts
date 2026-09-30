import { describe, it, expect } from "vitest";
import {
  allowsAnimation,
  allowsStages,
  nextMotionState,
  serverMotionState,
} from "../src/lib/motion-preference";

describe("motion preference", () => {
  it("renders no WebGL before hydration", () => {
    expect(allowsStages(serverMotionState)).toBe(false);
    expect(allowsAnimation(serverMotionState)).toBe(false);
  });
  it("hydrates from the OS setting and the saved toggle", () => {
    const state = nextMotionState(serverMotionState, {
      type: "hydrate",
      reduced: false,
      paused: true,
    });
    expect(state).toEqual({ reduced: false, paused: true, hydrated: true });
    expect(allowsStages(state)).toBe(true);
    expect(allowsAnimation(state)).toBe(false);
  });
  it("removes stages under reduced motion but only freezes them when paused", () => {
    const hydrated = nextMotionState(serverMotionState, {
      type: "hydrate",
      reduced: false,
      paused: false,
    });
    const reduced = nextMotionState(hydrated, { type: "reduced", value: true });
    expect(allowsStages(reduced)).toBe(false);
    const paused = nextMotionState(hydrated, { type: "paused", value: true });
    expect(allowsStages(paused)).toBe(true);
    expect(allowsAnimation(paused)).toBe(false);
  });
  it("returns the same object when nothing changes", () => {
    const hydrated = nextMotionState(serverMotionState, {
      type: "hydrate",
      reduced: false,
      paused: false,
    });
    expect(nextMotionState(hydrated, { type: "paused", value: false })).toBe(
      hydrated,
    );
  });
});
