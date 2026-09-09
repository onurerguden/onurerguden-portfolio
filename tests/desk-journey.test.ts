import { describe, it, expect } from "vitest";
import {
  journeyAt,
  pageOffset,
  focusDistance,
  readingRanges,
  journeyLength,
} from "../src/lib/desk-journey";
describe("desk scroll choreography", () => {
  it("keeps every reading camera still while advancing only its screen", () => {
    readingRanges.forEach(([start, end], index) => {
      for (const fraction of [0.1, 0.4, 0.8]) {
        const state = journeyAt(start + (end - start) * fraction);
        expect(state.from).toBe(index + 1);
        expect(state.to).toBe(index + 1);
        expect(state.reading[index]).toBeCloseTo(fraction);
        state.reading.forEach((value, i) => {
          if (i !== index) expect(value).toBe(i < index ? 1 : 0);
        });
      }
    });
  });
  it("clamps, reverses and skips deterministically without elapsed time", () => {
    const path = [0, 0.5, 1.25, 3.25, 4, 5.25, 6, 7, 7.5];
    const forward = path.map(journeyAt);
    expect([...path].reverse().map(journeyAt).reverse()).toEqual(forward);
    expect(journeyAt(-30)).toEqual(journeyAt(0));
    expect(journeyAt(90)).toEqual(journeyAt(journeyLength));
    expect(journeyAt(0.25).from).toBe(0);
    expect(journeyAt(0.25).to).toBe(0);
    expect(journeyAt(0.25).preview).toBeGreaterThan(0);
  });
  it("focus targets the still portion of each card and never hides its link", () => {
    [3, 3, 2].forEach((count, screen) => {
      for (let card = 0; card < count; card++) {
        const state = journeyAt(focusDistance(screen, card, count));
        expect(state.active).toBe(screen);
        expect(pageOffset(state.reading[screen], count)).toBe(card);
      }
    });
  });
  it("holds the first and final cards, with bounded monotonic movement", () => {
    for (const count of [2, 3]) {
      expect(pageOffset(0, count)).toBe(0);
      expect(pageOffset(1, count)).toBe(count - 1);
      let previous = 0;
      for (let n = 0; n <= 100; n++) {
        const value = pageOffset(n / 100, count);
        expect(value).toBeGreaterThanOrEqual(previous);
        expect(value).toBeLessThanOrEqual(count - 1);
        previous = value;
      }
    }
  });
});
