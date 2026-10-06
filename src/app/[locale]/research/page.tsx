import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, sharedFacts } from "@/lib/content";
import { pageMetadata } from "@/lib/site";
import { researchStructuredData } from "@/lib/structured-data";
import JsonLd from "@/components/json-ld";
import GiantTitle from "@/components/giant-title";
import EducationFacts from "@/components/home/education-facts";
import styles from "./research.module.css";
import { getResearch } from "@/lib/research";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return pageMetadata(
    locale,
    "/research",
    locale === "en" ? "Research" : "Araştırma",
    locale === "en"
      ? "Research by Onur Ergüden: a two-layered AI system for drinking-water safety, accepted by the International Journal of Engineering Approaches."
      : "Onur Ergüden’in araştırması: içme suyu güvenliği için iki katmanlı bir AI sistemi, International Journal of Engineering Approaches’ta yayına kabul edildi.",
  );
}
export default async function ResearchPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const en = locale === "en";
  const publication = sharedFacts.publication;
  const research = getResearch(locale);
  return (
    <main id="main" tabIndex={-1} className={styles.page}>
      <JsonLd data={researchStructuredData(locale)} />
      <header className={styles.hero}>
        <p className={styles.kicker}>
          {en ? "Research & academic work" : "Araştırma ve akademik çalışmalar"}
        </p>
        <GiantTitle
          as="h1"
          text={en ? "Research" : "Araştırma"}
          locale={locale}
          fill={94}
        />
        <p className={styles.lede}>{research.approach}</p>
      </header>
      <section className={styles.paper} aria-labelledby="publication-title">
        <p className={styles.status}>{publication.statusLabel[locale]}</p>
        <h2 id="publication-title">{publication.title}</h2>
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
        <Link className={styles.link} href={`/${locale}/projects/water-safety`}>
          {en ? "Read the research project" : "Araştırma projesini oku"}
          <span aria-hidden="true"> →</span>
        </Link>
      </section>
      <section
        className={`${styles.paper} ${styles.study}`}
        aria-labelledby="study-title"
      >
        <p className={`${styles.status} ${styles.quietStatus}`}>
          {research.study.status}
        </p>
        <h2 id="study-title">{research.study.title}</h2>
        <p className={styles.journal}>{research.study.team}</p>
        <p className={styles.summary}>{research.study.data}</p>
        <p className={styles.summary}>{research.study.method}</p>
        <p className={styles.studyLinks}>
          <Link
            className={styles.link}
            href={`/${locale}/projects#urban-mobility`}
          >
            {en ? "See it in the archive" : "Arşivde gör"}
            <span aria-hidden="true"> →</span>
          </Link>
          <a className={styles.link} href={research.study.repoUrl}>
            {en ? "Source on GitHub" : "GitHub’da kaynak kod"}
            <span aria-hidden="true"> ↗</span>
          </a>
        </p>
      </section>
      <section className={styles.questions} aria-labelledby="questions-title">
        <h2 id="questions-title">
          {en ? "Questions I’m exploring" : "Üzerinde düşündüğüm sorular"}
        </h2>
        <ol>
          {research.questions.map((question, i) => (
            <li key={question}>
              <span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              {question}
            </li>
          ))}
        </ol>
      </section>
      <section className={styles.foundation} aria-labelledby="foundation-title">
        <h2 id="foundation-title">
          {en ? "Academic foundation" : "Akademik temel"}
        </h2>
        <EducationFacts locale={locale} publicationHref="#publication-title" />
        <p>
          {en
            ? "Academic interests: AI, machine learning, data science and software architecture."
            : "Akademik ilgi alanları: AI, makine öğrenmesi, veri bilimi ve yazılım mimarisi."}
        </p>
      </section>
    </main>
  );
}
