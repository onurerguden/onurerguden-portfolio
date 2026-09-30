import { z } from "zod";
import { OWNER } from "./core";

/**
 * GitHub activity for the home page: contribution calendars per year, totals,
 * streaks, the language mix and recent public events. Everything stored here
 * is public; per-repository detail of private work is never requested.
 */
export type ActivityYear = {
  year: number;
  /** First day of `days`, YYYY-MM-DD. */
  start: string;
  days: number[];
  total: number;
};
export type ActivityEvent = {
  id: string;
  repo: string;
  at: string;
} & (
  | { kind: "push"; commits: number | null; branch: string | null }
  | {
      kind: "pull_request";
      action: "opened" | "merged" | "closed" | "reopened";
      number: number;
    }
  | {
      kind: "create";
      ref: "repository" | "branch" | "tag";
      name: string | null;
    }
  | { kind: "release"; tag: string | null }
);
export type ActivitySnapshot = {
  version: 1;
  syncedAt: string;
  /** The last 12 months as GitHub's own calendar shows them. */
  rolling: ActivityYear & {
    commits: number;
    pullRequests: number;
    reviews: number;
    issues: number;
    /** Contributions to private repositories, counted without detail. */
    restricted: number;
  };
  years: ActivityYear[];
  allTime: number;
  streaks: { current: number; longest: number; longestEnd: string | null };
  /** 0 is Sunday. */
  busiestWeekday: number | null;
  languages: { name: string; share: number }[];
  events: ActivityEvent[];
};

export interface ActivityStore {
  read(): Promise<{
    snapshot: ActivitySnapshot | null;
    revision: number;
    fetchedAt: number;
    dirty: boolean;
  }>;
  /** Writes only if `fetchedAt` is newer than the stored one; returns the revision or 0. */
  commit(
    snapshot: ActivitySnapshot,
    fetchedAt: number,
    etag: string | null,
  ): Promise<number>;
  etag(): Promise<string | null>;
  acquire(nonce: string): Promise<boolean>;
  release(nonce: string): Promise<void>;
  /** True if no refresh was started in the last two minutes (and claims the slot). */
  cooldown(): Promise<boolean>;
  markDirty(): Promise<void>;
  backoff(until?: number): Promise<number>;
}

const GRAPHQL = "https://api.github.com/graphql";
const DAY = 86_400_000;

const calendarSchema = z.object({
  totalContributions: z.number().int().nonnegative(),
  weeks: z.array(
    z.object({
      contributionDays: z.array(
        z.object({
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          contributionCount: z.number().int().nonnegative(),
        }),
      ),
    }),
  ),
});
const collectionSchema = z.object({
  totalCommitContributions: z.number().int().nonnegative(),
  totalPullRequestContributions: z.number().int().nonnegative(),
  totalPullRequestReviewContributions: z.number().int().nonnegative(),
  totalIssueContributions: z.number().int().nonnegative(),
  restrictedContributionsCount: z.number().int().nonnegative(),
  contributionCalendar: calendarSchema,
});
const languagesSchema = z.object({
  nodes: z.array(
    z.object({
      languages: z.object({
        edges: z.array(
          z.object({
            size: z.number().int().nonnegative(),
            node: z.object({ name: z.string().min(1) }),
          }),
        ),
      }),
    }),
  ),
});

const COLLECTION = `totalCommitContributions totalPullRequestContributions totalPullRequestReviewContributions totalIssueContributions restrictedContributionsCount contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }`;

const iso = (time: number) => new Date(time).toISOString();
const yearRange = (year: number, now: number) => ({
  from: `${year}-01-01T00:00:00Z`,
  to: iso(Math.min(Date.UTC(year + 1, 0, 1) - 1000, now)),
});

export class ActivityError extends Error {
  constructor(
    message: string,
    readonly retryAt?: number,
  ) {
    super(message);
  }
}

