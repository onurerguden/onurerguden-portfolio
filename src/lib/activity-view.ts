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

const relative = {
  en: new Intl.RelativeTimeFormat("en", { numeric: "auto" }),
  tr: new Intl.RelativeTimeFormat("tr", { numeric: "auto" }),
};

/**
 * "5 minutes ago". Times ahead of `now` (a visitor clock running behind
 * the server's) read as just now instead of "in 2 minutes".
 */
export function timeAgo(time: number, now: number, locale: "en" | "tr") {
  const minutes = Math.round((Math.min(time, now) - now) / 60_000);
  if (minutes === 0) return locale === "en" ? "just now" : "az önce";
  const format = relative[locale];
  if (minutes > -60) return format.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours > -36) return format.format(hours, "hour");
  return format.format(Math.round(hours / 24), "day");
}

/** One line per public event, in the first person, in either language. */
export function describeEvent(event: ActivityEvent, locale: "en" | "tr") {
  const en = locale === "en";
  const repo = event.repo.split("/")[1];
  switch (event.kind) {
    case "push":
      // GitHub leaves the size out of some pushes and reports 0 for others.
      if (!event.commits)
        return en ? `Pushed to ${repo}` : `${repo} deposuna gönderim yaptım`;
      return en
        ? `Pushed ${event.commits} commit${event.commits === 1 ? "" : "s"} to ${repo}`
        : `${repo} deposuna ${event.commits} commit gönderdim`;
    case "pull_request": {
      const verb = {
        opened: en ? "Opened" : "açtım",
        merged: en ? "Merged" : "birleştirdim",
        closed: en ? "Closed" : "kapattım",
        reopened: en ? "Reopened" : "yeniden açtım",
      }[event.action];
      if (!event.number)
        return en
          ? `${verb} a pull request in ${repo}`
          : `${repo} deposunda bir pull request ${verb}`;
      return en
        ? `${verb} pull request #${event.number} in ${repo}`
        : `${repo} deposunda #${event.number} numaralı PR'ı ${verb}`;
    }
    case "create": {
      if (event.ref === "repository")
        return en ? `Created ${repo}` : `${repo} deposunu oluşturdum`;
      const tag = event.ref === "tag";
      if (!event.name)
        return en
          ? `Created a ${event.ref} in ${repo}`
          : `${repo} deposunda yeni bir ${tag ? "etiket" : "dal"} oluşturdum`;
      return en
        ? `Created ${event.ref} ${event.name} in ${repo}`
        : `${repo} deposunda ${event.name} ${tag ? "etiketini" : "dalını"} oluşturdum`;
    }
    case "release":
      return en
        ? `Released ${event.tag ?? "a version"} of ${repo}`
        : `${repo} için ${event.tag ?? "yeni bir sürüm"} yayımladım`;
  }
}

export type RecentActivityEvent = Exclude<ActivityEvent, { kind: "create" }>;

/** The newest three meaningful updates, including older cached snapshots. */
/**
 * The three latest updates, one per repository where possible: a burst of
 * pushes to one repository (usually this site) should not fill the list.
 * Other repositories come first; the rest fill any remaining places.
 */
