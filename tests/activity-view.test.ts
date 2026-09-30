import { describe, it, expect } from "vitest";
import {
  countFrom,
  heatScale,
  isFairBaseline,
  latestCell,
  monthSpans,
  newContributions,
  nextCell,
  parseSnapshot,
  weekColumns,
} from "../src/lib/activity-view";
import type { ActivitySnapshot } from "../src/lib/github/activity-core";

function snapshot(): ActivitySnapshot {
  const year = { year: 2026, start: "2026-01-01", days: [1, 0, 2], total: 3 };
  return {
    version: 1,
    syncedAt: "2026-01-03T10:00:00.000Z",
    rolling: {
      ...year,
      commits: 2,
      pullRequests: 1,
      reviews: 0,
      issues: 0,
      restricted: 0,
    },
    years: [year],
    allTime: 3,
    streaks: { current: 1, longest: 1, longestEnd: "2026-01-03" },
    busiestWeekday: 6,
    languages: [{ name: "Python", share: 100 }],
    events: [
      {
        id: "1",
        kind: "push",
        repo: "onurerguden/portfolio",
        at: "2026-01-03T09:00:00Z",
        commits: 2,
        branch: "main",
      },
    ],
  };
}

describe("new contributions since the visitor arrived", () => {
  /** A snapshot whose rolling calendar holds `days` from 2026-01-01. */
  const at = (days: number[], syncedAt = "2026-01-03T10:00:00.000Z") => {
    const base = snapshot();
    const total = days.reduce((sum, count) => sum + count, 0);
    return {
      ...base,
      syncedAt,
      rolling: { ...base.rolling, days, total },
    };
  };

  it("counts a calendar from a given day on", () => {
    const year = { year: 2026, start: "2026-01-01", days: [4, 1, 2], total: 7 };
    expect(countFrom(year, "2026-01-02")).toBe(3);
    expect(countFrom(year, "2025-12-01")).toBe(7);
    expect(countFrom(year, "2026-02-01")).toBe(0);
  });
  it("counts what appeared on the last day and after", () => {
    expect(newContributions(at([1, 0, 2]), at([1, 0, 5]))).toBe(3);
    // A new day began while the page was open.
    expect(newContributions(at([1, 0, 2]), at([1, 0, 2, 4]))).toBe(4);
  });
  it("ignores revisions to earlier days", () => {
    expect(newContributions(at([1, 0, 2]), at([9, 7, 2]))).toBe(0);
    expect(newContributions(at([1, 0, 2]), at([0, 0, 1]))).toBe(0);
  });
  it("only starts from a snapshot synced around the visit", () => {
    const arrived = Date.parse("2026-01-03T10:05:00.000Z");
    expect(isFairBaseline(at([1]), arrived)).toBe(true);
    const old = at([1], "2026-01-03T09:00:00.000Z");
    expect(isFairBaseline(old, arrived)).toBe(false);
  });
});

describe("activity snapshots from the network", () => {
  it("accepts a well-formed snapshot", () => {
    expect(parseSnapshot(snapshot())).toEqual(snapshot());
  });
  it("rejects other versions and broken shapes", () => {
    expect(parseSnapshot(null)).toBeNull();
    expect(parseSnapshot({ available: false })).toBeNull();
    expect(parseSnapshot({ ...snapshot(), version: 2 })).toBeNull();
    expect(parseSnapshot({ ...snapshot(), syncedAt: "soon" })).toBeNull();
    expect(
      parseSnapshot({ ...snapshot(), years: [{ year: 2026 }] }),
    ).toBeNull();
    const rolling = { ...snapshot().rolling, total: -1 };
    expect(parseSnapshot({ ...snapshot(), rolling })).toBeNull();
    expect(parseSnapshot({ ...snapshot(), busiestWeekday: 7 })).toBeNull();
  });
  it("drops events it can't render and keeps the rest", () => {
    const base = snapshot();
    const parsed = parseSnapshot({
      ...base,
      events: [
        ...base.events,
        { ...base.events[0], id: "2", at: "not a date" },
        { ...base.events[0], id: "3", kind: "star" },
        { ...base.events[0], id: "4", repo: "no-slash" },
      ],
    });
    expect(parsed?.events.map((event) => event.id)).toEqual(["1"]);
  });
});

describe("contribution heatmap", () => {
  it("spreads non-empty days over four levels", () => {
    const level = heatScale([0, 1, 2, 3, 4, 5, 6, 7, 8, 0]);
    expect([0, 1, 4, 6, 8].map(level)).toEqual([0, 1, 2, 3, 4]);
  });
  it("gives the busiest day the darkest level in a sparse year", () => {
    expect(heatScale([0, 5, 0])(5)).toBe(4);
    const ties = heatScale([1, 1, 1, 2, 2]);
    expect([1, 2].map(ties)).toEqual([1, 4]);
  });
  it("keeps an empty year at level zero", () => {
    expect(heatScale([0, 0, 0])(0)).toBe(0);
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

describe("heatmap layout and keyboard", () => {
  // 2025-12-31 is a Wednesday; the calendar runs to Thursday 2026-03-05.
  const weeks = weekColumns({
    year: 2026,
    start: "2025-12-31",
    days: Array.from({ length: 65 }, () => 1),
    total: 65,
  });

  it("labels months across the weeks they span", () => {
    const spans = monthSpans(weeks);
    expect(spans.reduce((sum, month) => sum + month.span, 0)).toBe(
      weeks.length,
    );
    expect(spans.map((month) => month.date)).toEqual([
      "2026-01-01",
      "2026-02-01",
      // March has one week in view: no room for a label.
      null,
    ]);
  });
  it("keeps up and down within the week and stops at padding", () => {
    const last = weeks.length - 1;
    // Thursday 5 March is the last day; Friday is padding.
    expect(weeks[last][4]?.date).toBe("2026-03-05");
    expect(nextCell(weeks, { week: last, day: 4 }, "ArrowDown")).toBeNull();
    expect(nextCell(weeks, { week: last, day: 4 }, "ArrowUp")).toEqual({
      week: last,
      day: 3,
    });
    expect(nextCell(weeks, { week: 1, day: 0 }, "ArrowUp")).toBeNull();
  });
  it("moves along the row and steps back over padding", () => {
    const last = weeks.length - 1;
    // Saturday of the last week is padding: End lands a week earlier.
    expect(nextCell(weeks, { week: 3, day: 6 }, "End")).toEqual({
      week: last - 1,
      day: 6,
    });
    // Sunday of the first week is padding: Home stays on week 1.
    expect(nextCell(weeks, { week: 1, day: 0 }, "Home")).toBeNull();
    expect(nextCell(weeks, { week: 1, day: 0 }, "ArrowLeft")).toBeNull();
    expect(nextCell(weeks, { week: 1, day: 3 }, "ArrowLeft")).toEqual({
      week: 0,
      day: 3,
    });
    expect(nextCell(weeks, { week: 1, day: 3 }, "PageDown")).toEqual({
      week: 5,
      day: 3,
    });
    expect(latestCell(weeks)).toEqual({ week: last, day: 4 });
  });
});
