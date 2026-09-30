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
          <Suspense
            fallback={
              <p className={styles.placeholder}>
                {en
                  ? "Loading GitHub activity… "
                  : "GitHub aktivitesi yükleniyor… "}
                <a href={sharedFacts.github}>
                  {en ? "See my profile on GitHub" : "GitHub profilime bak"}
                </a>
              </p>
            }
          >
            <ActivityData locale={locale} />
          </Suspense>
        </ActivityBoundary>
      </div>
    </section>
  );
}