export function recentEvents(
  events: readonly ActivityEvent[],
  quiet = "onurerguden/onurerguden-portfolio",
) {
  const sorted = events
    .filter((event): event is RecentActivityEvent => event.kind !== "create")
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const picked: RecentActivityEvent[] = [];
  const seen = new Set<string>();
  for (const event of sorted)
    if (event.repo !== quiet && !seen.has(event.repo) && picked.length < 3) {
      seen.add(event.repo);
      picked.push(event);
    }
  for (const event of sorted)
    if (picked.length < 3 && !picked.includes(event)) picked.push(event);
  return picked.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

/** Keep GitHub's actual shares; the three selected languages need not sum to 100. */
export function topLanguages(languages: ActivitySnapshot["languages"]) {
  return [...languages].sort((a, b) => b.share - a.share).slice(0, 3);
}

/** Compact visual wording; the link retains describeEvent's full name. */
export function shortEventAction(
  event: RecentActivityEvent,
  locale: "en" | "tr",
) {
  const en = locale === "en";
  switch (event.kind) {
    case "push":
      if (!event.commits) return en ? "Pushed" : "Gönderim yaptım";
      return en
        ? `Pushed ${event.commits} commit${event.commits === 1 ? "" : "s"}`
        : `${event.commits} commit gönderdim`;
    case "pull_request":
      return {
        opened: en ? "Opened a PR" : "PR açtım",
        merged: en ? "Merged a PR" : "PR birleştirdim",
        closed: en ? "Closed a PR" : "PR kapattım",
        reopened: en ? "Reopened a PR" : "PR'ı yeniden açtım",
      }[event.action];
    case "release":
      return en
        ? `Released ${event.tag ?? "a version"}`
        : `${event.tag ?? "Bir sürüm"} yayımladım`;
  }
}

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
 * non-empty days. The busiest day is always level 4, so a quiet year and a
 * busy one both reach the darkest colour.
 */
export function heatScale(
  days: number[],
): (count: number) => HeatCell["level"] {
  const active = days.filter((count) => count > 0).sort((a, b) => a - b);
  const max = active.at(-1) ?? 0;
  const at = (q: number) =>
    active[Math.min(active.length - 1, Math.floor(q * active.length))];
  const thresholds = active.length ? [at(0.25), at(0.5), at(0.75)] : [];
  return (count) => {
    if (count <= 0) return 0;
    if (count >= max) return 4;
    return (1 +
      thresholds.filter((threshold) => count > threshold)
        .length) as HeatCell["level"];
  };
}

export type Grid = (HeatCell | null)[][];
export type Position = { week: number; day: number };

/** Weeks as columns of seven days, Sunday first; days outside the year are null. */
export function weekColumns(year: ActivityYear): Grid {
  const level = heatScale(year.days);
  const start = Date.parse(year.start);
  const lead = new Date(start).getUTCDay();
  const slots: (HeatCell | null)[] = Array.from({ length: lead }, () => null);
  year.days.forEach((count, i) =>
    slots.push({
      date: new Date(start + i * DAY).toISOString().slice(0, 10),
      count,
      level: level(count),
    }),
  );
  while (slots.length % 7) slots.push(null);
  const weeks: Grid = [];
  for (let i = 0; i < slots.length; i += 7) weeks.push(slots.slice(i, i + 7));
  return weeks;
}

/**
 * Header cells over the weeks: each month's label spans the weeks until the
 * next one starts. A month with fewer than three weeks in view gets no
 * label, as there is no room to print it.
 */
export function monthSpans(weeks: Grid) {
  const starts = weeks.flatMap((week, index) => {
    const first = week.find((cell) => cell?.date.endsWith("-01"));
    return first ? [{ index, date: first.date }] : [];
  });
  const spans: { date: string | null; span: number }[] = [];
  if ((starts[0]?.index ?? weeks.length) > 0)
    spans.push({ date: null, span: starts[0]?.index ?? weeks.length });
  starts.forEach(({ index, date }, i) => {
    const span = (starts[i + 1]?.index ?? weeks.length) - index;
    spans.push({ date: span >= 3 ? date : null, span });
  });
  return spans;
}

/** The most recent day in the grid, where keyboard focus starts. */
export function latestCell(weeks: Grid): Position {
  for (let week = weeks.length - 1; week >= 0; week--)
    for (let day = 6; day >= 0; day--)
      if (weeks[week][day]) return { week, day };
  return { week: 0, day: 0 };
}

export const GRID_KEYS = [
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
];

/**
 * Where a grid key moves focus from `from`, or null to stay put. Up and
 * down stay within the week and stop at padding; the other keys move along
 * the weekday row and step back over padding towards where they started.
 */
export function nextCell(
  weeks: Grid,
  from: Position,
  key: string,
): Position | null {
  const { week, day } = from;
  if (key === "ArrowUp" || key === "ArrowDown") {
    const target = day + (key === "ArrowUp" ? -1 : 1);
    return weeks[week]?.[target] ? { week, day: target } : null;
  }
  const last = weeks.length - 1;
  const wanted = {
    ArrowLeft: week - 1,
    ArrowRight: week + 1,
    Home: 0,
    End: last,
    PageUp: week - 4,
    PageDown: week + 4,
  }[key];
  if (wanted === undefined) return null;
  const target = Math.max(0, Math.min(last, wanted));
  const back = target > week ? -1 : 1;
  for (let w = target; w !== week; w += back)
    if (weeks[w][day]) return { week: w, day };
  return null;
}
