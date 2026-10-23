import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, sharedFacts } from "@/lib/content";
import { cvLink, pageMetadata } from "@/lib/site";
import { aboutStructuredData } from "@/lib/structured-data";
import { getAbout } from "@/lib/home-content";
import { getAboutPage } from "@/lib/about-page";
import JsonLd from "@/components/json-ld";
import GiantTitle from "@/components/giant-title";
import styles from "./about.module.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const { identity } = getAboutPage(locale);
  return pageMetadata(
    locale,
    "/about",
    locale === "en"
      ? `About ${identity.name}, AI engineer`
      : `${identity.name} hakkında: yapay zekâ mühendisi`,
    identity.lead,
  );
}

/** My profile page: who I am, what I build, the facts and how to reach me. */
export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const en = locale === "en";
  const { identity, facts, timeline, cases } = getAboutPage(locale);
  // The home About's first paragraph is the bio; the lead replaces it here.
  const more = getAbout(locale).paragraphs.slice(1);
  const cv = cvLink(locale, sharedFacts.email);
  return (
    <main id="main" tabIndex={-1} className={styles.page}>
      <JsonLd data={aboutStructuredData(locale)} />
      <header className={styles.hero}>
        <p className={styles.kicker}>{en ? "About" : "Hakkımda"}</p>
        <GiantTitle as="h1" text={identity.name} locale={locale} fill={94} />
        <p className={styles.role}>{identity.headline}</p>
        <p className={styles.lede}>{identity.lead}</p>
      </header>

      <section className={styles.section} aria-labelledby="who-title">
        <h2 id="who-title">{en ? "Who I am" : "Kimim"}</h2>
        <div className={styles.prose}>
          <p>{identity.expertise}</p>
          {more.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="facts-title">
        <h2 id="facts-title">{en ? "Facts" : "Bilgiler"}</h2>
        <dl className={styles.facts}>
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>
                {fact.href ? (
                  <Link href={fact.href}>{fact.value}</Link>
                ) : (
                  fact.value
                )}
                {fact.detail ? <span>{fact.detail}</span> : null}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={styles.section} aria-labelledby="build-title">
        <h2 id="build-title">{en ? "What I build" : "Ne geliştiriyorum"}</h2>
        <ul className={styles.cases}>
          {cases.map((item) => (
            <li key={item.href}>
              <Link href={item.href}>{item.title}</Link>
              <p>{item.summary}</p>
            </li>
          ))}
        </ul>
        <p className={styles.more}>
          <Link className={styles.link} href={`/${locale}/projects`}>
            {en ? "All projects" : "Bütün projeler"}
            <span aria-hidden="true"> →</span>
          </Link>
          <Link className={styles.link} href={`/${locale}/research`}>
            {en ? "Research" : "Araştırma"}
            <span aria-hidden="true"> →</span>
          </Link>
        </p>
      </section>

      <section className={styles.section} aria-labelledby="timeline-title">
        <h2 id="timeline-title">{en ? "Timeline" : "Zaman çizelgesi"}</h2>
        <ol className={styles.timeline}>
          {timeline.map((entry) => (
            <li key={`${entry.start}-${entry.title}-${entry.place}`}>
              <time dateTime={entry.start}>{entry.period}</time>
              <p>
                <strong>{entry.title}</strong>
                <span>{entry.place}</span>
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.section} aria-labelledby="reach-title">
        <h2 id="reach-title">
          {en ? "How to reach me" : "Bana nasıl ulaşılır"}
        </h2>
        <p className={styles.prose}>{identity.invitation}</p>
        <p className={styles.more}>
          <a className={styles.link} href={`mailto:${sharedFacts.email}`}>
            {sharedFacts.email}
          </a>
          <a className={styles.link} href={cv.href}>
            {cv.label}
          </a>
        </p>
      </section>
    </main>
  );
}
