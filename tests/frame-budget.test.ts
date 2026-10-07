import { describe, expect, it } from "vitest";
import { createFrameBudget } from "../src/lib/desk-story/frame-budget";

function run(intervals: number[]) {
  const budget = createFrameBudget({ samples: 10 });
  let now = 0;
  const verdicts = [budget.record(now)];
  for (const interval of intervals)
    verdicts.push(budget.record((now += interval)));
  return verdicts;
}

describe("desk frame budget", () => {
  it("keeps full resolution at a smooth frame rate", () => {
    expect(run(Array(40).fill(16.7))).not.toContain(true);
  });
  it("steps down once when moving frames are slow", () => {
    const verdicts = run(Array(40).fill(40));
    expect(verdicts.filter(Boolean)).toHaveLength(1);
    expect(verdicts.indexOf(true)).toBe(10);
  });
  it("ignores idle gaps between demand-rendered frames", () => {
    const intervals = Array.from({ length: 40 }, (_, i) => (i % 2 ? 16 : 500));
    expect(run(intervals)).not.toContain(true);
  });
  it("tolerates a few long frames among smooth ones", () => {
    const intervals = Array.from({ length: 40 }, (_, i) => (i % 5 ? 16 : 60));
    expect(run(intervals)).not.toContain(true);
  });
});
