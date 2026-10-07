import { describe, it, expect } from "vitest";
import { caughtUp, follow } from "../src/lib/cursor";

describe("custom cursor easing", () => {
  it("closes half the gap per half-life", () => {
    expect(follow(0, 100, 45, 45)).toBeCloseTo(50);
    expect(follow(0, 100, 90, 45)).toBeCloseTo(75);
  });
  it("is independent of the frame rate", () => {
    let at60 = 0;
    for (let i = 0; i < 6; i++) at60 = follow(at60, 100, 1000 / 60);
    let at120 = 0;
    for (let i = 0; i < 12; i++) at120 = follow(at120, 100, 1000 / 120);
    expect(at60).toBeCloseTo(at120, 6);
  });
  it("snaps without a half-life (reduced motion)", () => {
    expect(follow(0, 100, 16, 0)).toBe(100);
  });
  it("settles within a fifth of a pixel", () => {
    expect(caughtUp(0.1, 0.1)).toBe(true);
    expect(caughtUp(0.3, 0)).toBe(false);
  });
});
