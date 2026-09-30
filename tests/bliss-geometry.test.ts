import { describe, it, expect } from "vitest";
import {
  bliss,
  coverFrame,
  floorInStage,
  layerBox,
} from "../src/lib/bliss-geometry";

describe("Bliss cover and floor", () => {
  it("covers landscape, portrait and ultrawide stages without gaps", () => {
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
      [3440, 1440],
    ]) {
      const frame = coverFrame(width, height);
      expect(frame.width).toBeGreaterThanOrEqual(width - 0.001);
      expect(frame.height).toBeGreaterThanOrEqual(height - 0.001);
      expect(frame.x).toBeLessThanOrEqual(0.001);
      expect(frame.y).toBeLessThanOrEqual(0.001);
      expect(frame.x + frame.width).toBeGreaterThanOrEqual(width - 0.001);
      expect(frame.y + frame.height).toBeGreaterThanOrEqual(height - 0.001);
    }
  });
  it("keeps the photo's proportions", () => {
    const frame = coverFrame(390, 844);
    expect(frame.width / frame.height).toBeCloseTo(3840 / 2400, 6);
  });
  it("maps the crest into the stage along the photo's own curve", () => {
    const floor = floorInStage(1440, 900);
    const frame = coverFrame(1440, 900);
    expect(floor.ys).toHaveLength(bliss.floor.samples.length);
    expect(floor.x0).toBeCloseTo(frame.x, 6);
    // The crest sits in the middle band of the photo and falls to the right.
    const first = (floor.ys[0] - frame.y) / frame.height;
    const last = (floor.ys.at(-1)! - frame.y) / frame.height;
    expect(first).toBeGreaterThan(0.45);
    expect(last).toBeLessThan(0.7);
    expect(last).toBeGreaterThan(first);
  });
  it("gives every layer enough overscan for its parallax travel", () => {
    const sky = bliss.layers.sky;
    expect(-sky.top / bliss.height).toBeCloseTo(bliss.travel.sky, 2);
    const foreground = bliss.layers.foreground;
    expect(
      (foreground.top + foreground.height - bliss.height) / bliss.height,
    ).toBeCloseTo(bliss.travel.foreground, 2);
    expect(parseFloat(layerBox("hill").top)).toBeGreaterThan(40);
  });
});