async function graphql(
  query: string,
  token: string,
  fetcher: typeof fetch,
): Promise<Record<string, unknown>> {
  const response = await fetcher(GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "onurerguden-portfolio",
    },
    body: JSON.stringify({ query, variables: { login: OWNER } }),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(8000),
  });
  rateLimit(response);
  if (!response.ok) throw new ActivityError("GitHub activity unavailable");
  const body = (await response.json()) as {
    data?: { user?: Record<string, unknown> | null };
    errors?: unknown[];
  };
  // GraphQL reports many failures with HTTP 200.
  if (body.errors?.length || !body.data?.user)
    throw new ActivityError("GitHub activity query failed");
  return body.data.user;
}

function rateLimit(response: Response) {
  const remaining = response.headers.get("x-ratelimit-remaining");
  const reset = Number(response.headers.get("x-ratelimit-reset"));
  const retryAfter = Number(response.headers.get("retry-after"));
  if (response.status === 403 || response.status === 429 || remaining === "0") {
    const retryAt = retryAfter
      ? Date.now() + retryAfter * 1000
      : reset
        ? reset * 1000
        : Date.now() + 60_000;
    throw new ActivityError(
      "GitHub rate limit",
      Math.max(retryAt, Date.now() + 60_000),
    );
  }
}

/** Dense day counts from GitHub's week grid, restricted to [from, to]. */
export function toYear(
  year: number,
  calendar: z.infer<typeof calendarSchema>,
  bounds?: { from: string; to: string },
): ActivityYear {
  const days = calendar.weeks
    .flatMap((week) => week.contributionDays)
    .filter(
      (day) =>
        !bounds ||
        (day.date >= bounds.from.slice(0, 10) &&
          day.date <= bounds.to.slice(0, 10)),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!days.length) return { year, start: `${year}-01-01`, days: [], total: 0 };
  // Fill any gap so index i is always start + i days.
  const start = Date.parse(days[0].date);
  const end = Date.parse(days[days.length - 1].date);
  const dense = Array.from({ length: (end - start) / DAY + 1 }, () => 0);
  for (const day of days)
    dense[(Date.parse(day.date) - start) / DAY] = day.contributionCount;
  return {
    year,
    start: days[0].date,
    days: dense,
    total: dense.reduce((sum, count) => sum + count, 0),
  };
}

