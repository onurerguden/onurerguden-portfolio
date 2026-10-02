import Link from "next/link";
import { sharedFacts } from "@/lib/content";
import { siteRepository } from "@/lib/site";
import styles from "./site-footer.module.css";

export default function SiteFooter({ locale }: { locale: "en" | "tr" }) {
  const en = locale === "en";
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <Link className={styles.name} href={`/${locale}`}>
          Onur Ergüden
        </Link>
        <p className={styles.colophon}>
          {en
            ? "Built with Next.js, React Three Fiber and Blender. "
            : "Next.js, React Three Fiber ve Blender ile geliştirildi. "}
          <a href={siteRepository}>
            {en ? "Source code" : "Kaynak kod"}
            <span aria-hidden="true">&nbsp;↗</span>
          </a>
        </p>
        <ul className={styles.links}>
          <li>
            <a href={sharedFacts.github}>GitHub</a>
          </li>
          <li>
            <a href={sharedFacts.linkedin}>LinkedIn</a>
          </li>
          <li>
            <a href={`mailto:${sharedFacts.email}`}>
              {en ? "Email" : "E-posta"}
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
