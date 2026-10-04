import GiantTitle from "@/components/giant-title";
import { sharedFacts, type Locale } from "@/lib/content";
import { cvLink } from "@/lib/site";
import CopyEmail from "./copy-email";
import styles from "./contact.module.css";

export default function ContactSection({ locale }: { locale: Locale }) {
  const en = locale === "en";
  const cv = cvLink(locale, sharedFacts.email);
  return (
    <section
      className={`${styles.section} bleed`}
      aria-labelledby="contact-title"
    >
      <div className={styles.inner}>
        <p className={styles.lead}>
          {en
            ? "Good work starts with a conversation."
            : "İyi işler bir sohbetle başlar."}
        </p>
        <GiantTitle
          id="contact-title"
          text={en ? "Let’s talk" : "Tanışalım"}
          locale={locale}
          fill={88}
        />
        <div className={styles.mailRow}>
          <a className={styles.mail} href={`mailto:${sharedFacts.email}`}>
            {sharedFacts.email}
          </a>
          <CopyEmail
            email={sharedFacts.email}
            locale={locale}
            className={styles.copy}
          />
        </div>
        <ul className={styles.links}>
          <li>
            <a href={cv.href}>{cv.label}</a>
          </li>
          <li>
            <a href={sharedFacts.github}>GitHub</a>
          </li>
          <li>
            <a href={sharedFacts.linkedin}>LinkedIn</a>
          </li>
        </ul>
      </div>
    </section>
  );
}
