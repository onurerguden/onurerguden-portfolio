import Link from "next/link";
import { getProjects, type Locale } from "@/lib/content";
import styles from "./case.module.css";

/** The other case studies, then the archive. */
export default function OtherProjects({
  locale,
  current,
}: {
  locale: Locale;
  current: string;
}) {
  const en = locale === "en";
  const others = getProjects(locale).filter(
    (project) => project.featured && project.slug !== current,
  );
  return (
    <section className={styles.others} aria-labelledby="other-projects">
      <h2 id="other-projects">{en ? "Other projects" : "Diğer projeler"}</h2>
      <ul>
        {others.map((project) => (
          <li key={project.slug}>
            <Link href={`/${locale}/projects/${project.slug}`}>
              <span className={styles.otherCategory}>{project.category}</span>
              <strong>{project.title}</strong>
              <span>{project.summary}</span>
              <span className={styles.otherArrow} aria-hidden="true">
                →
              </span>
            </Link>
          </li>
        ))}
        <li>
          <Link className={styles.archiveLink} href={`/${locale}/projects`}>
            <strong>
              {en ? "More in the archive" : "Arşivde daha fazlası"}
            </strong>
            <span className={styles.otherArrow} aria-hidden="true">
              →
            </span>
          </Link>
        </li>
      </ul>
    </section>
  );
}
