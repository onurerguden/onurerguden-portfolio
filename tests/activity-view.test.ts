import { describe, it, expect } from "vitest";
import {
  countFrom,
  describeEvent,
  heatScale,
  isFairBaseline,
  latestCell,
  monthSpans,
  newContributions,
  nextCell,
  parseSnapshot,
  recentEvents,
  shortEventAction,
  timeAgo,
  topLanguages,
  weekColumns,
} from "../src/lib/activity-view";
import type {
  ActivityEvent,
  ActivitySnapshot,
} from "../src/lib/github/activity-core";

describe("activity wording", () => {
  const base = { id: "1", repo: "onurerguden/portfolio", at: "2026-01-01" };
  const both = (event: ActivityEvent) =>
    [describeEvent(event, "en"), describeEvent(event, "tr")] as const;

  it("names branches and tags only when GitHub gives the name", () => {
    expect(
      both({ ...base, kind: "create", ref: "branch", name: "feat/x" }),
    ).toEqual([
      "Created branch feat/x in portfolio",
      "portfolio deposunda feat/x dalını oluşturdum",
    ]);
    expect(both({ ...base, kind: "create", ref: "tag", name: null })).toEqual([
      "Created a tag in portfolio",
      "portfolio deposunda yeni bir etiket oluşturdum",
    ]);
  });
  it("leaves out unknown commit counts and pull request numbers", () => {
    expect(
      both({ ...base, kind: "push", commits: null, branch: null }),
    ).toEqual(["Pushed to portfolio", "portfolio deposuna gönderim yaptım"]);
    expect(both({ ...base, kind: "push", commits: 1, branch: "main" })[0]).toBe(
      "Pushed 1 commit to portfolio",
    );
    expect(
      both({ ...base, kind: "pull_request", action: "merged", number: 0 }),
    ).toEqual([
      "Merged a pull request in portfolio",
      "portfolio deposunda bir pull request birleştirdim",
    ]);
  });
  it("never says a time is in the future", () => {
    const now = Date.parse("2026-01-01T12:00:00Z");
    expect(timeAgo(now + 2 * 60_000, now, "en")).toBe("just now");
    expect(timeAgo(now + 2 * 60_000, now, "tr")).toBe("az önce");
    expect(timeAgo(now - 5 * 60_000, now, "en")).toBe("5 minutes ago");
    expect(timeAgo(now - 3 * 3_600_000, now, "tr")).toBe("3 saat önce");
    expect(timeAgo(now - 3 * 86_400_000, now, "en")).toBe("3 days ago");
  });
});

describe("compact public activity", () => {
  const base = { repo: "onurerguden/portfolio", at: "2026-01-03T09:00:00Z" };

  it("selects the newest three useful events from mixed, unordered snapshots", () => {
    const events: ActivityEvent[] = [
      {
        ...base,
        id: "old",
        at: "2026-01-01T09:00:00Z",
        kind: "push",
        commits: 1,
        branch: null,
      },
      {
        ...base,
        id: "branch",
        at: "2026-01-04T09:00:00Z",
        kind: "create",
        ref: "branch",
        name: "feature",
      },
      { ...base, id: "pr", kind: "pull_request", action: "merged", number: 7 },
      {
        ...base,
        id: "release",
        at: "2026-01-02T09:00:00Z",
        kind: "release",
        tag: "v1.0",
      },
      {
        ...base,
        id: "push",
        at: "2026-01-03T10:00:00Z",
        kind: "push",
        commits: 3,
        branch: "main",
      },
    ];
    const order = events.map((event) => event.id);
    const selected = recentEvents(events);
    expect(selected.map((event) => event.id)).toEqual([
      "push",
      "pr",
      "release",
    ]);
    expect(events.map((event) => event.id)).toEqual(order);
    // The seen watermark comes from the rendered list, not a hidden branch.
    expect(selected[0].at).toBe("2026-01-03T10:00:00Z");
  });

  it("preserves source order for tied times and handles fewer than three updates", () => {
    const events: ActivityEvent[] = [
      { ...base, id: "first", kind: "push", commits: null, branch: null },
      { ...base, id: "second", kind: "release", tag: null },
    ];
    expect(recentEvents(events).map((event) => event.id)).toEqual([
      "first",
      "second",
    ]);
    expect(recentEvents([])).toEqual([]);
    expect(
      recentEvents([
        { ...base, id: "tag", kind: "create", ref: "tag", name: "v2" },
      ]),
    ).toEqual([]);
  });

  it("keeps the actual top language shares without renormalizing or mutating them", () => {
    const languages = [
      { name: "Java", share: 12.5 },
      { name: "Python", share: 48.5 },
      { name: "TypeScript", share: 30 },
      { name: "Shell", share: 4 },
    ];
    expect(topLanguages(languages)).toEqual([
      { name: "Python", share: 48.5 },
      { name: "TypeScript", share: 30 },
      { name: "Java", share: 12.5 },
    ]);
    expect(languages[0].name).toBe("Java");
    expect(topLanguages([])).toEqual([]);
  });

  it("preserves language order for tied shares", () => {
    const languages = [
      { name: "Python", share: 40 },
      { name: "TypeScript", share: 40 },
    ];
    expect(topLanguages(languages)).toEqual(languages);
  });

  it("uses compact bilingual actions without inventing unknown details", () => {
    const push = {
      ...base,
      id: "push",
      kind: "push" as const,
      commits: null,
      branch: null,
    };
    expect(shortEventAction(push, "en")).toBe("Pushed");
    expect(shortEventAction(push, "tr")).toBe("Gönderim yaptım");
    expect(shortEventAction({ ...push, commits: 1 }, "en")).toBe(
      "Pushed 1 commit",
    );
    expect(shortEventAction({ ...push, commits: 3 }, "tr")).toBe(
      "3 commit gönderdim",
    );
    expect(
      shortEventAction(
        {
          ...base,
          id: "pr",
          kind: "pull_request",
          action: "merged",
          number: 7,
        },
        "en",
      ),
    ).toBe("Merged a PR");
    expect(
      shortEventAction(
        { ...base, id: "release", kind: "release", tag: null },
        "tr",
      ),
    ).toBe("Bir sürüm yayımladım");
    expect(
      shortEventAction(
        { ...base, id: "release", kind: "release", tag: "v1.0" },
        "en",
      ),
    ).toBe("Released v1.0");
  });
});

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
