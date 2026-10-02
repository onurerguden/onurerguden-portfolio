import GiantTitle from "@/components/giant-title";
import MotionToggle from "@/components/motion-toggle";
import { sharedFacts, type Locale } from "@/lib/content";
import { cvLink } from "@/lib/site";
import { getAbout, readTechStack } from "@/lib/home-content";
import AboutStage from "./about-stage";
import EducationFacts from "./education-facts";
import styles from "./about.module.css";

/** Navy "About me" band with floating procedural objects around the copy. */
export default function AboutSection({ locale }: { locale: Locale }) {
  const en = locale === "en";
  const about = getAbout(locale);
  const cv = cvLink(locale, sharedFacts.email);
  const logos = readTechStack().items.flatMap((item) =>
    item.aboutLogo && "simpleIcons" in item.icon ? [item.icon.simpleIcons] : [],
  );
  return (
    <section
      id="about"
      className={`${styles.section} bleed`}
      aria-labelledby="about-title"
      tabIndex={-1}
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
        <EducationFacts locale={locale} />
        <div className={styles.actions}>
          <a className={styles.cta} href="#contact">
            {en ? "Contact me" : "Bana ulaş"}
            <span aria-hidden="true">→</span>
          </a>
          <a className={styles.outline} href={cv.href}>
            {cv.label}
          </a>
          <a className={styles.secondary} href="#research">
            {en ? "My research" : "Araştırmalarım"}
          </a>
        </div>
        <MotionToggle locale={locale} className={styles.pause} />
      </div>
    </section>
  );
}
