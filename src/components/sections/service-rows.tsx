import Link from "next/link";
import type { CSSProperties } from "react";
import GiantTitle from "@/components/giant-title";
import type { Locale } from "@/lib/content";
import { getServices } from "@/lib/home-content";
import DirectionalRows from "./directional-rows";
import styles from "./monitor.module.css";

/**
 * "What I do": capabilities, each linked to the work that proves it. Rendered
 * once, either on the portrait monitor or, without the desk, in the page.
 */
export default function ServiceRows({ locale }: { locale: Locale }) {
  const en = locale === "en";
  return (
    <div className={styles.block} data-story-section="services">
      <GiantTitle
        id="services-title"
        text={en ? "What I do" : "Ne yapıyorum"}
        locale={locale}
        fill={86}
        className={styles.title}
      />
      <DirectionalRows className={styles.list}>
        {getServices(locale).map((service, index) => {
          const words = service.description.split(" ");
          return (
            <li
              key={service.id}
              className={styles.row}
              data-row
              data-reveal-row
              data-linked
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
              <span className={styles.proof} id={`service-proof-${service.id}`}>
                {service.proofLabel} <span aria-hidden="true">→</span>
              </span>
            </li>
          );
        })}
      </DirectionalRows>
    </div>
  );
}
