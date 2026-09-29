import type { ActivityYear } from "@/lib/github/activity-core";

const DAY = 86_400_000;

export type HeatCell = {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
};

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
