import Link from "next/link";
import GiantTitle from "@/components/giant-title";
import type { Locale } from "@/lib/content";
import { getExperience } from "@/lib/home-content";
import DirectionalRows from "./directional-rows";
import styles from "./monitor.module.css";

/**
 * Experience as rows on a career rail. Consecutive roles at one company share
 * a branch on the rail; the relation is visual only, since the company names
 * and the list order already say it.
 */
export default function ExperienceRail({ locale }: { locale: Locale }) {
  const en = locale === "en";
  const entries = getExperience(locale);
  return (
    <div className={styles.block} data-story-section="experience">
      <GiantTitle
        id="experience-title"
        text={en ? "Experience" : "Deneyim"}
        locale={locale}
        fill={86}
        className={styles.title}
      />
      <DirectionalRows className={`${styles.list} ${styles.rail}`}>
        {entries.map((entry, index) => {
          const branch =
            entries[index - 1]?.company === entry.company ||
            entries[index + 1]?.company === entry.company;
          const joinsNext = entries[index + 1]?.company === entry.company;
          return (
            <li
              key={entry.id}
              className={`${styles.row} ${styles.role}`}
              data-row
              data-reveal-row
              data-linked={entry.proof ? "" : undefined}
              data-branch={branch ? "" : undefined}
            >
              <span className={styles.node} aria-hidden="true" />
              {joinsNext ? (
                <span className={styles.branch} aria-hidden="true" />
              ) : null}
              <p className={styles.period}>
                <time dateTime={entry.start}>{entry.period}</time>
              </p>
              <div className={styles.copy}>
                <h3>{entry.company}</h3>
                <p className={styles.roleName}>{entry.role}</p>
                <ul className={styles.highlights}>
                  {entry.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
                {entry.tools.length ? (
                  <ul
                    className={styles.tech}
                    aria-label={en ? "Tools" : "Araçlar"}
                  >
                    {entry.tools.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
              {entry.proof ? (
                <Link
                  className={`${styles.proof} ${styles.link}`}
                  href={entry.proof.href}
                >
                  {entry.proof.action} <span aria-hidden="true">↗</span>
                </Link>
              ) : null}
            </li>
          );
        })}
      </DirectionalRows>
    </div>
  );
}
