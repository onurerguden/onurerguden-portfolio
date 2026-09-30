import Link from "next/link";
import type { ReactNode } from "react";
import GiantTitle from "@/components/giant-title";
import type { Locale } from "@/lib/content";
import { getAbout } from "@/lib/home-content";
import styles from "./about.module.css";

/** Navy "About me" band; the floating 3D objects mount into `stage`. */
export default function AboutSection({
  locale,
  stage,
}: {
  locale: Locale;
  stage?: ReactNode;
}) {
  const en = locale === "en";
  const about = getAbout(locale);
  return (
    <section
      id="about"
      className={`${styles.section} bleed`}
      aria-labelledby="about-title"
    >
      <div className={styles.decor} aria-hidden="true">
        <span className={styles.ball} />
        <span className={styles.tennis} />
        <span className={styles.chip} />
      </div>
      {stage}
      <div className={styles.inner} data-about-copy>
        <GiantTitle
          id="about-title"
          text={en ? "About me" : "Hakkımda"}
          locale={locale}
          fill={84}
          className={styles.title}
        />
        <div className={styles.copy}>
          {about.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div className={styles.actions}>
          <a className={styles.cta} href="#contact">
            {en ? "Contact me" : "Bana ulaş"}
            <span aria-hidden="true">→</span>
          </a>
          <Link className={styles.secondary} href={`/${locale}/research`}>
            {en ? "My research" : "Araştırmalarım"}
          </Link>
        </div>
      </div>
    </section>
  );
}
