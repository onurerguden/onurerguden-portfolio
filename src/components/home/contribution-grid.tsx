"use client";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { ActivityYear } from "@/lib/github/activity-core";
import {
  GRID_KEYS,
  latestCell,
  monthSpans,
  nextCell,
  weekColumns,
  type HeatCell,
  type Position,
} from "@/lib/activity-view";
import styles from "./activity.module.css";

const formats = {
  en: {
    day: new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }),
    month: new Intl.DateTimeFormat("en-GB", {
      month: "short",
      timeZone: "UTC",
    }),
  },
  tr: {
    day: new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }),
    month: new Intl.DateTimeFormat("tr-TR", {
      month: "short",
      timeZone: "UTC",
    }),
  },
};
const weekdays = {
  en: ["", "Mon", "", "Wed", "", "Fri", ""],
  tr: ["", "Pzt", "", "Çar", "", "Cum", ""],
};

function describe(cell: HeatCell, locale: "en" | "tr") {
  const when = formats[locale].day.format(Date.parse(cell.date));
  if (locale === "en")
    return `${cell.count === 0 ? "No" : cell.count} contribution${cell.count === 1 ? "" : "s"} on ${when}`;
  return cell.count === 0
    ? `${when}: katkı yok`
    : `${when}: ${cell.count} katkı`;
}

/** The day a pointer or focus event happened on, if it was a day cell. */
const dateOf = (target: EventTarget) =>
  target instanceof HTMLElement ? (target.dataset.date ?? null) : null;

/**
 * A contribution heatmap as an ARIA grid: weekdays are rows and weeks are
 * columns. One cell is tabbable; arrow keys, Home/End and PageUp/PageDown
 * move between days, and a single readout describes the active cell.
 */
function ContributionGrid({
  year,
  locale,
  label,
}: {
  year: ActivityYear;
  locale: "en" | "tr";
  label: string;
}) {
  const en = locale === "en";
  const weeks = useMemo(() => weekColumns(year), [year]);
  const positions = useMemo(() => {
    const map = new Map<string, Position>();
    weeks.forEach((column, week) =>
      column.forEach((cell, day) => cell && map.set(cell.date, { week, day })),
    );
    return map;
  }, [weeks]);
  const labels = useMemo(() => {
    const map = new Map<string, string>();
    for (const column of weeks)
      for (const cell of column)
        if (cell) map.set(cell.date, describe(cell, locale));
    return map;
  }, [weeks, locale]);
  // Focus is kept by date, so fresh data that shifts the weeks keeps it on
  // the same day, or on the latest one if that day has left the window.
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const active =
    (activeDate !== null && positions.get(activeDate)) || latestCell(weeks);
  const activeKey = weeks[active.week]?.[active.day]?.date ?? null;
  const [shown, setShown] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const table = useRef<HTMLTableElement>(null);

  // Each year (the parent keys by year) opens on its most recent week.
  useEffect(() => {
    const node = scroller.current;
    if (node) node.scrollLeft = node.scrollWidth;
  }, []);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!GRID_KEYS.includes(event.key)) return;
    event.preventDefault();
    const target = nextCell(weeks, active, event.key);
    const cell = target && weeks[target.week][target.day];
    if (!cell) return;
    setActiveDate(cell.date);
    table.current
      ?.querySelector<HTMLElement>(`[data-date="${cell.date}"]`)
      ?.focus();
  };

  // The cells depend only on the data and the tabbable day, so hovering
  // re-renders the readout and nothing else.
  const head = useMemo(
    () => (
      <thead aria-hidden="true">
        <tr>
          <th />
          {monthSpans(weeks).map((month, i) => (
            <th key={i} colSpan={month.span} className={styles.month}>
              {month.date ? (
                <span>
                  {formats[locale].month.format(Date.parse(month.date))}
                </span>
              ) : null}
            </th>
          ))}
        </tr>
      </thead>
    ),
    [weeks, locale],
  );
  const body = useMemo(
    () => (
      <tbody>
        {weekdays[locale].map((weekday, day) => (
          <tr key={day}>
            <th className={styles.weekday} aria-hidden="true">
              {weekday}
            </th>
            {weeks.map((column, w) => {
              const cell = column[day];
              if (!cell) return <td key={w} role="presentation" />;
              return (
                <td
                  key={w}
                  role="gridcell"
                  data-date={cell.date}
                  tabIndex={cell.date === activeKey ? 0 : -1}
                  aria-label={labels.get(cell.date)}
                  data-level={cell.level}
                  className={styles.cell}
                />
              );
            })}
          </tr>
        ))}
      </tbody>
    ),
    [weeks, labels, activeKey, locale],
  );

  return (
    <div className={styles.grid}>
      <div className={styles.gridScroller} ref={scroller}>
        <table
          ref={table}
          role="grid"
          aria-label={label}
          aria-readonly="true"
          className={styles.heatmap}
          onKeyDown={onKeyDown}
          onFocus={(event) => {
            const date = dateOf(event.target);
            if (!date) return;
            setActiveDate(date);
            setShown(date);
          }}
          onPointerOver={(event) => {
            const date = dateOf(event.target);
            if (date) setShown(date);
          }}
          onPointerLeave={() => setShown(null)}
        >
          {head}
          {body}
        </table>
      </div>
      <p className={styles.readout} aria-hidden="true">
        {(shown && labels.get(shown)) || " "}
      </p>
      <div className={styles.legend} aria-hidden="true">
        <span>{en ? "Less" : "Az"}</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span key={level} className={styles.cell} data-level={level} />
        ))}
        <span>{en ? "More" : "Çok"}</span>
      </div>
    </div>
  );
}

/** Memoised: the parent's minute clock never re-renders the grid. */
export default memo(ContributionGrid);
