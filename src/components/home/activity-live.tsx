"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type {
  ActivityEvent,
  ActivitySnapshot,
} from "@/lib/github/activity-core";
import ContributionGrid from "./contribution-grid";
import styles from "./activity.module.css";

const POLL = 3 * 60_000;
const SEEN_KEY = "portfolio:activity-seen";

/** Minute-resolution clock after hydration; null while server rendering. */
function subscribeMinute(onChange: () => void) {
  const timer = window.setInterval(onChange, 30_000);
  return () => window.clearInterval(timer);
}
function useNow() {
  return useSyncExternalStore(
    subscribeMinute,
    () => Math.floor(Date.now() / 30_000) * 30_000,
    () => null,
  );
}

function ago(time: number, now: number, locale: "en" | "tr") {
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const minutes = Math.round((time - now) / 60_000);
  if (Math.abs(minutes) < 60) return format.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 36) return format.format(hours, "hour");
  return format.format(Math.round(hours / 24), "day");
}

function describeEvent(event: ActivityEvent, en: boolean) {
  const repo = event.repo.split("/")[1];
  switch (event.kind) {
    case "push":
      return en
        ? `Pushed ${event.commits ?? "new"} commit${event.commits === 1 ? "" : "s"} to ${repo}`
        : `${repo} deposuna ${event.commits ?? "yeni"} commit gönderdim`;
    case "pull_request": {
      const verb = {
        opened: en ? "Opened" : "açtım",
        merged: en ? "Merged" : "birleştirdim",
        closed: en ? "Closed" : "kapattım",
        reopened: en ? "Reopened" : "yeniden açtım",
      }[event.action];
      return en
        ? `${verb} pull request #${event.number} in ${repo}`
        : `${repo} deposunda #${event.number} numaralı PR'ı ${verb}`;
    }
    case "create":
      if (event.ref === "repository")
        return en ? `Created ${repo}` : `${repo} deposunu oluşturdum`;
      return en
        ? `Created ${event.ref} ${event.name ?? ""} in ${repo}`
        : `${repo} deposunda ${event.name ?? ""} ${event.ref === "tag" ? "etiketini" : "dalını"} oluşturdum`;
    case "release":
      return en
        ? `Released ${event.tag ?? "a version"} of ${repo}`
        : `${repo} için ${event.tag ?? "yeni bir sürüm"} yayımladım`;
  }
}

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
  const revision = useRef(initialRevision);
  const arrival = useRef(initial?.allTime ?? null);
  const [tab, setTab] = useState("rolling");
  const [seen, setSeen] = useState<number | null>(null);
  const now = useNow();

  // Poll only while the tab is visible; unchanged data is a free 304.
  useEffect(() => {
    let timer = 0;
    let delay = snapshot ? POLL : 0;
    let stopped = false;
    const poll = async () => {
      if (document.visibilityState !== "visible") return schedule();
      try {
        const response = await fetch("/api/github/activity", {
          headers: revision.current
            ? { "If-None-Match": `"activity-${revision.current}"` }
            : {},
          cache: "no-store",
        });
        if (response.status === 200) {
          const next = (await response.json()) as ActivitySnapshot;
          const etag = response.headers.get("etag")?.match(/activity-(\d+)/);
          if (etag) revision.current = Number(etag[1]);
          if (arrival.current === null) arrival.current = next.allTime;
          setFresh(Math.max(0, next.allTime - arrival.current));
          setSnapshot(next);
          delay = POLL;
        } else if (response.status === 304) delay = POLL;
        else delay = Math.min(15 * 60_000, Math.max(POLL, delay * 2));
      } catch {
        delay = Math.min(15 * 60_000, Math.max(POLL, delay * 2));
      }
      schedule();
    };
    const schedule = () => {
      if (!stopped) timer = window.setTimeout(poll, delay || POLL);
    };
    timer = window.setTimeout(poll, delay);
    const wake = () => {
      if (document.visibilityState === "visible") {
        window.clearTimeout(timer);
        timer = window.setTimeout(poll, 0);
      }
    };
    document.addEventListener("visibilitychange", wake);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
    };
    // Polling starts once; the snapshot it receives never restarts it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "New" means since the last visit, or the last two days on a first one.
  useEffect(() => {
    let previous: number | null = null;
    try {
      previous = Number(localStorage.getItem(SEEN_KEY)) || null;
      localStorage.setItem(SEEN_KEY, String(Date.now()));
    } catch {
      // Without storage everything from the last two days is new.
    }
    const frame = requestAnimationFrame(() =>
      setSeen(previous ?? Date.now() - 2 * 86_400_000),
    );
    return () => cancelAnimationFrame(frame);
  }, []);

  const number = new Intl.NumberFormat(en ? "en-GB" : "tr-TR");
  if (!snapshot)
    return (
      <p className={styles.unavailable}>
        {en
          ? "Live GitHub activity is unavailable right now. "
          : "Canlı GitHub aktivitesi şu anda kullanılamıyor. "}
        <a href={profile}>
          {en ? "See my profile on GitHub" : "GitHub profilime bak"}
          <span aria-hidden="true"> ↗</span>
        </a>
      </p>
    );

  const years = [...snapshot.years].sort((a, b) => b.year - a.year);
  const current =
    tab === "rolling"
      ? snapshot.rolling
      : (years.find((year) => String(year.year) === tab) ?? snapshot.rolling);
  const weekday = snapshot.busiestWeekday;
  const weekdayName =
    weekday === null
      ? "—"
      : new Intl.DateTimeFormat(en ? "en-GB" : "tr-TR", {
          weekday: "long",
          timeZone: "UTC",
        }).format(Date.UTC(2026, 0, 4 + weekday));
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
            {new Intl.DateTimeFormat(en ? "en-GB" : "tr-TR", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Europe/Istanbul",
            }).format(synced)}
          </time>
        ) : (
          <time dateTime={snapshot.syncedAt}>{ago(synced, now, locale)}</time>
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
                <span>{number.format(language.share)}%</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className={styles.subhead}>
            {en ? "Recent public activity" : "Son herkese açık hareketler"}
          </h3>
          <ol className={styles.events}>
            {snapshot.events.map((event) => {
              const at = Date.parse(event.at);
              return (
                <li key={event.id}>
                  <a href={`https://github.com/${event.repo}`}>
                    {describeEvent(event, en)}
                  </a>
                  <span className={styles.when}>
                    {seen !== null && at > seen ? (
                      <span className={styles.newBadge}>
                        {en ? "New" : "Yeni"}
                      </span>
                    ) : null}
                    <time dateTime={event.at}>
                      {now === null
                        ? new Intl.DateTimeFormat(en ? "en-GB" : "tr-TR", {
                            day: "numeric",
                            month: "short",
                            timeZone: "Europe/Istanbul",
                          }).format(at)
                        : ago(at, now, locale)}
                    </time>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
