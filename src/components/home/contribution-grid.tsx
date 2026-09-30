"use client";
import { useEffect, useMemo, useRef, useState } from "react";
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

/**
 * A contribution heatmap as an ARIA grid: weekdays are rows and weeks are
 * columns. One cell is tabbable; arrow keys, Home/End and PageUp/PageDown
 * move between days, and a single readout describes the active cell.
 */
export default function ContributionGrid({
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
  // Focus is kept by date, so fresh data that shifts the weeks keeps it on
  // the same day, or on the latest one if that day has left the window.
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const active =
    (activeDate !== null && positions.get(activeDate)) || latestCell(weeks);
  const [shown, setShown] = useState<HeatCell | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const cells = useRef(new Map<string, HTMLTableCellElement>());

  // Each year (the parent keys by year) opens on its most recent week.
  useEffect(() => {
    const node = scroller.current;
    if (node) node.scrollLeft = node.scrollWidth;
  }, []);

  const date = new Intl.DateTimeFormat(en ? "en-GB" : "tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const describe = (cell: HeatCell) => {
    const when = date.format(Date.parse(cell.date));
    if (en)
      return `${cell.count === 0 ? "No" : cell.count} contribution${cell.count === 1 ? "" : "s"} on ${when}`;
    return cell.count === 0
      ? `${when}: katkı yok`
      : `${when}: ${cell.count} katkı`;
  };
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!GRID_KEYS.includes(event.key)) return;
    event.preventDefault();
    const target = nextCell(weeks, active, event.key);
    const cell = target && weeks[target.week][target.day];
    if (!cell) return;
    setActiveDate(cell.date);
    cells.current.get(cell.date)?.focus();
  };

  const months = new Intl.DateTimeFormat(en ? "en-GB" : "tr-TR", {
    month: "short",
    timeZone: "UTC",
  });
  const weekdays = en
    ? ["", "Mon", "", "Wed", "", "Fri", ""]
    : ["", "Pzt", "", "Çar", "", "Cum", ""];
  return (
    <div className={styles.grid}>
      <div className={styles.gridScroller} ref={scroller}>
        <table
          role="grid"
          aria-label={label}
          aria-readonly="true"
          className={styles.heatmap}
          onKeyDown={onKeyDown}
          onPointerLeave={() => setShown(null)}
        >
          <thead aria-hidden="true">
            <tr>
              <th />
              {monthSpans(weeks).map((month, i) => (
                <th key={i} colSpan={month.span} className={styles.month}>
                  {month.date ? (
                    <span>{months.format(Date.parse(month.date))}</span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 7 }, (_, day) => (
              <tr key={day}>
                <th className={styles.weekday} aria-hidden="true">
                  {weekdays[day]}
                </th>
                {weeks.map((week, w) => {
                  const cell = week[day];
                  if (!cell) return <td key={w} role="presentation" />;
                  const focused = active.week === w && active.day === day;
                  return (
                    <td
                      key={w}
                      role="gridcell"
                      ref={(node) => {
                        if (node) cells.current.set(cell.date, node);
                        else cells.current.delete(cell.date);
                      }}
                      tabIndex={focused ? 0 : -1}
                      aria-label={describe(cell)}
                      data-level={cell.level}
                      className={styles.cell}
                      onFocus={() => {
                        setActiveDate(cell.date);
                        setShown(cell);
                      }}
                      onPointerEnter={() => setShown(cell)}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.readout} aria-hidden="true">
        {shown ? describe(shown) : " "}
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
