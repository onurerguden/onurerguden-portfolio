import { describe, it, expect } from "vitest";
import { heatLevels, levelOf, weekColumns } from "../src/lib/activity-view";

describe("contribution heatmap", () => {
  it("spreads non-empty days over four levels", () => {
    const thresholds = heatLevels([0, 1, 2, 3, 4, 5, 6, 7, 8, 0]);
    expect(levelOf(0, thresholds)).toBe(0);
    expect(levelOf(1, thresholds)).toBe(1);
    expect(levelOf(8, thresholds)).toBe(4);
  });
  it("keeps an empty year at level zero", () => {
    expect(levelOf(0, heatLevels([0, 0, 0]))).toBe(0);
  });
  it("lays out Sunday-first week columns with padding", () => {
    // 2026-01-01 is a Thursday.
    const weeks = weekColumns({
      year: 2026,
      start: "2026-01-01",
      days: [1, 2, 3, 4],
      total: 10,
    });
    expect(weeks).toHaveLength(2);
    expect(weeks[0].slice(0, 4)).toEqual([null, null, null, null]);
    expect(weeks[0][4]?.date).toBe("2026-01-01");
    expect(weeks[1][0]?.date).toBe("2026-01-04");
    expect(weeks[1].slice(1)).toEqual([null, null, null, null, null, null]);
  });
});
