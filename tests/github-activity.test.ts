import { describe, it, expect, vi } from "vitest";
import {
  busiestWeekday,
  fetchActivity,
  isStale,
  mapEvents,
  recordPush,
  refreshActivity,
  sharedReader,
  streaks,
  toYear,
  type ActivitySnapshot,
  type ActivityStore,
  type ActivityYear,
} from "../src/lib/github/activity-core";

const DAY = 86_400_000;
const NOW = Date.parse("2026-09-29T12:00:00Z");

function calendar(from: string, to: string, count: (date: string) => number) {
  const days = [];
  for (let t = Date.parse(from); t <= Date.parse(to); t += DAY) {
    const date = new Date(t).toISOString().slice(0, 10);
    days.push({ date, contributionCount: count(date) });
  }
  const weeks = [];
  for (let i = 0; i < days.length; i += 7)
    weeks.push({ contributionDays: days.slice(i, i + 7) });
  return {
    totalContributions: days.reduce(
      (sum, day) => sum + day.contributionCount,
      0,
    ),
    weeks,
  };
}
function collection(
  from: string,
  to: string,
  count = (d: string) => (d.endsWith("5") ? 2 : 0),
) {
  return {
    totalCommitContributions: 10,
    totalPullRequestContributions: 2,
    totalPullRequestReviewContributions: 1,
    totalIssueContributions: 0,
    restrictedContributionsCount: 7,
    contributionCalendar: calendar(from, to, count),
  };
}
const eventsBody = [
  {
    id: "1",
    type: "PushEvent",
    created_at: "2026-09-29T10:00:00Z",
    repo: { name: "onurerguden/onurerguden-portfolio" },
    payload: { size: 3, ref: "refs/heads/main" },
  },
  {
    id: "2",
    type: "PullRequestEvent",
    created_at: "2026-09-28T10:00:00Z",
    repo: { name: "onurerguden/TaskFoo" },
    payload: { action: "closed", number: 7, pull_request: { merged: true } },
  },
  {
    id: "3",
    type: "WatchEvent",
    created_at: "2026-09-27T10:00:00Z",
    repo: { name: "someone/else" },
    payload: {},
  },
  {
    id: "4",
    type: "PushEvent",
    created_at: "2026-09-27T10:00:00Z",
    repo: { name: "../../evil" },
    payload: { size: 1 },
  },
];

type Options = {
  graphqlError?: boolean;
  brokenYear?: number;
  eventsStatus?: number;
  rateLimited?: boolean;
};
function github(options: Options = {}) {
  return vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);
    if (url.includes("/events/public")) {
      if (options.eventsStatus === 304)
        return new Response(null, { status: 304 });
      return Response.json(eventsBody, { headers: { etag: '"e1"' } });
    }
    if (options.rateLimited)
      return new Response("", {
        status: 403,
        headers: {
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": String(NOW / 1000 + 600),
        },
      });
    const { query } = JSON.parse(String(init?.body)) as { query: string };
    if (options.graphqlError)
      return Response.json({
        data: { user: null },
        errors: [{ message: "nope" }],
      });
    if (query.includes("rolling:"))
      return Response.json({
        data: {
          user: {
            createdAt: "2024-03-01T00:00:00Z",
            rolling: collection("2025-09-28", "2026-09-29"),
            current: collection("2026-01-01", "2026-09-29"),
          },
        },
      });
    const user: Record<string, unknown> = {
      repositories: {
        nodes: [
          {
            languages: {
              edges: [
                { size: 300, node: { name: "Python" } },
                { size: 100, node: { name: "Java" } },
              ],
            },
          },
          {
            languages: { edges: [{ size: 600, node: { name: "TypeScript" } }] },
          },
        ],
      },
    };
    for (const year of [2024, 2025]) {
      const data = collection(`${year}-01-01`, `${year}-12-31`);
      if (year === options.brokenYear)
        data.contributionCalendar.totalContributions += 5;
      user[`y${year}`] = data;
    }
    return Response.json({ data: { user } });
  });
}

