import GiantTitle from "@/components/giant-title";
import { sharedFacts, type Locale } from "@/lib/content";
import ActivityBoundary from "./activity-boundary";
import ActivityLive from "./activity-live";
import ActivityUnavailable from "./activity-unavailable";
import styles from "./activity.module.css";

/**
 * The frame is part of the page, built ahead and served from the CDN; the
 * numbers come from /api/github/activity (cached at the CDN for a minute)
 * once the section is near, so they never hold the page up.
 */
export default function ActivitySection({ locale }: { locale: Locale }) {
  const en = locale === "en";
  return (
    <section
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
          <ActivityLive locale={locale} profile={sharedFacts.github} />
        </ActivityBoundary>
      </div>
    </section>
  );
}
