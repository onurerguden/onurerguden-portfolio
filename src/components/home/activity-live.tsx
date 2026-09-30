"use client";
import { useEffect, useRef, useState } from "react";
import type { ActivitySnapshot } from "@/lib/github/activity-core";
import {
  describeEvent,
  isFairBaseline,
  newContributions,
  parseSnapshot,
  timeAgo,
} from "@/lib/activity-view";
import { useMinute } from "@/lib/use-minute";
import ActivityUnavailable from "./activity-unavailable";
import ContributionGrid from "./contribution-grid";
import styles from "./activity.module.css";

const POLL = 3 * 60_000;
/** Failed polls wait twice as long each time, up to 15 minutes. */
const backoff = (delay: number) =>
  Math.min(15 * 60_000, Math.max(POLL, delay * 2));
/** The newest event time the visitor has had on screen. */
const SEEN_KEY = "portfolio:activity-seen";
/** SEEN_KEY as it stood when this tab's visit began. */
const VISIT_KEY = "portfolio:activity-seen-before";

function formatsFor(tag: string) {
  return {
    number: new Intl.NumberFormat(tag),
    // Turkish writes the sign first: %48,5.
    percent: new Intl.NumberFormat(tag, {
      style: "percent",
      maximumFractionDigits: 1,
    }),
    weekday: new Intl.DateTimeFormat(tag, {
      weekday: "long",
      timeZone: "UTC",
    }),
    synced: new Intl.DateTimeFormat(tag, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Istanbul",
    }),
    day: new Intl.DateTimeFormat(tag, {
      day: "numeric",
      month: "short",
      timeZone: "Europe/Istanbul",
    }),
  };
}
const formats = { en: formatsFor("en-GB"), tr: formatsFor("tr-TR") };