function memoryStore(): ActivityStore & { state: Record<string, unknown> } {
  const state: Record<string, unknown> = {
    snapshot: null,
    fetchedAt: 0,
    revision: 0,
    etag: null,
    lock: null,
    cooldown: false,
    dirty: false,
    backoff: 0,
    deliveries: new Set<string>(),
  };
  return {
    state,
    async read() {
      return {
        snapshot: state.snapshot as ActivitySnapshot | null,
        revision: state.revision as number,
        fetchedAt: state.fetchedAt as number,
        dirty: state.dirty as boolean,
      };
    },
    async commit(snapshot, fetchedAt, etag) {
      if (fetchedAt <= (state.fetchedAt as number)) return 0;
      state.snapshot = JSON.parse(JSON.stringify(snapshot));
      state.fetchedAt = fetchedAt;
      if (etag) state.etag = etag;
      state.revision = (state.revision as number) + 1;
      return state.revision as number;
    },
    async etag() {
      return state.etag as string | null;
    },
    async acquire(nonce) {
      if (state.lock) return false;
      state.lock = nonce;
      return true;
    },
    async release(nonce) {
      if (state.lock === nonce) state.lock = null;
    },
    async cooldown() {
      if (state.cooldown) return false;
      state.cooldown = true;
      return true;
    },
    async markDirty() {
      state.dirty = true;
    },
    async claim(delivery) {
      const seen = state.deliveries as Set<string>;
      if (seen.has(delivery)) return false;
      seen.add(delivery);
      return true;
    },
    async backoff(until) {
      if (until && until > (state.backoff as number)) state.backoff = until;
      return state.backoff as number;
    },
  };
}

describe("GitHub activity mapping", () => {
  it("turns GitHub's week grid into dense days within the range", () => {
    const year = toYear(
      2026,
      calendar("2025-12-28", "2026-01-10", () => 1),
      {
        from: "2026-01-01T00:00:00Z",
        to: "2026-01-05T00:00:00Z",
      },
    );
    expect(year.start).toBe("2026-01-01");
    expect(year.days).toEqual([1, 1, 1, 1, 1]);
    expect(year.total).toBe(5);
  });

  it("handles leap years", () => {
    const year = toYear(
      2024,
      calendar("2024-01-01", "2024-12-31", () => 1),
    );
    expect(year.days).toHaveLength(366);
  });

  it("counts streaks across year boundaries and forgives an unfinished today", () => {
    const y2025: ActivityYear = {
      year: 2025,
      start: "2025-12-29",
      days: [1, 1, 1],
      total: 3,
    };
    const y2026: ActivityYear = {
      year: 2026,
      start: "2026-01-01",
      days: [2, 0, 1, 1, 0],
      total: 4,
    };
    expect(streaks([y2025, y2026], "2026-01-05")).toEqual({
      current: 2,
      longest: 4,
      longestEnd: "2026-01-01",
    });
  });

  it("finds the busiest weekday", () => {
    // 2026-09-28 is a Monday.
    const year: ActivityYear = {
      year: 2026,
      start: "2026-09-27",
      days: [0, 5, 1],
      total: 6,
    };
    expect(busiestWeekday(year)).toBe(1);
    expect(busiestWeekday({ ...year, days: [0, 0, 0], total: 0 })).toBeNull();
  });

  it("keeps only public, well-formed events it can describe", () => {
    const events = mapEvents(eventsBody);
    expect(events.map((event) => event.kind)).toEqual(["push", "pull_request"]);
    expect(events[0]).toMatchObject({ commits: 3, branch: "main" });
    expect(events[1]).toMatchObject({ action: "merged", number: 7 });
  });

  it("keeps pushes, pull requests and releases from a mixed public feed", () => {
    const events = mapEvents([
      ...eventsBody,
      ...["repository", "branch", "tag"].map((ref_type, index) => ({
        id: String(5 + index),
        type: "CreateEvent",
        created_at: "2026-09-29T11:00:00Z",
        repo: { name: "onurerguden/TaskFoo" },
        payload: { ref_type, ref: "feature" },
      })),
      {
        id: "8",
        type: "ReleaseEvent",
        created_at: "2026-09-28T11:00:00Z",
        repo: { name: "onurerguden/TaskFoo" },
        payload: { release: { tag_name: "v1.0.0" } },
      },
    ]);
    expect(events.map((event) => event.kind)).toEqual([
      "push",
      "release",
      "pull_request",
    ]);
    expect(events[1]).toMatchObject({ id: "8", tag: "v1.0.0" });
  });

  it("filters creation events before applying the twelve-event limit", () => {
    const events = mapEvents([
      ...Array.from({ length: 18 }, (_, index) => ({
        id: String(index + 10),
        type: "CreateEvent",
        created_at: "2026-09-29T11:00:00Z",
        repo: { name: "onurerguden/TaskFoo" },
        payload: { ref_type: "branch", ref: `feature-${index}` },
      })),
      ...Array.from({ length: 13 }, (_, index) => ({
        id: String(index + 30),
        type: "PushEvent",
        created_at: "2026-09-29T10:00:00Z",
        repo: { name: "onurerguden/TaskFoo" },
        payload: { size: 1, ref: "refs/heads/main" },
      })),
    ]);
    expect(events).toHaveLength(12);
    expect(events.every((event) => event.kind === "push")).toBe(true);
    expect(events.map((event) => event.id)).toEqual(
      Array.from({ length: 12 }, (_, index) => String(index + 30)),
    );
  });

  it("selects the latest twelve events from an unordered feed and preserves ties", () => {
    const raw = Array.from({ length: 14 }, (_, index) => ({
      id: String(index + 1),
      type: "PushEvent",
      created_at: new Date(Date.UTC(2026, 8, index + 1)).toISOString(),
      repo: { name: "onurerguden/TaskFoo" },
      payload: { size: 1, ref: "refs/heads/main" },
    }));
    raw.splice(2, 0, { ...raw[13], id: "15" });
    const events = mapEvents(raw);
    expect(events).toHaveLength(12);
    expect(events.map((event) => event.id)).toEqual([
      "15",
      "14",
      "13",
      "12",
      "11",
      "10",
      "9",
      "8",
      "7",
      "6",
      "5",
      "4",
    ]);
  });
});