/** Daily counts across all years, keyed by date, oldest first. */
function allDays(years: ActivityYear[]) {
  const map = new Map<string, number>();
  for (const year of years)
    year.days.forEach((count, i) =>
      map.set(iso(Date.parse(year.start) + i * DAY).slice(0, 10), count),
    );
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function streaks(years: ActivityYear[], today: string) {
  const days = allDays(years);
  let longest = 0;
  let longestEnd: string | null = null;
  let run = 0;
  let previous: number | null = null;
  for (const [date, count] of days) {
    const time = Date.parse(date);
    if (previous !== null && time - previous !== DAY) run = 0;
    run = count > 0 ? run + 1 : 0;
    if (run > longest) {
      longest = run;
      longestEnd = date;
    }
    previous = time;
  }
  // The current streak may end yesterday: today is not over yet.
  const counts = new Map(days);
  let current = 0;
  let cursor = Date.parse(today);
  if (!counts.get(today)) cursor -= DAY;
  while ((counts.get(iso(cursor).slice(0, 10)) ?? 0) > 0) {
    current++;
    cursor -= DAY;
  }
  return { current, longest, longestEnd };
}

export function busiestWeekday(year: ActivityYear) {
  const totals = Array.from({ length: 7 }, () => 0);
  year.days.forEach((count, i) => {
    totals[new Date(Date.parse(year.start) + i * DAY).getUTCDay()] += count;
  });
  const max = Math.max(...totals);
  return max > 0 ? totals.indexOf(max) : null;
}

export function languageShares(data: z.infer<typeof languagesSchema>) {
  const sizes = new Map<string, number>();
  for (const repo of data.nodes)
    for (const edge of repo.languages.edges)
      sizes.set(edge.node.name, (sizes.get(edge.node.name) ?? 0) + edge.size);
  const total = [...sizes.values()].reduce((sum, size) => sum + size, 0);
  if (!total) return [];
  return [...sizes.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([name, size]) => ({
      name,
      share: Math.round((size / total) * 1000) / 10,
    }));
}

const eventSchema = z.object({
  id: z.string().regex(/^\d+$/),
  type: z.string(),
  created_at: z.string(),
  repo: z.object({ name: z.string().regex(/^[\w.-]+\/[\w.-]+$/) }),
  payload: z.record(z.string(), z.unknown()),
});

/** Keeps pushes, pull requests, new repositories/branches/tags and releases. */
export function mapEvents(raw: unknown): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  for (const item of z.array(z.unknown()).parse(raw)) {
    const parsed = eventSchema.safeParse(item);
    if (!parsed.success) continue;
    const { id, type, created_at: at, repo, payload } = parsed.data;
    const base = { id, repo: repo.name, at };
    const text = (value: unknown) => (typeof value === "string" ? value : null);
    if (type === "PushEvent") {
      const size = payload.size ?? payload.distinct_size;
      events.push({
        ...base,
        kind: "push",
        commits: typeof size === "number" ? size : null,
        branch: text(payload.ref)?.replace(/^refs\/heads\//, "") ?? null,
      });
    } else if (type === "PullRequestEvent") {
      const pr = (payload.pull_request ?? {}) as { merged?: boolean };
      const action =
        payload.action === "closed" && pr.merged ? "merged" : payload.action;
      if (
        action === "opened" ||
        action === "merged" ||
        action === "closed" ||
        action === "reopened"
      )
        events.push({
          ...base,
          kind: "pull_request",
          action,
          number: typeof payload.number === "number" ? payload.number : 0,
        });
    } else if (type === "CreateEvent") {
      const ref = payload.ref_type;
      if (ref === "repository" || ref === "branch" || ref === "tag")
        events.push({ ...base, kind: "create", ref, name: text(payload.ref) });
    } else if (type === "ReleaseEvent") {
      const release = (payload.release ?? {}) as { tag_name?: unknown };
      events.push({ ...base, kind: "release", tag: text(release.tag_name) });
    }
  }
  return events.slice(0, 12);
}

async function fetchEvents(
  token: string,
  etag: string | null,
  fetcher: typeof fetch,
): Promise<{ events: ActivityEvent[] | null; etag: string | null }> {
  const response = await fetcher(
    `https://api.github.com/users/${OWNER}/events/public?per_page=30`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "onurerguden-portfolio",
        ...(etag ? { "If-None-Match": etag } : {}),
      },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(6000),
    },
  );
  // Unchanged events cost nothing against the rate limit.
  if (response.status === 304) return { events: null, etag };
  rateLimit(response);
  if (!response.ok) throw new ActivityError("GitHub events unavailable");
  return {
    events: mapEvents(await response.json()),
    etag: response.headers.get("etag"),
  };
}

/**
 * Fetches a fresh snapshot. `incremental` re-reads only the last 12 months
 * and the current year, keeping earlier years from `previous`.
 */
