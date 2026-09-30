import { Suspense } from "react";
import GiantTitle from "@/components/giant-title";
import { sharedFacts, type Locale } from "@/lib/content";
import { getActivity } from "@/lib/github/activity";
import { parseSnapshot } from "@/lib/activity-view";
import ActivityBoundary from "./activity-boundary";
import ActivityLive from "./activity-live";
import ActivityUnavailable from "./activity-unavailable";
import styles from "./activity.module.css";

async function ActivityData({ locale }: { locale: Locale }) {
  const result = await getActivity();
  // A stored snapshot in a shape this build doesn't know counts as missing.
  const initial =
    result.status === "live" ? parseSnapshot(result.activity) : null;
  return (
    <ActivityLive
      initial={initial}
      revision={initial && result.status === "live" ? result.revision : 0}
      locale={locale}
      profile={sharedFacts.github}
    />
  );
}

const bones = (count: number, className: string) =>
  Array.from({ length: count }, (_, i) => (
    <span key={i} className={className} />
  ));

/**
 * Stands in while the data streams, laid out with the live panel's own
 * classes (stats, year tabs, heatmap, languages, a full feed), so content
 * below barely moves when the numbers arrive.
 */
function ActivitySkeleton({ locale }: { locale: Locale }) {
  const en = locale === "en";
  return (
    <div className={styles.live} aria-busy="true">
      <p className={styles.synced}>
        {en ? "Loading GitHub activity… " : "GitHub aktivitesi yükleniyor… "}
        <a className={styles.loadingLink} href={sharedFacts.github}>
          {en ? "See my profile on GitHub" : "GitHub profilime bak"}
        </a>
      </p>
      <div aria-hidden="true">
        <p className={styles.fresh} />
        <div className={styles.stats}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i}>
              <span className={styles.boneLabel} />
              <span className={styles.boneValue} />
            </div>
          ))}
        </div>
        <div className={styles.tabs}>{bones(6, styles.boneTab)}</div>
        <p className={styles.summary}>
          <span className={styles.boneText} />
        </p>
        <div className={styles.grid}>
          <div className={styles.boneHeatmap} />
          <p className={styles.readout}> </p>
          <div className={styles.legend}>{bones(5, styles.cell)}</div>
        </div>
        <div className={styles.lower}>
          <div>
            <span className={styles.boneHead} />
            <div className={styles.bar}>
              <span className={styles.boneFill} />
            </div>
            <ul className={styles.languages}>
              {Array.from({ length: 6 }, (_, i) => (
                <li key={i}>
                  <span className={styles.boneName} />
                  <span className={styles.boneWhen} />
                </li>
              ))}
            </ul>
          </div>
          <div>
            <span className={styles.boneHead} />
            <ol className={styles.events}>
              {Array.from({ length: 12 }, (_, i) => (
                <li key={i}>
                  <span className={styles.boneText} />
                  <span className={styles.boneWhen} />
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The frame renders with the page, so #activity always exists once; only the
 * data streams in, and Redis never blocks the first paint.
 */
export default function ActivitySection({ locale }: { locale: Locale }) {
  const en = locale === "en";
  return (
    <section
      id="activity"
      className={`${styles.section} bleed`}
      aria-labelledby="activity-title"
    >
      <div className={styles.inner}>
        <GiantTitle
          id="activity-title"
          text={en ? "[GitHub] activity" : "[GitHub] aktivitesi"}
          locale={locale}
          fill={86}
          max={176}
        />
        <ActivityBoundary
          fallback={
            <ActivityUnavailable locale={locale} profile={sharedFacts.github} />
          }
        >
          <Suspense fallback={<ActivitySkeleton locale={locale} />}>
            <ActivityData locale={locale} />
          </Suspense>
        </ActivityBoundary>
      </div>
    </section>
  );
}