export default function ActivityLive({
  initial,
  revision: initialRevision,
  locale,
  profile,
}: {
  initial: ActivitySnapshot | null;
  revision: number;
  locale: "en" | "tr";
  profile: string;
}) {
  const en = locale === "en";
  const [snapshot, setSnapshot] = useState(initial);
  const [fresh, setFresh] = useState(0);
  const latest = useRef(initial);
  const revision = useRef(initialRevision);
  const [tab, setTab] = useState("rolling");
  const [seen, setSeen] = useState<number | null>(null);
  const now = useMinute();

  // One poll at a time, and only while the tab is visible: hiding the tab
  // stops the timer and showing it resumes the same schedule. Unchanged
  // data is a free 304.
  useEffect(() => {
    const controller = new AbortController();
    const arrivedAt = Date.now();
    let timer = 0;
    let running = false;
    let delay = 0;
    let due = arrivedAt + (latest.current ? POLL : 0);
    // What the visitor found: "new since you arrived" counts from here, and
    // only a snapshot synced around the visit qualifies.
    let baseline =
      latest.current && isFairBaseline(latest.current, arrivedAt)
        ? latest.current
        : null;

    const accept = (next: ActivitySnapshot, etag: string | null) => {
      const current = latest.current;
      // A CDN can still hold an older revision than the page rendered with;
      // only a later sync replaces what is on screen.
      if (current && Date.parse(next.syncedAt) <= Date.parse(current.syncedAt))
        return;
      const match = etag?.match(/"activity-(\d+)"/);
      revision.current = match ? Number(match[1]) : 0;
      latest.current = next;
      if (baseline) setFresh(newContributions(baseline, next));
      else if (isFairBaseline(next, arrivedAt)) baseline = next;
      setSnapshot(next);
    };
    const schedule = () => {
      window.clearTimeout(timer);
      if (
        controller.signal.aborted ||
        running ||
        document.visibilityState !== "visible"
      )
        return;
      timer = window.setTimeout(poll, Math.max(0, due - Date.now()));
    };
    const poll = async () => {
      if (document.visibilityState !== "visible") return;
      running = true;
      try {
        const response = await fetch("/api/github/activity", {
          headers: revision.current
            ? { "If-None-Match": `"activity-${revision.current}"` }
            : {},
          cache: "no-store",
          signal: controller.signal,
        });
        const next =
          response.status === 200 ? parseSnapshot(await response.json()) : null;
        if (next) {
          accept(next, response.headers.get("etag"));
          delay = POLL;
        } else {
          // An unread body keeps the request open in Chromium, holding its
          // connection; the 304 and 503 bodies are empty or tiny.
          if (!response.bodyUsed) await response.text();
          delay = response.status === 304 ? POLL : backoff(delay);
        }
      } catch {
        if (controller.signal.aborted) return;
        delay = backoff(delay);
      } finally {
        running = false;
      }
      due = Date.now() + delay;
      schedule();
    };

    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, []);

  // "New" is relative to the newest event seen on an earlier visit, or the
  // last two days on a first one. It is read once per tab session, so a
  // language switch or a return to the page keeps the same badges.
  useEffect(() => {
    let before: number | null = null;
    try {
      let stored = sessionStorage.getItem(VISIT_KEY);
      if (stored === null) {
        stored = localStorage.getItem(SEEN_KEY) ?? "";
        sessionStorage.setItem(VISIT_KEY, stored);
      }
      before = Number(stored) || null;
    } catch {
      // Without storage everything from the last two days is new.
    }
    const frame = requestAnimationFrame(() =>
      setSeen(before ?? Date.now() - 2 * 86_400_000),
    );
    return () => cancelAnimationFrame(frame);
  }, []);

  // Events only count as seen once the list has actually been on screen.
  const list = useRef<HTMLOListElement>(null);
  const newest = snapshot
    ? Math.max(0, ...snapshot.events.map((event) => Date.parse(event.at)))
    : 0;
  useEffect(() => {
    const node = list.current;
    if (!node || !newest) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      try {
        if (newest > (Number(localStorage.getItem(SEEN_KEY)) || 0))
          localStorage.setItem(SEEN_KEY, String(newest));
      } catch {
        // Nothing to remember without storage.
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [newest]);

  const format = formats[locale];
  const number = format.number;
  if (!snapshot)
    return <ActivityUnavailable locale={locale} profile={profile} />;

  const years = [...snapshot.years].sort((a, b) => b.year - a.year);
  const current =
    tab === "rolling"
      ? snapshot.rolling
      : (years.find((year) => String(year.year) === tab) ?? snapshot.rolling);
  const weekday = snapshot.busiestWeekday;
  const weekdayName =
    weekday === null
      ? "—"
      : format.weekday.format(Date.UTC(2026, 0, 4 + weekday));
  const synced = Date.parse(snapshot.syncedAt);
  const stats = [
    {
      value: number.format(snapshot.rolling.total),
      label: en ? "contributions in the last 12 months" : "son 12 aydaki katkı",
    },
    {
      value: number.format(snapshot.rolling.commits),
      label: en ? "commits" : "commit",
    },
    {
      value: number.format(snapshot.rolling.pullRequests),
      label: en ? "pull requests" : "pull request",
    },
    {
      value: number.format(snapshot.streaks.current),
      label: en ? "day current streak" : "günlük güncel seri",
    },
    {
      value: number.format(snapshot.streaks.longest),
      label: en ? "day longest streak" : "günlük en uzun seri",
    },
    { value: weekdayName, label: en ? "busiest weekday" : "en yoğun gün" },
  ];
  const tabs = [
    { id: "rolling", label: en ? "Last 12 months" : "Son 12 ay" },
    ...years.map((year) => ({
      id: String(year.year),
      label: String(year.year),
    })),
  ];
  const onTabKey = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const index = tabs.findIndex((item) => item.id === tab);
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    const edge = { Home: 0, End: tabs.length - 1 }[event.key];
    if (step === undefined && edge === undefined) return;
    event.preventDefault();
    const next = edge ?? (index + step! + tabs.length) % tabs.length;
    setTab(tabs[next].id);
    document.getElementById(`activity-tab-${tabs[next].id}`)?.focus();
  };

  return (
    <div className={styles.live}>
      <p className={styles.synced}>
        <span className={styles.pulse} aria-hidden="true" />
        {en ? "Synced with GitHub " : "GitHub ile eşitlendi: "}
        {now === null ? (
          <time dateTime={snapshot.syncedAt}>
            {format.synced.format(synced)}
          </time>
        ) : (
          <time dateTime={snapshot.syncedAt}>
            {timeAgo(synced, now, locale)}
          </time>
        )}
      </p>
      <p className={styles.fresh} role="status">
        {fresh > 0
          ? en
            ? `${fresh} new contribution${fresh === 1 ? "" : "s"} since you arrived`
            : `Geldiğinden beri ${fresh} yeni katkı`
          : ""}
      </p>
      <dl className={styles.stats}>
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt>{stat.label}</dt>
            <dd>{stat.value}</dd>
          </div>
        ))}
      </dl>
      <div className={styles.calendar}>
        <div
          role="tablist"
          aria-label={en ? "Contribution year" : "Katkı yılı"}
          className={styles.tabs}
        >
          {tabs.map((item) => (
            <button
              key={item.id}
              id={`activity-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              aria-controls="activity-panel"
              tabIndex={tab === item.id ? 0 : -1}
              onClick={() => setTab(item.id)}
              onKeyDown={onTabKey}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div
          id="activity-panel"
          role="tabpanel"
          aria-labelledby={`activity-tab-${tab}`}
        >
          <p className={styles.summary}>
            {tab === "rolling"
              ? en
                ? `${number.format(current.total)} contributions in the last 12 months, including ${number.format(snapshot.rolling.restricted)} in private repositories.`
                : `Son 12 ayda ${number.format(current.total)} katkı; bunların ${number.format(snapshot.rolling.restricted)} tanesi özel depolarda.`
              : en
                ? `${number.format(current.total)} contributions in ${tab}.`
                : `${tab} yılında ${number.format(current.total)} katkı.`}
          </p>
          <ContributionGrid
            key={tab}
            year={current}
            locale={locale}
            label={
              en
                ? `Contributions per day, ${tabs.find((item) => item.id === tab)?.label}`
                : `Günlük katkılar, ${tabs.find((item) => item.id === tab)?.label}`
            }
          />
        </div>
      </div>
      <div className={styles.lower}>
        <div>
          <h3 className={styles.subhead}>
            {en
              ? "Languages in public repositories"
              : "Herkese açık depolardaki diller"}
          </h3>
          {snapshot.languages.length ? (
            <>
              <div className={styles.bar} aria-hidden="true">
                {snapshot.languages.map((language, i) => (
                  <span
                    key={language.name}
                    style={{ flexGrow: language.share }}
                    data-slot={i}
                  />
                ))}
              </div>
              <ul className={styles.languages}>
                {snapshot.languages.map((language, i) => (
                  <li key={language.name}>
                    <span
                      className={styles.swatch}
                      data-slot={i}
                      aria-hidden="true"
                    />
                    {language.name}
                    <span>{format.percent.format(language.share / 100)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className={styles.empty}>
              {en ? "No language data yet." : "Henüz dil verisi yok."}
            </p>
          )}
        </div>
        <div>
          <h3 className={styles.subhead}>
            {en ? "Recent public activity" : "Son herkese açık hareketler"}
          </h3>
          {snapshot.events.length ? (
            <ol ref={list} className={styles.events}>
              {snapshot.events.map((event) => {
                const at = Date.parse(event.at);
                return (
                  <li key={event.id}>
                    <a href={`https://github.com/${event.repo}`}>
                      {describeEvent(event, locale)}
                    </a>
                    <span className={styles.when}>
                      {seen !== null && at > seen ? (
                        <span className={styles.newBadge}>
                          {en ? "New" : "Yeni"}
                        </span>
                      ) : null}
                      <time dateTime={event.at}>
                        {now === null
                          ? format.day.format(at)
                          : timeAgo(at, now, locale)}
                      </time>
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className={styles.empty}>
              {en
                ? "No public pushes, pull requests or releases lately. "
                : "Son zamanlarda herkese açık bir push, pull request ya da sürüm yok. "}
              <a href={profile}>
                {en ? "See my profile on GitHub" : "GitHub profilime bak"}
                <span aria-hidden="true"> ↗</span>
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