export async function fetchActivity({
  token,
  previous,
  etag,
  now = Date.now(),
  incremental = true,
  fetcher = fetch,
}: {
  token: string;
  previous: ActivitySnapshot | null;
  etag: string | null;
  now?: number;
  incremental?: boolean;
  fetcher?: typeof fetch;
}): Promise<{ snapshot: ActivitySnapshot; etag: string | null }> {
  const currentYear = new Date(now).getUTCFullYear();
  const current = yearRange(currentYear, now);
  const first = await graphql(
    `query($login: String!) { user(login: $login) { createdAt rolling: contributionsCollection { ${COLLECTION} } current: contributionsCollection(from: "${current.from}", to: "${current.to}") { ${COLLECTION} } } }`,
    token,
    fetcher,
  );
  const createdAt = z.string().parse(first.createdAt);
  const rolling = collectionSchema.parse(first.rolling);
  const thisYear = toYear(
    currentYear,
    collectionSchema.parse(first.current).contributionCalendar,
    current,
  );
  const firstYear = new Date(createdAt).getUTCFullYear();
  const pastYears = Array.from(
    { length: Math.max(0, currentYear - firstYear) },
    (_, i) => firstYear + i,
  );
  const reuse =
    incremental &&
    previous &&
    pastYears.every((year) => previous.years.some((y) => y.year === year));
  let past: ActivityYear[];
  let languages: ActivitySnapshot["languages"];
  if (reuse) {
    past = previous.years.filter((year) => year.year < currentYear);
    languages = previous.languages;
  } else {
    const aliases = pastYears
      .map((year) => {
        const range = yearRange(year, now);
        return `y${year}: contributionsCollection(from: "${range.from}", to: "${range.to}") { ${COLLECTION} }`;
      })
      .join(" ");
    const second = await graphql(
      `query($login: String!) { user(login: $login) { ${aliases} repositories(ownerAffiliations: OWNER, privacy: PUBLIC, isFork: false, first: 100) { nodes { languages(first: 8, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name } } } } } } }`,
      token,
      fetcher,
    );
    past = pastYears.map((year) => {
      const collection = collectionSchema.parse(second[`y${year}`]);
      const parsed = toYear(
        year,
        collection.contributionCalendar,
        yearRange(year, now),
      );
      // Never keep a year whose days disagree with GitHub's own total.
      if (parsed.total !== collection.contributionCalendar.totalContributions)
        throw new ActivityError(`Incomplete calendar for ${year}`);
      return parsed;
    });
    languages = languageShares(languagesSchema.parse(second.repositories));
  }
  if (
    thisYear.total !==
    collectionSchema.parse(first.current).contributionCalendar
      .totalContributions
  )
    throw new ActivityError("Incomplete calendar for the current year");
  const rollingYear = toYear(currentYear, rolling.contributionCalendar);
  const years = [...past, thisYear];
  const fetched = await fetchEvents(token, etag, fetcher);
  const today = iso(now).slice(0, 10);
  return {
    snapshot: {
      version: 1,
      syncedAt: iso(now),
      rolling: {
        ...rollingYear,
        commits: rolling.totalCommitContributions,
        pullRequests: rolling.totalPullRequestContributions,
        reviews: rolling.totalPullRequestReviewContributions,
        issues: rolling.totalIssueContributions,
        restricted: rolling.restrictedContributionsCount,
      },
      years,
      allTime: years.reduce((sum, year) => sum + year.total, 0),
      streaks: streaks([...years, rollingYear], today),
      busiestWeekday: busiestWeekday(rollingYear),
      languages,
      events: fetched.events ?? previous?.events ?? [],
    },
    etag: fetched.etag,
  };
}

/** When a stored snapshot should be refreshed in the background. */
export function isStale(
  state: {
    snapshot: ActivitySnapshot | null;
    fetchedAt: number;
    dirty: boolean;
  },
  now = Date.now(),
) {
  if (!state.snapshot) return true;
  const age = now - state.fetchedAt;
  return age > 10 * 60_000 || (state.dirty && age > 90_000);
}

/**
 * Refreshes unless another refresh started recently, one is running, or
 * GitHub asked us to back off. A stale or partial fetch never replaces a
 * complete snapshot.
 */
export async function refreshActivity({
  store,
  token,
  full = false,
  force = false,
  now = Date.now(),
  fetcher = fetch,
}: {
  store: ActivityStore;
  token: string;
  full?: boolean;
  force?: boolean;
  now?: number;
  fetcher?: typeof fetch;
}): Promise<"committed" | "skipped" | "stale"> {
  if ((await store.backoff()) > now) return "skipped";
  if (!force && !(await store.cooldown())) return "skipped";
  const nonce = crypto.randomUUID();
  if (!(await store.acquire(nonce))) return "skipped";
  try {
    const state = await store.read();
    const fetched = await fetchActivity({
      token,
      previous: state.snapshot,
      etag: await store.etag(),
      now,
      incremental: !full,
      fetcher,
    });
    const revision = await store.commit(fetched.snapshot, now, fetched.etag);
    return revision ? "committed" : "stale";
  } catch (error) {
    if (error instanceof ActivityError && error.retryAt)
      await store.backoff(error.retryAt);
    throw error;
  } finally {
    await store.release(nonce);
  }
}
