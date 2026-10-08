import Link from "next/link";
import GiantTitle from "@/components/giant-title";
import styles from "./not-found.module.css";

/** Shared by both languages: it can be reached from any path. */
export default function NotFoundContent() {
  return (
    <main id="main" className={styles.page}>
      <GiantTitle
        as="h1"
        text="404"
        locale="en"
        fill={46}
        max={320}
        className={styles.title}
      />
      <div className={styles.copy}>
        <p>This page isn’t here.</p>
        <p lang="tr">Bu sayfa burada değil.</p>
      </div>
      <ul className={styles.links}>
        <li>
          <Link href="/en" hrefLang="en">
            English homepage <span aria-hidden="true">→</span>
          </Link>
        </li>
        <li>
          <Link href="/tr" hrefLang="tr" lang="tr">
            Türkçe ana sayfa <span aria-hidden="true">→</span>
          </Link>
        </li>
      </ul>
    </main>
  );
}
