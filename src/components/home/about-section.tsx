import Link from "next/link";
import GiantTitle from "@/components/giant-title";
import MotionToggle from "@/components/motion-toggle";
import type { Locale } from "@/lib/content";
import { getAbout, readTechStack } from "@/lib/home-content";
import AboutStage from "./about-stage";
import styles from "./about.module.css";

/** Navy "About me" band with floating procedural objects around the copy. */
export default function AboutSection({ locale }: { locale: Locale }) {
  const en = locale === "en";
  const about = getAbout(locale);
  const logos = readTechStack().items.flatMap((item) =>
    item.aboutLogo && "simpleIcons" in item.icon ? [item.icon.simpleIcons] : [],
  );
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
      <AboutStage logos={logos} />
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
        <MotionToggle locale={locale} className={styles.pause} />
      </div>
    </section>
  );
}
