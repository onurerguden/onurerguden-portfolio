import type {
  ActivityEvent,
  ActivitySnapshot,
  ActivityYear,
} from "@/lib/github/activity-core";

const DAY = 86_400_000;

type Loose = Record<string, unknown>;
const isObject = (value: unknown): value is Loose =>
  typeof value === "object" && value !== null;
const isCount = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 0;
const isTime = (value: unknown): value is string =>
  typeof value === "string" && !Number.isNaN(Date.parse(value));
const isText = (value: unknown) => value == null || typeof value === "string";

function isYear(value: unknown): value is ActivityYear {
  return (
    isObject(value) &&
    Number.isInteger(value.year) &&
    typeof value.start === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.start) &&
    isTime(value.start) &&
    Array.isArray(value.days) &&
    value.days.every(isCount) &&
    isCount(value.total)
  );
}

function isEvent(value: unknown): value is ActivityEvent {
  if (
    !isObject(value) ||
    typeof value.id !== "string" ||
    typeof value.repo !== "string" ||
    !/^[\w.-]+\/[\w.-]+$/.test(value.repo) ||
    !isTime(value.at)
  )
    return false;
  switch (value.kind) {
    case "push":
      return (
        (value.commits == null || isCount(value.commits)) &&
        isText(value.branch)
      );
    case "pull_request":
      return (
        ["opened", "merged", "closed", "reopened"].includes(
          value.action as string,
        ) && isCount(value.number)
      );
    case "create":
      return (
        ["repository", "branch", "tag"].includes(value.ref as string) &&
        isText(value.name)
      );
    case "release":
      return isText(value.tag);
    default:
      return false;
  }
}

/**
 * Checks a snapshot from the API or the store before anything renders it,
 * so a changed or damaged payload shows "unavailable" instead of breaking
 * the page. Events of kinds this build doesn't know are dropped.
 */
export function parseSnapshot(value: unknown): ActivitySnapshot | null {
  if (!isObject(value)) return null;
  const { rolling, streaks, busiestWeekday: weekday } = value;
  const valid =
    value.version === 1 &&
    isTime(value.syncedAt) &&
    isYear(rolling) &&
    ["commits", "pullRequests", "reviews", "issues", "restricted"].every(
      (key) => isCount((rolling as Loose)[key]),
    ) &&
    Array.isArray(value.years) &&
    value.years.every(isYear) &&
    isCount(value.allTime) &&
    isObject(streaks) &&
    isCount(streaks.current) &&
    isCount(streaks.longest) &&
    (weekday === null ||
      (Number.isInteger(weekday) &&
        (weekday as number) >= 0 &&
        (weekday as number) <= 6)) &&
    Array.isArray(value.languages) &&
    value.languages.every(
      (language) =>
        isObject(language) &&
        typeof language.name === "string" &&
        typeof language.share === "number" &&
        language.share >= 0 &&
        language.share <= 100,
    ) &&
    Array.isArray(value.events);
  if (!valid) return null;
  const snapshot = value as unknown as ActivitySnapshot;
  return { ...snapshot, events: (value.events as unknown[]).filter(isEvent) };
}

export type HeatCell = {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
};

/** Contributions a calendar counts from `date` (YYYY-MM-DD) on. */
export function countFrom(year: ActivityYear, date: string) {
  const skip = Math.round((Date.parse(date) - Date.parse(year.start)) / DAY);
  return year.days
    .slice(Math.max(0, skip))
    .reduce((sum, count) => sum + count, 0);
}

/**
 * How long before the visit a snapshot may have been synced and still stand
 * for what the visitor found. Older snapshots are refreshed on that visit
 * (see `isStale`), so the next poll brings a fair starting point.
 */
const BASELINE_AGE = 10 * 60_000;

export function isFairBaseline(snapshot: ActivitySnapshot, arrivedAt: number) {
  return Date.parse(snapshot.syncedAt) >= arrivedAt - BASELINE_AGE;
}

/**
 * Contributions that appeared after `baseline`, counted from its last day
 * on: GitHub revising older days, or a full reconciliation, isn't news.
 */
export function newContributions(
  baseline: ActivitySnapshot,
  next: ActivitySnapshot,
) {
  const { start, days } = baseline.rolling;
  const last = new Date(Date.parse(start) + Math.max(0, days.length - 1) * DAY)
    .toISOString()
    .slice(0, 10);
  return Math.max(
    0,
    countFrom(next.rolling, last) - countFrom(baseline.rolling, last),
  );
}

/**
 * GitHub-style intensity: level 0 for empty days, then quartiles of the
 * non-empty days, so a busy year and a quiet one both use the full scale.
 */
export function heatLevels(days: number[]) {
  const active = days.filter((count) => count > 0).sort((a, b) => a - b);
  if (!active.length) return [Infinity, Infinity, Infinity];
  const at = (q: number) =>
    active[Math.min(active.length - 1, Math.floor(q * active.length))];
  return [at(0.25), at(0.5), at(0.75)];
}

export function levelOf(
  count: number,
  thresholds: number[],
): HeatCell["level"] {
  if (count <= 0) return 0;
  if (count <= thresholds[0]) return 1;
  if (count <= thresholds[1]) return 2;
  if (count <= thresholds[2]) return 3;
  return 4;
}

/** Weeks as columns of seven days, Sunday first; days outside the year are null. */
export function weekColumns(year: ActivityYear): (HeatCell | null)[][] {
  const thresholds = heatLevels(year.days);
  const start = Date.parse(year.start);
  const lead = new Date(start).getUTCDay();
  const slots: (HeatCell | null)[] = Array.from({ length: lead }, () => null);
  year.days.forEach((count, i) =>
    slots.push({
      date: new Date(start + i * DAY).toISOString().slice(0, 10),
      count,
      level: levelOf(count, thresholds),
    }),
  );
  while (slots.length % 7) slots.push(null);
  const weeks: (HeatCell | null)[][] = [];
  for (let i = 0; i < slots.length; i += 7) weeks.push(slots.slice(i, i + 7));
  return weeks;
}

/** The most recent day in the grid, where keyboard focus starts. */
export function latestCell(weeks: (HeatCell | null)[][]) {
  for (let week = weeks.length - 1; week >= 0; week--)
    for (let day = 6; day >= 0; day--)
      if (weeks[week][day]) return { week, day };
  return { week: 0, day: 0 };
}
