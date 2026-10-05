import Link from "next/link";
import GiantTitle from "@/components/giant-title";
import { sharedFacts, type Locale } from "@/lib/content";
import { getResearch } from "@/lib/research";
import styles from "./research-teaser.module.css";

/**
 * Research on the home page: the approach, the accepted paper beside an
 * independent study, and the questions I am working on, with the details a
 * page away.
 */
export default function ResearchTeaser({ locale }: { locale: Locale }) {
  const en = locale === "en";
  const research = getResearch(locale);
  const { publication } = sharedFacts;
  return (
    <section
      className={`${styles.section} bleed`}
      aria-labelledby="research-title"
    >
      <div className={styles.inner}>
        <GiantTitle
          id="research-title"
          text={en ? "Research" : "Araştırma"}
          locale={locale}
          fill={84}
        />
        <div className={styles.grid}>
          <p className={styles.approach}>{research.approach}</p>
          <article className={styles.paper}>
            <p className={styles.status}>{publication.statusLabel[locale]}</p>
            <h3>{publication.title}</h3>
            <p className={styles.journal}>{publication.journal}</p>
            <p className={styles.authors}>
              {publication.authors.map((author, i) => (
                <span key={author}>
                  {i ? ", " : null}
                  {author === "O. Ergüden" ? <strong>{author}</strong> : author}
                </span>
              ))}
            </p>
            <p className={styles.summary}>{research.publicationSummary}</p>
          </article>
          <article className={`${styles.paper} ${styles.study}`}>
            <p className={`${styles.status} ${styles.quietStatus}`}>
              {research.study.status}
            </p>
            <h3>{research.study.title}</h3>
            <p className={styles.journal}>{research.study.team}</p>
            <p className={styles.summary}>
              {research.study.data} {research.study.method}
            </p>
          </article>
        </div>
        <h3 className={styles.questionsTitle}>
          {en ? "Questions I’m exploring" : "Üzerinde düşündüğüm sorular"}
        </h3>
        <ol className={styles.questions}>
          {research.questions.map((question, i) => (
            <li key={question}>
              <span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              {question}
            </li>
          ))}
        </ol>
        <div className={styles.links}>
          <Link href={`/${locale}/projects/water-safety`}>
            {en
              ? "HealthFactor-AI case study"
              : "HealthFactor-AI vaka çalışması"}
            <span aria-hidden="true"> →</span>
          </Link>
          <Link href={`/${locale}/research`}>
            {en ? "Research details" : "Araştırma ayrıntıları"}
            <span aria-hidden="true"> →</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
