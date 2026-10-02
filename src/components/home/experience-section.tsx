import GiantTitle from "@/components/giant-title";
import type { Locale } from "@/lib/content";
import { getExperience } from "@/lib/home-content";
import styles from "./experience.module.css";

export default function ExperienceSection({ locale }: { locale: Locale }) {
  const en = locale === "en";
  const entries = getExperience(locale);
  return (
    <section
      id="experience"
      className={`${styles.section} bleed`}
      aria-labelledby="experience-title"
    >
      <div className={styles.inner}>
        <GiantTitle
          id="experience-title"
          text={en ? "Experience" : "Deneyim"}
          locale={locale}
          fill={70}
          max={168}
        />
        <ol className={styles.list}>
          {entries.map((entry) => (
            <li className={styles.row} key={entry.id}>
              <p className={styles.period}>
                <time dateTime={entry.start}>{entry.period}</time>
              </p>
              <div>
                <h3>{entry.company}</h3>
                <p className={styles.role}>{entry.role}</p>
              </div>
              <div className={styles.description}>
                <ul>
                  {entry.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
                {entry.proof ? (
                  <a href={entry.proof.href}>{entry.proof.action} ↗</a>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
