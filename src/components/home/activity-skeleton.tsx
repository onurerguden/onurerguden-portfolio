import styles from "./activity.module.css";

const bones = (count: number, className: string) =>
  Array.from({ length: count }, (_, i) => (
    <span key={i} className={className} />
  ));

/**
 * Stands in while the data streams, laid out with the live panel's own
 * classes (stats, year tabs, heatmap, two three-row panels), so content
 * below barely moves when the numbers arrive.
 */
export default function ActivitySkeleton({
  locale,
  profile,
}: {
  locale: "en" | "tr";
  profile: string;
}) {
  const en = locale === "en";
  return (
    <div className={styles.live} aria-busy="true">
      <p className={styles.synced}>
        {en ? "Loading GitHub activity… " : "GitHub aktivitesi yükleniyor… "}
        <a className={styles.loadingLink} href={profile}>
          {en ? "See my profile on GitHub" : "GitHub profilime bak"}
        </a>
      </p>
      <div aria-hidden="true">
        <p className={styles.fresh} />
        <p className={styles.statPeriod}>
          {en ? "Last 12 months" : "Son 12 ay"}
        </p>
        <div className={styles.stats}>
          {Array.from({ length: 3 }, (_, i) => (
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
          <div className={styles.gridScroller}>
            <div className={styles.boneHeatmap} />
          </div>
          <p className={styles.readout}> </p>
          <div className={styles.legend}>{bones(5, styles.cell)}</div>
        </div>
        <div className={styles.lower}>
          <div className={styles.panel}>
            <span className={styles.boneHead} />
            <ul className={styles.languages}>
              {Array.from({ length: 3 }, (_, i) => (
                <li key={i}>
                  <span className={styles.boneName} />
                  <span className={styles.boneWhen} />
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.panel}>
            <span className={styles.boneHead} />
            <ol className={styles.events}>
              {Array.from({ length: 3 }, (_, i) => (
                <li key={i}>
                  <div className={styles.boneEvent}>
                    <span className={styles.boneName} />
                    <span className={styles.boneText} />
                  </div>
                  <span className={styles.boneWhen} />
                </li>
              ))}
            </ol>
          </div>
        </div>
        <p className={styles.profile}>
          <span className={styles.boneText} />
        </p>
      </div>
    </div>
  );
}