describe("GitHub activity refresh", () => {
  it("builds a complete snapshot with totals, streaks and languages", async () => {
    const fetcher = github();
    const { snapshot, etag } = await fetchActivity({
      token: "t",
      previous: null,
      etag: null,
      now: NOW,
      incremental: false,
      fetcher,
    });
    expect(snapshot.years.map((year) => year.year)).toEqual([2024, 2025, 2026]);
    expect(snapshot.allTime).toBe(
      snapshot.years.reduce((s, y) => s + y.total, 0),
    );
    expect(snapshot.rolling).toMatchObject({ commits: 10, restricted: 7 });
    expect(snapshot.languages[0]).toEqual({ name: "TypeScript", share: 60 });
    expect(snapshot.events).toHaveLength(2);
    expect(etag).toBe('"e1"');
    // The token only ever goes to GitHub.
    for (const [input, init] of fetcher.mock.calls) {
      expect(String(input)).toMatch(/^https:\/\/api\.github\.com\//);
      expect(init?.redirect).toBe("error");
    }
  });

  it("re-reads only the recent calendar when earlier years are known", async () => {
    const first = await fetchActivity({
      token: "t",
      previous: null,
      etag: null,
      now: NOW,
      incremental: false,
      fetcher: github(),
    });
    const fetcher = github({ eventsStatus: 304 });
    const second = await fetchActivity({
      token: "t",
      previous: first.snapshot,
      etag: '"e1"',
      now: NOW + 60_000,
      fetcher,
    });
    const graphqlCalls = fetcher.mock.calls.filter(([input]) =>
      String(input).endsWith("/graphql"),
    );
    expect(graphqlCalls).toHaveLength(1);
    // A 304 keeps the previous events at no rate-limit cost.
    expect(second.snapshot.events).toEqual(first.snapshot.events);
    expect(second.snapshot.years.map((y) => y.year)).toEqual([
      2024, 2025, 2026,
    ]);
  });

  it("treats a GraphQL error inside HTTP 200 as a failure", async () => {
    await expect(
      fetchActivity({
        token: "t",
        previous: null,
        etag: null,
        now: NOW,
        fetcher: github({ graphqlError: true }),
      }),
    ).rejects.toThrow("query failed");
  });

  it("never commits a year whose days disagree with GitHub's total", async () => {
    const store = memoryStore();
    await expect(
      refreshActivity({
        store,
        token: "t",
        full: true,
        now: NOW,
        fetcher: github({ brokenYear: 2025 }),
      }),
    ).rejects.toThrow("Incomplete calendar");
    expect(store.state.snapshot).toBeNull();
    expect(store.state.lock).toBeNull();
  });

  it("commits once, then respects the cooldown and the lock", async () => {
    const store = memoryStore();
    expect(
      await refreshActivity({
        store,
        token: "t",
        full: true,
        now: NOW,
        fetcher: github(),
      }),
    ).toBe("committed");
    expect(store.state.revision).toBe(1);
    expect(
      await refreshActivity({
        store,
        token: "t",
        now: NOW + 1000,
        fetcher: github(),
      }),
    ).toBe("skipped");
    store.state.lock = "other-worker";
    expect(
      await refreshActivity({
        store,
        token: "t",
        force: true,
        now: NOW + 2000,
        fetcher: github(),
      }),
    ).toBe("skipped");
  });

  it("refreshes once per push delivery, however often it arrives", async () => {
    const store = memoryStore();
    const fetcher = vi.fn(github());
    const push = () =>
      recordPush({ store, token: "t", delivery: "d-1", fetcher });
    expect(await push()).toBe("committed");
    const calls = fetcher.mock.calls.length;
    store.state.cooldown = false;
    store.state.dirty = false;
    expect(await push()).toBe("duplicate");
    expect(fetcher).toHaveBeenCalledTimes(calls);
    // A replay still leaves reads eager, which costs nothing.
    expect(store.state.dirty).toBe(true);
  });

  it("rejects an older fetch that finishes after a newer one", async () => {
    const store = memoryStore();
    await refreshActivity({
      store,
      token: "t",
      full: true,
      now: NOW,
      fetcher: github(),
    });
    expect(
      await refreshActivity({
        store,
        token: "t",
        full: true,
        force: true,
        now: NOW - 5000,
        fetcher: github(),
      }),
    ).toBe("stale");
    expect(store.state.fetchedAt).toBe(NOW);
  });

  it("persists GitHub's rate-limit backoff and waits for it", async () => {
    const store = memoryStore();
    await expect(
      refreshActivity({
        store,
        token: "t",
        full: true,
        force: true,
        now: NOW,
        fetcher: github({ rateLimited: true }),
      }),
    ).rejects.toThrow("rate limit");
    expect(store.state.backoff).toBeGreaterThan(Date.now());
    expect(
      await refreshActivity({
        store,
        token: "t",
        force: true,
        now: Date.now(),
        fetcher: github(),
      }),
    ).toBe("skipped");
  });

  it("refreshes stale data sooner after a push", () => {
    const snapshot = {} as ActivitySnapshot;
    expect(isStale({ snapshot: null, fetchedAt: 0, dirty: false }, NOW)).toBe(
      true,
    );
    expect(
      isStale({ snapshot, fetchedAt: NOW - 5 * 60_000, dirty: false }, NOW),
    ).toBe(false);
    expect(
      isStale({ snapshot, fetchedAt: NOW - 11 * 60_000, dirty: false }, NOW),
    ).toBe(true);
    expect(
      isStale({ snapshot, fetchedAt: NOW - 2 * 60_000, dirty: true }, NOW),
    ).toBe(true);
  });
});

describe("shared activity reads", () => {
  it("makes one read for concurrent callers and reuses it for a minute", async () => {
    let now = 0;
    const read = vi.fn(async () => ({ n: read.mock.calls.length }));
    const shared = sharedReader(read, 60_000, () => now);
    const [a, b] = await Promise.all([shared.read(), shared.read()]);
    expect(read).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    now = 59_999;
    await shared.read();
    expect(read).toHaveBeenCalledTimes(1);
    now = 60_000;
    await shared.read();
    expect(read).toHaveBeenCalledTimes(2);
    shared.clear();
    await shared.read();
    expect(read).toHaveBeenCalledTimes(3);
  });
  it("drops a failed read so the next caller tries again", async () => {
    const read = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValueOnce("ok");
    const shared = sharedReader(read, 60_000, () => 0);
    await expect(shared.read()).rejects.toThrow("down");
    await expect(shared.read()).resolves.toBe("ok");
    expect(read).toHaveBeenCalledTimes(2);
  });
});
