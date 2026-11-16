import { describe, expect, it } from "vitest";
import { createPacer, paceChoice, paceFor } from "../src/lib/frame-pacer";

/** The stamps of `count` refreshes `refreshMs` apart, from `start`. */
const refreshes = (refreshMs: number, count: number, start = 1000) =>
  Array.from({ length: count }, (_, i) => start + i * refreshMs);

describe("frame pacer", () => {
  it("draws every frame at a pace of one", () => {
    const pacer = createPacer();
    expect(refreshes(8.33, 6).map((stamp) => pacer.beat(stamp))).toEqual(
      Array(6).fill(true),
    );
  });

  it("draws every second refresh at a pace of two", () => {
    const pacer = createPacer();
    pacer.set(2, 8.33);
    expect(refreshes(8.33, 8).map((stamp) => pacer.beat(stamp))).toEqual([
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
    ]);
    expect(pacer.budget).toBeCloseTo(16.66);
  });

  it("draws every fourth refresh of a 240 Hz display", () => {
    const pacer = createPacer();
    pacer.set(4, 1000 / 240);
    const drawn = refreshes(1000 / 240, 16).filter((stamp) =>
      pacer.beat(stamp),
    );
    expect(drawn).toHaveLength(4);
  });

  it("gives every caller in one frame the same answer", () => {
    const pacer = createPacer();
    pacer.set(2, 8.33);
    const [first, second] = refreshes(8.33, 2);
    expect([pacer.beat(first), pacer.beat(first), pacer.beat(first)]).toEqual([
      true,
      true,
      true,
    ]);
    expect([pacer.beat(second), pacer.beat(second)]).toEqual([false, false]);
  });

  it("draws at once after a pause, then keeps the beat from there", () => {
    const pacer = createPacer();
    pacer.set(2, 8.33);
    for (const stamp of refreshes(8.33, 3)) pacer.beat(stamp);
    // Half a second later, on what counting would call an off refresh.
    expect(refreshes(8.33, 4, 1525).map((stamp) => pacer.beat(stamp))).toEqual([
      true,
      false,
      true,
      false,
    ]);
  });

  it("does not sit out the refresh after a dropped frame", () => {
    const pacer = createPacer();
    pacer.set(2, 8.33);
    expect(pacer.beat(1000)).toBe(true);
    // The frame at 1016.7 never came; the next one is drawn.
    expect(pacer.beat(1025)).toBe(true);
    expect(pacer.beat(1033.3)).toBe(false);
  });

  it("draws a forced frame wherever it falls", () => {
    const pacer = createPacer();
    pacer.set(2, 8.33);
    expect(pacer.beat(1000)).toBe(true);
    pacer.force();
    expect(pacer.beat(1008.33)).toBe(true);
    // The beat carries on from the forced frame.
    expect(pacer.beat(1016.66)).toBe(false);
    expect(pacer.beat(1025)).toBe(true);
  });

  it("returns to every frame when the pace is set back to one", () => {
    const pacer = createPacer();
    pacer.set(2, 8.33);
    pacer.beat(1000);
    pacer.set(1);
    expect(pacer.beat(1008.33)).toBe(true);
    expect(pacer.budget).toBeCloseTo(8.33);
  });
});

describe("the pace for a display", () => {
  it("never paces a display of up to about 100 Hz", () => {
    for (const hz of [50, 60, 75, 90, 100]) expect(paceFor(1000 / hz)).toBe(1);
  });
  it("paces faster displays to the rate nearest 60 a second", () => {
    expect(paceFor(1000 / 120)).toBe(2);
    expect(paceFor(1000 / 144)).toBe(2);
    expect(paceFor(1000 / 165)).toBe(3);
    expect(paceFor(1000 / 240)).toBe(4);
    expect(paceFor(1000 / 360)).toBe(6);
  });
  it("reads a measured interval, not only a nominal one", () => {
    // Chromium reports 118 Hz for a 120 Hz ProMotion display.
    expect(paceFor(1000 / 118)).toBe(2);
    expect(paceFor(16.9)).toBe(1);
  });
});

describe("a chosen pace", () => {
  it("is off, a number, or left to the frames", () => {
    expect(paceChoice(null, "")).toBeNull();
    expect(paceChoice(null, "?pace=off")).toBe(1);
    expect(paceChoice("off", "")).toBe(1);
    expect(paceChoice("2", "")).toBe(2);
    expect(paceChoice("2", "?pace=off")).toBe(1);
    expect(paceChoice("9", "")).toBeNull();
    expect(paceChoice("fast", "")).toBeNull();
  });
});

describe("a refresh ahead", () => {
  it("tells whoever listens, until they stop", () => {
    const pacer = createPacer();
    let told = 0;
    const off = pacer.onAhead(() => told++);
    pacer.ahead();
    off();
    pacer.ahead();
    expect(told).toBe(1);
  });
});
