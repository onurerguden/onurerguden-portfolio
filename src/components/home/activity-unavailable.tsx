import styles from "./activity.module.css";

/** Said instead of numbers whenever live activity can't be shown. */
export default function ActivityUnavailable({
  locale,
  profile,
}: {
  locale: "en" | "tr";
  profile: string;
}) {
  const en = locale === "en";
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
}
