import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createResolutionGovernor,
  firstStep,
  rememberStep,
  rememberedLevel,
  rememberedStep,
  resolutionLevels,
  resolutionSteps,
  type Step,
} from "../src/lib/desk-story/frame-budget";

const levels = [1.5, 1.25, 1];
const full = (list: number[]) => list.map((level) => ({ level, every: 1 }));
const at = (level: number, every = 1): Step => ({ level, every });

/** A governor past its settling second, fed moving frames `interval` apart. */
function governor(frameMs: number, level = 1.5) {
  const judge = createResolutionGovernor({
    steps: full(levels),
    step: at(level),
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
      steps: full([1, 0.85, 0.75]),
      step: at(0.75),
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
      steps: full([1, 0.85, 0.75]),
      step: at(1),
      frameMs: 16.7,
      now: 0,
      samples: 10,
      settleMs: 0,
    });
    for (let i = 1; i <= 10; i++) judge.recordGpu(15, i);
    expect(judge.proposal()).toEqual(at(0.85));
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
    expect(governor(8.3).frames(Array(20).fill(8.3), [7])).toEqual(at(1.25));
  });
  it("climbs back only with room to spare", () => {
    // 1.25 → 1.5 costs 1.44 times as much: 2 ms becomes about 2.9 ms.
    expect(governor(16.7, 1.25).frames(Array(20).fill(16.7), [2])).toEqual(
      at(1.5),
    );
    // 5.5 ms would become 7.9 ms: too close to stepping down again.
    expect(governor(16.7, 1.25).frames(Array(20).fill(16.7), [5.5])).toBeNull();
  });
  it("ignores the settling second after a mount or a change", () => {
    const { judge, frames } = governor(16.7);
    judge.applied(at(1.25), 1000);
    expect(frames(Array(10).fill(16.7), [20])).toBeNull();
  });
  it("stops changing after a few changes in one visit", () => {
    const judge = createResolutionGovernor({
      steps: full(levels),
      step: at(1.5),
      frameMs: 16.7,
      now: 0,
      samples: 1,
      settleMs: 0,
      maxChanges: 2,
    });
    judge.recordGpu(30, 1);
    judge.applied(at(1.25), 1);
    judge.recordGpu(1, 2);
    judge.applied(at(1.5), 2);
    judge.recordGpu(30, 3);
    expect(judge.proposal()).toBeNull();
  });
});

describe("desk resolution without a GPU timer", () => {
  it("steps down when moving frames are slow", () => {
    expect(governor(16.7).frames(Array(12).fill(25))).toEqual(at(1.25));
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
  it("starts a return visit at the step it settled on", () => {
    rememberStep(at(1.25));
    expect(rememberedLevel(levels)).toBe(1.25);
    expect(rememberedLevel([1])).toBeNull();
    expect(rememberedStep(full(levels))).toEqual(at(1.25));
  });
  it("remembers a pace, on a display that has it", () => {
    rememberStep(at(1, 2));
    const fast = resolutionSteps([1.5, 1.25, 1], 1000 / 120);
    expect(rememberedStep(fast)).toEqual(at(1, 2));
    expect(rememberedStep(full(levels))).toBeNull();
  });
  it("reads a level remembered before paces were", () => {
    localStorage.setItem(
      "portfolio:desk-resolution",
      JSON.stringify({ level: 1, at: Date.now() }),
    );
    expect(rememberedStep(full(levels))).toEqual(at(1));
  });
  it("forgets after a week", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    rememberStep(at(1));
    vi.setSystemTime(8 * 24 * 60 * 60 * 1000);
    expect(rememberedLevel(levels)).toBeNull();
  });
  it("ignores storage it cannot read", () => {
    localStorage.setItem("portfolio:desk-resolution", "{");
    expect(rememberedLevel(levels)).toBeNull();
  });
});

describe("desk steps on a fast display", () => {
  const fast = 1000 / 120;
  it("are the levels alone up to about 100 Hz", () => {
    expect(resolutionSteps([1.5, 1.25, 1, 0.85], 1000 / 60)).toEqual(
      full([1.5, 1.25, 1, 0.85]),
    );
  });
  it("give up density to one pixel, then the pace, then density again", () => {
    expect(resolutionSteps([1.5, 1.25, 1, 0.85], fast)).toEqual([
      at(1.5),
      at(1.25),
      at(1),
      at(1.5, 2),
      at(1.25, 2),
      at(1, 2),
      at(0.85, 2),
    ]);
  });
  it("hold a pace the visitor chose", () => {
    expect(resolutionSteps([1, 0.85], fast, 1)).toEqual(full([1, 0.85]));
    expect(resolutionSteps([1, 0.85], 1000 / 60, 2)).toEqual([
      at(1, 2),
      at(0.85, 2),
    ]);
  });
  it("start integrated graphics at the paced rate, others at the top", () => {
    const steps = resolutionSteps([1, 0.85, 0.75], fast);
    expect(firstStep(steps, true)).toEqual(at(1, 2));
    expect(firstStep(steps, false)).toEqual(at(1));
    expect(firstStep(full([1, 0.85]), true)).toEqual(at(1));
  });
});

describe("pacing a desk that cannot keep up", () => {
  const fast = 1000 / 120;
  const judge = (step: Step) =>
    createResolutionGovernor({
      steps: resolutionSteps([1.5, 1.25, 1, 0.85, 0.75], fast),
      step,
      frameMs: fast,
      now: 0,
      samples: 10,
      settleMs: 0,
    });
  it("steps down in density first while above one pixel", () => {
    const governor = judge(at(1.5));
    for (let i = 1; i <= 10; i++) governor.recordGpu(9, i);
    expect(governor.proposal()).toEqual(at(1.25));
  });
  it("then takes the pace at the densest level that fits", () => {
    const governor = judge(at(1));
    // 7 ms at 1, against 6.25 at full rate: 1.25 would take about 10.9 ms,
    // over 0.6 of a paced frame (10 ms); 1 fits.
    for (let i = 1; i <= 10; i++) governor.recordGpu(7, i);
    expect(governor.proposal()).toEqual(at(1, 2));
  });
  it("climbs in density at the slower pace when there is room", () => {
    const governor = judge(at(1, 2));
    for (let i = 1; i <= 10; i++) governor.recordGpu(1, i);
    expect(governor.proposal()).toEqual(at(1.25, 2));
  });
  it("goes below one pixel only at the slower pace", () => {
    const governor = judge(at(1));
    for (let i = 1; i <= 10; i++) governor.recordGpu(14, i);
    expect(governor.proposal()).toEqual(at(0.75, 2));
  });
  it("paces a desk that misses refreshes for any reason, at its density", () => {
    const governor = judge(at(1.5));
    let now = 0;
    // Every fourth frame lands a refresh late; the GPU has room.
    for (let i = 0; i < 12; i++) {
      governor.record((now += i % 4 === 3 ? 2 * fast : fast));
      governor.recordGpu(3, now);
    }
    expect(governor.proposal()).toEqual(at(1.5, 2));
  });
  it("keeps the pace for the visit once it slowed", () => {
    const governor = judge(at(1.5, 2));
    for (let i = 1; i <= 10; i++) governor.recordGpu(1, i);
    expect(governor.proposal()).toBeNull();
  });
  it("is strained only at the last step", () => {
    const governor = judge(at(0.75, 2));
    for (let i = 1; i <= 10; i++) governor.recordGpu(14, i);
    expect(governor.strained()).toBe(true);
  });
});
