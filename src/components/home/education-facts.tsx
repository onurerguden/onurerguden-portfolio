import { sharedFacts, type Locale } from "@/lib/content";
import styles from "./about.module.css";

const monthYear = (value: string, locale: Locale) =>
  new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}-01T00:00:00Z`));

/** Degree, academy and publication: the facts a committee looks for first. */
export default function EducationFacts({
  locale,
  publicationHref = "#research",
}: {
  locale: Locale;
  /** Where the paper is on this page. */
  publicationHref?: string;
}) {
  const en = locale === "en";
  const { education, academy, publication } = sharedFacts;
  return (
    <dl className={styles.facts}>
      <div>
        <dt>{en ? "Degree" : "Lisans"}</dt>
        <dd>
          {en ? education.degree : "Yazılım Mühendisliği"}
          <span>
            {en ? education.university : "İzmir Ekonomi Üniversitesi"} ·{" "}
            {monthYear(education.graduation, locale)} · GPA {education.gpa}
          </span>
        </dd>
      </div>
      <div>
        <dt>{en ? "Academy" : "Akademi"}</dt>
        <dd>
          {academy.name}
          <span>
            {academy.track} · {academy.year}
          </span>
        </dd>
      </div>
      <div>
        <dt>{en ? "Publication" : "Yayın"}</dt>
        <dd>
          <a href={publicationHref}>IJEA</a>
          <span>{publication.statusLabel[locale]}</span>
        </dd>
      </div>
    </dl>
  );
}
