import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createResolutionGovernor,
  rememberLevel,
  rememberedLevel,
  resolutionLevels,
} from "../src/lib/desk-story/frame-budget";

const levels = [1.5, 1.25, 1];

/** A governor past its settling second, fed moving frames `interval` apart. */
function governor(frameMs: number, level = 1.5) {
  const judge = createResolutionGovernor({
    levels,
    level,
    frameMs,
    now: 0,
    samples: 10,
    settleMs: 1000,
  });
  let now = 1000;
  return {
    judge,
    frames(intervals: number[], gpuMs?: number[]) {
      intervals.forEach((interval, i) => {
        judge.record((now += interval));
        if (gpuMs) judge.recordGpu(gpuMs[i % gpuMs.length], now);
      });
      return judge.proposal();
    },
  };
}

describe("desk resolution levels", () => {
  it("caps the top level at the screen's own density", () => {
    expect(resolutionLevels(1.5, 2)).toEqual([1.5, 1.25, 1]);
    expect(resolutionLevels(1.25, 3)).toEqual([1.25, 1]);
    expect(resolutionLevels(1.5, 1)).toEqual([1]);
    expect(resolutionLevels(1, 2)).toEqual([1]);
    // Below one device pixel per CSS pixel, when frames call for it.
    expect(resolutionLevels(1, 2, 0.85)).toEqual([1, 0.85]);
    expect(resolutionLevels(1, 1.25, 0.75)).toEqual([1, 0.85, 0.75]);
    expect(resolutionLevels(1.5, 1.25, 0.85)).toEqual([1.25, 1, 0.85]);
  });
});

describe("a computer resolution cannot help", () => {
  const lowest = (frameMs = 16.7) =>
    createResolutionGovernor({
      levels: [1, 0.85, 0.75],
      level: 0.75,
      frameMs,
      now: 0,
      samples: 10,
      settleMs: 0,
    });
  it("is strained when the lowest level still misses the budget", () => {
    const judge = lowest();
    for (let i = 1; i <= 10; i++) judge.recordGpu(15, i);
    expect(judge.proposal()).toBeNull();
    expect(judge.strained()).toBe(true);
  });
  it("is not while the lowest level fits, or before it has samples", () => {
    const judge = lowest();
    expect(judge.strained()).toBe(false);
    for (let i = 1; i <= 10; i++) judge.recordGpu(9, i);
    expect(judge.strained()).toBe(false);
  });
  it("is not above the lowest level: that level steps down first", () => {
    const judge = createResolutionGovernor({
      levels: [1, 0.85, 0.75],
      level: 1,
      frameMs: 16.7,
      now: 0,
      samples: 10,
      settleMs: 0,
    });
    for (let i = 1; i <= 10; i++) judge.recordGpu(15, i);
    expect(judge.proposal()).toBe(0.85);
    expect(judge.strained()).toBe(false);
  });
  it("tells from slow moving frames without a GPU timer", () => {
    const judge = lowest();
    let now = 0;
    for (let i = 0; i < 12; i++) judge.record((now += 30));
    expect(judge.strained()).toBe(true);
  });
});

describe("desk resolution from GPU time", () => {
  it("keeps the level while the GPU fits the frame", () => {
    expect(governor(16.7).frames(Array(20).fill(16.7), [6, 7, 8])).toBeNull();
  });
  it("judges against the display: what fits 60 Hz is slow at 120 Hz", () => {
    expect(governor(16.7).frames(Array(20).fill(16.7), [7])).toBeNull();
    expect(governor(8.3).frames(Array(20).fill(8.3), [7])).toBe(1.25);
  });
  it("climbs back only with room to spare", () => {
    // 1.25 → 1.5 costs 1.44 times as much: 2 ms becomes about 2.9 ms.
    expect(governor(16.7, 1.25).frames(Array(20).fill(16.7), [2])).toBe(1.5);
    // 5.5 ms would become 7.9 ms: too close to stepping down again.
    expect(governor(16.7, 1.25).frames(Array(20).fill(16.7), [5.5])).toBeNull();
  });
  it("ignores the settling second after a mount or a change", () => {
    const { judge, frames } = governor(16.7);
    judge.applied(1.25, 1000);
    expect(frames(Array(10).fill(16.7), [20])).toBeNull();
  });
  it("stops changing after a few changes in one visit", () => {
    const judge = createResolutionGovernor({
      levels,
      level: 1.5,
      frameMs: 16.7,
      now: 0,
      samples: 1,
      settleMs: 0,
      maxChanges: 2,
    });
    judge.recordGpu(30, 1);
    judge.applied(1.25, 1);
    judge.recordGpu(1, 2);
    judge.applied(1.5, 2);
    judge.recordGpu(30, 3);
    expect(judge.proposal()).toBeNull();
  });
});

describe("desk resolution without a GPU timer", () => {
  it("steps down when moving frames are slow", () => {
    expect(governor(16.7).frames(Array(12).fill(25))).toBe(1.25);
  });
  it("keeps the level at a smooth frame rate", () => {
    expect(governor(16.7).frames(Array(12).fill(16.7))).toBeNull();
    expect(governor(16.7).frames(Array(12).fill(19))).toBeNull();
  });
  it("does not blame the GPU for main-thread hitches", () => {
    const intervals = Array.from({ length: 12 }, (_, i) => (i % 3 ? 16.7 : 90));
    expect(governor(16.7).frames(intervals)).toBeNull();
  });
  it("ignores idle gaps between demand-rendered frames", () => {
    const intervals = Array.from({ length: 24 }, (_, i) => (i % 2 ? 16 : 500));
    expect(governor(16.7).frames(intervals)).toBeNull();
  });
  it("never climbs without GPU timings to judge by", () => {
    expect(governor(16.7, 1.25).frames(Array(12).fill(8))).toBeNull();
  });
});

describe("remembered desk resolution", () => {
  beforeEach(() => {
    const items = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => void items.set(key, value),
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
  it("starts a return visit at the level it settled on", () => {
    rememberLevel(1.25);
    expect(rememberedLevel(levels)).toBe(1.25);
    expect(rememberedLevel([1])).toBeNull();
  });
  it("forgets after a week", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    rememberLevel(1);
    vi.setSystemTime(8 * 24 * 60 * 60 * 1000);
    expect(rememberedLevel(levels)).toBeNull();
  });
  it("ignores storage it cannot read", () => {
    localStorage.setItem("portfolio:desk-resolution", "{");
    expect(rememberedLevel(levels)).toBeNull();
  });
});
