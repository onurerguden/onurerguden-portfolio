import Link from "next/link";
import type { CSSProperties } from "react";
import GiantTitle from "@/components/giant-title";
import type { Locale } from "@/lib/content";
import { getServices } from "@/lib/home-content";
import styles from "./services.module.css";

/** "What I do": capabilities, each linked to the work that proves it. */
export default function ServicesSection({ locale }: { locale: Locale }) {
  const en = locale === "en";
  const services = getServices(locale);
  return (
    <section
      id="services"
      className={`${styles.section} bleed`}
      aria-labelledby="services-title"
    >
      <div className={styles.inner}>
        <GiantTitle
          id="services-title"
          text={en ? "What I do" : "Ne yapıyorum"}
          locale={locale}
          className={styles.title}
        />
        <ol className={styles.list}>
          {services.map((service, index) => {
            const words = service.description.split(" ");
            return (
              <li
                key={service.id}
                className={styles.row}
                style={{ "--words": words.length } as CSSProperties}
              >
                <span className={styles.number} aria-hidden="true">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </span>
                <div className={styles.copy}>
                  <h3>
                    <Link
                      className={styles.link}
                      href={service.href}
                      aria-describedby={`service-proof-${service.id}`}
                    >
                      {service.title}
                    </Link>
                  </h3>
                  <p className={styles.description}>
                    {words.map((word, i) => (
                      <span
                        key={i}
                        className={styles.word}
                        style={{ "--i": i } as CSSProperties}
                      >
                        {word}{" "}
                      </span>
                    ))}
                  </p>
                  <ul
                    className={styles.tech}
                    aria-label={en ? "Tools" : "Araçlar"}
                  >
                    {service.tech.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                </div>
                <span
                  className={styles.proof}
                  id={`service-proof-${service.id}`}
                >
                  {service.proofLabel} <span aria-hidden="true">→</span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
