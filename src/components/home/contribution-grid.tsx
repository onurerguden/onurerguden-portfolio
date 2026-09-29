"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ActivityYear } from "@/lib/github/activity-core";
import { latestCell, weekColumns, type HeatCell } from "@/lib/activity-view";
import styles from "./activity.module.css";

type Position = { week: number; day: number };

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
  const [active, setActive] = useState<Position>(() => latestCell(weeks));
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
  const move = (next: Position) => {
    const week = Math.max(0, Math.min(weeks.length - 1, next.week));
    const day = Math.max(0, Math.min(6, next.day));
    // Padding days outside the year are skipped towards the requested side.
    let target: Position | null = weeks[week][day] ? { week, day } : null;
    for (let step = 1; !target && step < 7; step++) {
      const direction = next.week >= active.week ? -1 : 1;
      const w = week + direction * step;
      if (w >= 0 && w < weeks.length && weeks[w][day])
        target = { week: w, day };
    }
    if (!target) return;
    setActive(target);
    cells.current.get(`${target.week}:${target.day}`)?.focus();
  };
  const onKeyDown = (event: React.KeyboardEvent) => {
    const { week, day } = active;
    const moves: Record<string, Position> = {
      ArrowLeft: { week: week - 1, day },
      ArrowRight: { week: week + 1, day },
      ArrowUp: { week, day: day - 1 },
      ArrowDown: { week, day: day + 1 },
      Home: { week: 0, day },
      End: { week: weeks.length - 1, day },
      PageUp: { week: week - 4, day },
      PageDown: { week: week + 4, day },
    };
    const next = moves[event.key];
    if (!next) return;
    event.preventDefault();
    move(next);
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
              {weeks.map((week, i) => {
                const first = week.find(
                  (cell) => cell?.date.endsWith("-01") || false,
                );
                return (
                  <th key={i} className={styles.month}>
                    {first ? months.format(Date.parse(first.date)) : ""}
                  </th>
                );
              })}
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
                        const key = `${w}:${day}`;
                        if (node) cells.current.set(key, node);
                        else cells.current.delete(key);
                      }}
                      tabIndex={focused ? 0 : -1}
                      aria-label={describe(cell)}
                      data-level={cell.level}
                      className={styles.cell}
                      onFocus={() => {
                        setActive({ week: w, day });
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
        {shown ? describe(shown) : " "}
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
